// ─── Agent OS — Task Decomposition Engine ────────────────────
// Decomposes plans into Epic → Task → Subtask structures in the DB.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { agentAssignmentEngine } from './AgentAssignmentEngine';
import { approvalEngine } from './ApprovalEngine';
import type {
  OrchestratorPlan,
  PlanEpic,
  PlanTask,
  CreatedTaskInfo,
  CreatedApprovalInfo,
  CreatedEventInfo,
} from './types';
import type { RiskLevel } from '../types/domain';

class TaskDecompositionEngine {
  private static instance: TaskDecompositionEngine | null = null;

  private constructor() {}

  static getInstance(): TaskDecompositionEngine {
    if (!TaskDecompositionEngine.instance) {
      TaskDecompositionEngine.instance = new TaskDecompositionEngine();
    }
    return TaskDecompositionEngine.instance;
  }

  /**
   * Decompose a plan into Epics, Tasks, and Subtasks in the database
   */
  async decompose(
    plan: OrchestratorPlan,
    workspaceId: string,
    projectId?: string
  ): Promise<{
    createdTasks: CreatedTaskInfo[];
    approvals: CreatedApprovalInfo[];
    events: CreatedEventInfo[];
    createdProjectId?: string;
  }> {
    const createdTasks: CreatedTaskInfo[] = [];
    const approvals: CreatedApprovalInfo[] = [];
    const events: CreatedEventInfo[] = [];

    // 1. Ensure we have a project
    let currentProjectId = projectId;
    if (!currentProjectId) {
      const project = await db.project.create({
        data: {
          workspaceId,
          name: plan.goal.slice(0, 100),
          description: plan.goal,
          sourceType: 'local',
          status: 'active',
        },
      });
      currentProjectId = project.id;

      await eventBus.emit(EventTypes.PROJECT_CREATED, {
        projectId: project.id,
        workspaceId,
        name: project.name,
        timestamp: Date.now(),
        source: 'task-decomposition',
      });
      events.push({ eventType: 'project.created', entityId: project.id, timestamp: Date.now() });
    }

    // 2. Create epics and their tasks
    for (const planEpic of plan.epics) {
      const epic = await this.createEpic(planEpic, currentProjectId, workspaceId);
      events.push({ eventType: 'epic.created', entityId: epic.id, timestamp: Date.now() });

      // 3. Create tasks under the epic
      for (const planTask of planEpic.tasks) {
        const taskResult = await this.createTask(
          planTask,
          epic.id,
          workspaceId
        );
        createdTasks.push(taskResult.task);
        events.push(...taskResult.events);

        // Check if approval is needed
        if (planTask.requiresApproval) {
          const agentId = taskResult.task.assignedAgentId ?? '';
          if (agentId) {
            const approval = await approvalEngine.createApprovalRequest({
              taskId: taskResult.task.id,
              agentId,
              actionType: 'execute',
              summary: `Approval required for: ${planTask.title}`,
              risk: planTask.riskLevel,
              payload: { planTask },
              workspaceId,
            });
            approvals.push(approval);
            events.push({
              eventType: 'approval.requested',
              entityId: approval.id,
              timestamp: Date.now(),
            });
          }
        }

        // 4. Create subtasks
        if (planTask.subtasks && planTask.subtasks.length > 0) {
          for (const planSubtask of planTask.subtasks) {
            const subtaskResult = await this.createSubtask(
              planSubtask,
              taskResult.task.id,
              epic.id,
              workspaceId
            );
            createdTasks.push(subtaskResult.task);
            events.push(...subtaskResult.events);
          }
        }
      }
    }

    return {
      createdTasks,
      approvals,
      events,
      createdProjectId: projectId ? undefined : currentProjectId,
    };
  }

  /**
   * Create a single epic in the database
   */
  private async createEpic(planEpic: PlanEpic, projectId: string, workspaceId?: string) {
    const epic = await db.epic.create({
      data: {
        projectId,
        title: planEpic.title,
        description: planEpic.description ?? null,
        status: 'planned',
        priority: planEpic.priority,
      },
    });

    await eventBus.emit(EventTypes.EPIC_CREATED, {
      workspaceId: workspaceId ?? null,
      epicId: epic.id,
      projectId,
      title: epic.title,
      timestamp: Date.now(),
      source: 'task-decomposition',
    });

    return epic;
  }

  /**
   * Create a single task in the database
   */
  private async createTask(
    planTask: PlanTask,
    epicId: string,
    workspaceId: string
  ): Promise<{ task: CreatedTaskInfo; events: CreatedEventInfo[] }> {
    const events: CreatedEventInfo[] = [];

    // Find best agent assignment
    let assignedAgentId: string | undefined;
    let assignedAgentName: string | undefined;

    if (planTask.assignedAgentRole) {
      const assignment = await agentAssignmentEngine.findAssignment(
        planTask.title,
        planTask.description ?? '',
        workspaceId
      );
      assignedAgentId = assignment.agentId;
      assignedAgentName = assignment.agentName;
    }

    const task = await db.task.create({
      data: {
        epicId,
        title: planTask.title,
        description: planTask.description ?? null,
        status: 'backlog',
        priority: planTask.priority,
        assignedAgentId: assignedAgentId ?? null,
        riskLevel: planTask.riskLevel,
        requiresApproval: planTask.requiresApproval,
      },
    });

    await eventBus.emit(EventTypes.TASK_CREATED, {
      workspaceId,
      taskId: task.id,
      epicId,
      title: task.title,
      timestamp: Date.now(),
      source: 'task-decomposition',
    });
    events.push({ eventType: 'task.created', entityId: task.id, timestamp: Date.now() });

    // Emit task.assigned if agent was found
    if (assignedAgentId && assignedAgentName) {
      await eventBus.emit(EventTypes.TASK_ASSIGNED, {
        workspaceId,
        taskId: task.id,
        agentId: assignedAgentId,
        agentName: assignedAgentName,
        timestamp: Date.now(),
        source: 'task-decomposition',
      });
      events.push({ eventType: 'task.assigned', entityId: task.id, timestamp: Date.now() });
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        assignedAgentId: assignedAgentId,
        assignedAgentName,
        epicId,
      },
      events,
    };
  }

  /**
   * Create a subtask under a parent task
   */
  private async createSubtask(
    planSubtask: { title: string; description: string; assignedAgentRole?: string },
    parentTaskId: string,
    epicId: string,
    workspaceId: string
  ): Promise<{ task: CreatedTaskInfo; events: CreatedEventInfo[] }> {
    const events: CreatedEventInfo[] = [];

    let assignedAgentId: string | undefined;
    let assignedAgentName: string | undefined;

    if (planSubtask.assignedAgentRole) {
      const assignment = await agentAssignmentEngine.findAssignment(
        planSubtask.title,
        planSubtask.description ?? '',
        workspaceId
      );
      assignedAgentId = assignment.agentId;
      assignedAgentName = assignment.agentName;
    }

    const task = await db.task.create({
      data: {
        epicId,
        parentTaskId,
        title: planSubtask.title,
        description: planSubtask.description ?? null,
        status: 'backlog',
        priority: 'medium',
        assignedAgentId: assignedAgentId ?? null,
        riskLevel: 'low',
        requiresApproval: false,
      },
    });

    await eventBus.emit(EventTypes.TASK_CREATED, {
      workspaceId,
      taskId: task.id,
      epicId,
      title: task.title,
      timestamp: Date.now(),
      source: 'task-decomposition',
    });
    events.push({ eventType: 'task.created', entityId: task.id, timestamp: Date.now() });

    if (assignedAgentId && assignedAgentName) {
      await eventBus.emit(EventTypes.TASK_ASSIGNED, {
        workspaceId,
        taskId: task.id,
        agentId: assignedAgentId,
        agentName: assignedAgentName,
        timestamp: Date.now(),
        source: 'task-decomposition',
      });
      events.push({ eventType: 'task.assigned', entityId: task.id, timestamp: Date.now() });
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        assignedAgentId,
        assignedAgentName,
        epicId,
        parentTaskId,
      },
      events,
    };
  }

  /**
   * Create a single task directly (for small tasks, no plan needed)
   */
  async createSingleTask(params: {
    title: string;
    description?: string;
    epicId?: string;
    projectId?: string;
    workspaceId: string;
    priority?: string;
    riskLevel?: RiskLevel;
    requiresApproval?: boolean;
  }): Promise<{
    task: CreatedTaskInfo;
    approvals: CreatedApprovalInfo[];
    events: CreatedEventInfo[];
  }> {
    const events: CreatedEventInfo[] = [];
    const approvals: CreatedApprovalInfo[] = [];

    // Find best agent
    const assignment = await agentAssignmentEngine.findAssignment(
      params.title,
      params.description ?? '',
      params.workspaceId
    );

    let epicId = params.epicId;

    // Create an epic if we don't have one
    if (!epicId && params.projectId) {
      const epic = await db.epic.create({
        data: {
          projectId: params.projectId,
          title: `Tasks for: ${params.title.slice(0, 60)}`,
          status: 'planned',
          priority: 'medium',
        },
      });
      epicId = epic.id;

      await eventBus.emit(EventTypes.EPIC_CREATED, {
        workspaceId: params.workspaceId ?? null,
        epicId: epic.id,
        projectId: params.projectId,
        title: epic.title,
        timestamp: Date.now(),
        source: 'task-decomposition',
      });
      events.push({ eventType: 'epic.created', entityId: epic.id, timestamp: Date.now() });
    }

    if (!epicId) {
      throw new Error('Cannot create task without an epic — provide epicId or projectId');
    }

    const task = await db.task.create({
      data: {
        epicId,
        title: params.title,
        description: params.description ?? null,
        status: 'backlog',
        priority: (params.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
        assignedAgentId: assignment.agentId ?? null,
        riskLevel: (params.riskLevel ?? 'low') as RiskLevel,
        requiresApproval: params.requiresApproval ?? false,
      },
    });

    await eventBus.emit(EventTypes.TASK_CREATED, {
      workspaceId: params.workspaceId,
      taskId: task.id,
      epicId,
      title: task.title,
      timestamp: Date.now(),
      source: 'task-decomposition',
    });
    events.push({ eventType: 'task.created', entityId: task.id, timestamp: Date.now() });

    if (assignment.agentId && assignment.agentName) {
      await eventBus.emit(EventTypes.TASK_ASSIGNED, {
        workspaceId: params.workspaceId,
        taskId: task.id,
        agentId: assignment.agentId,
        agentName: assignment.agentName,
        timestamp: Date.now(),
        source: 'task-decomposition',
      });
      events.push({ eventType: 'task.assigned', entityId: task.id, timestamp: Date.now() });
    }

    // Create approval if needed
    if (params.requiresApproval && assignment.agentId) {
      const approval = await approvalEngine.createApprovalRequest({
        taskId: task.id,
        agentId: assignment.agentId,
        actionType: 'execute',
        summary: `Approval required for: ${params.title}`,
        risk: params.riskLevel ?? 'medium',
        workspaceId: params.workspaceId,
      });
      approvals.push(approval);
      events.push({ eventType: 'approval.requested', entityId: approval.id, timestamp: Date.now() });
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        assignedAgentId: assignment.agentId,
        assignedAgentName: assignment.agentName,
        epicId,
      },
      approvals,
      events,
    };
  }
}

export const taskDecompositionEngine = TaskDecompositionEngine.getInstance();
