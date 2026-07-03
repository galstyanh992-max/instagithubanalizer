// ─── Agent OS — Orchestrator Engine ──────────────────────────
// Main orchestrator service — accepts user messages and coordinates
// planning, decomposition, agent assignment, and approvals.

import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { planningEngine } from './PlanningEngine';
import { taskDecompositionEngine } from './TaskDecompositionEngine';
import { approvalEngine } from './ApprovalEngine';
import { costEstimationEngine } from './CostEstimationEngine';
import type {
  OrchestratorInput,
  OrchestratorResponse,
  OrchestratorPlan,
  ApprovePlanInput,
  CreatedTaskInfo,
  CreatedApprovalInfo,
  CreatedEventInfo,
  TaskSize,
} from './types';
import type { RiskLevel } from '../types/domain';
import { generateCorrelationId } from '../utils/correlation';
import { loggers } from '@/lib/logger';

class OrchestratorEngine {
  private static instance: OrchestratorEngine | null = null;

  private constructor() {}

  static getInstance(): OrchestratorEngine {
    if (!OrchestratorEngine.instance) {
      OrchestratorEngine.instance = new OrchestratorEngine();
    }
    return OrchestratorEngine.instance;
  }

  /**
   * Process a user message through the orchestrator pipeline
   */
  async processMessage(input: OrchestratorInput): Promise<OrchestratorResponse> {
    const { workspaceId, projectId, message, mode = 'balanced' } = input;

    // Generate correlationId for this orchestrator run — propagated through all events
    const correlationId = input.correlationId ?? generateCorrelationId();

    // 1. Emit message received event
    await eventBus.emit(EventTypes.ORCHESTRATOR_MESSAGE_RECEIVED, {
      workspaceId,
      message,
      mode,
      correlationId,
      timestamp: Date.now(),
      source: 'orchestrator-engine',
    });

    try {
      // 2. Validate input
      if (!message.trim()) {
        return {
          type: 'clarification_needed',
          summary: 'Message is empty. Please describe what you want to accomplish.',
        };
      }

      // 3. Check for clarification needs
      const clarification = this.checkClarificationNeeded(message);
      if (clarification) {
        return clarification;
      }

      // 4. Classify the task
      const classification = planningEngine.classifyTask(message);

      // 5. Check for high-risk content
      const approvalAssessment = approvalEngine.assess(message, '');

      // 6. Based on mode and classification, decide the path
      if (mode === 'manual') {
        // In manual mode, always create a plan first
        return await this.handlePlanRequired(workspaceId, projectId, message, classification.size, correlationId);
      }

      if (mode === 'autonomous') {
        // In autonomous mode, small/medium tasks are created immediately
        if (classification.size === 'small' || classification.size === 'medium') {
          return await this.handleTaskStarted(
            workspaceId, projectId, message, classification.size, approvalAssessment.riskLevel, correlationId
          );
        }
        // Large/epic tasks still get a plan
        return await this.handlePlanRequired(workspaceId, projectId, message, classification.size, correlationId);
      }

      // Balanced mode (default)
      if (classification.size === 'small' && !approvalAssessment.requiresApproval) {
        return await this.handleTaskStarted(
          workspaceId, projectId, message, classification.size, approvalAssessment.riskLevel, correlationId
        );
      }

      // Medium+ tasks or tasks requiring approval → plan first
      return await this.handlePlanRequired(workspaceId, projectId, message, classification.size, correlationId);
    } catch (error) {
      loggers.orchestrator.error({ err: error }, '[OrchestratorEngine] Error processing message:');
      return {
        type: 'error',
        summary: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create a plan without creating tasks (preview)
   */
  async createPlan(
    workspaceId: string,
    message: string,
    _projectId?: string,
    correlationId?: string
  ): Promise<OrchestratorPlan> {
    const plan = await planningEngine.createPlan(message, workspaceId);

    // Emit plan created event
    const totalTasks = plan.epics.reduce(
      (sum, epic) => sum + epic.tasks.length,
      0
    );

    await eventBus.emit(EventTypes.ORCHESTRATOR_PLAN_CREATED, {
      workspaceId,
      planGoal: plan.goal,
      taskSize: plan.taskSize,
      epicCount: plan.epics.length,
      taskCount: totalTasks,
      estimatedCostLevel: plan.estimatedCost.level,
      correlationId,
      timestamp: Date.now(),
      source: 'orchestrator-engine',
    });

    // Emit cost estimated event
    await eventBus.emit(EventTypes.ORCHESTRATOR_COST_ESTIMATED, {
      workspaceId,
      costLevel: plan.estimatedCost.level,
      estimatedTokens: plan.estimatedCost.estimatedTokens,
      estimatedUsd: plan.estimatedCost.estimatedUsd,
      correlationId,
      timestamp: Date.now(),
      source: 'orchestrator-engine',
    });

    return plan;
  }

  /**
   * Approve a plan and create Epic/Task/Subtask in the database
   *
   * FIX C5: Previous code called decompose() twice when projectId was not
   * provided — once to create the project, then again at the fallthrough.
   * Now decompose() is called exactly once with the correct projectId.
   */
  async approvePlan(input: ApprovePlanInput): Promise<OrchestratorResponse> {
    const { workspaceId, projectId, plan, createProject } = input;

    try {
      // Determine the project to decompose into
      let effectiveProjectId = projectId;

      if (!effectiveProjectId) {
        // No project provided — decompose() will create one automatically
        // when projectId is undefined. Call decompose exactly ONCE.
        effectiveProjectId = undefined;
      }

      // Single decompose call — creates project if needed, then epics/tasks
      const result = await taskDecompositionEngine.decompose(
        plan, workspaceId, effectiveProjectId
      );

      // Emit plan approved event
      await eventBus.emit(EventTypes.ORCHESTRATOR_PLAN_APPROVED, {
        workspaceId,
        planGoal: plan.goal,
        createdEpicCount: plan.epics.length,
        createdTaskCount: result.createdTasks.length,
        createdApprovalCount: result.approvals.length,
        timestamp: Date.now(),
        source: 'orchestrator-engine',
      });

      return {
        type: 'plan_required',
        summary: `Plan approved and decomposed: ${plan.epics.length} epics, ${result.createdTasks.length} tasks created`,
        plan,
        createdTasks: result.createdTasks,
        approvals: result.approvals.length > 0 ? result.approvals : undefined,
        estimatedCost: plan.estimatedCost,
        events: result.events,
      };
    } catch (error) {
      loggers.orchestrator.error({ err: error }, '[OrchestratorEngine] Error approving plan:');
      return {
        type: 'error',
        summary: `Failed to approve plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ─── Private Helpers ────────────────────────────────────────

  /**
   * Handle "plan required" path — create and return a plan
   */
  private async handlePlanRequired(
    workspaceId: string,
    projectId: string | undefined,
    message: string,
    taskSize: TaskSize,
    correlationId?: string
  ): Promise<OrchestratorResponse> {
    const plan = await this.createPlan(workspaceId, message, projectId, correlationId);

    return {
      type: 'plan_required',
      summary: `Task classified as "${taskSize}". A plan has been created with ${plan.epics.length} epic(s) and ${plan.epics.reduce((s, e) => s + e.tasks.length, 0)} task(s). Review and approve to proceed.`,
      plan,
      estimatedCost: plan.estimatedCost,
    };
  }

  /**
   * Handle "task started" path — create task directly
   */
  private async handleTaskStarted(
    workspaceId: string,
    projectId: string | undefined,
    message: string,
    taskSize: TaskSize,
    riskLevel: RiskLevel,
    correlationId?: string
  ): Promise<OrchestratorResponse> {
    const costEstimate = costEstimationEngine.estimate(taskSize, message);
    const approvalAssessment = approvalEngine.assess(message, '');

    // For small tasks without project, we need a project
    // Use the first available project in the workspace or create one
    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      // Try to find existing project
      const { db } = await import('../db');
      const existingProject = await db.project.findFirst({
        where: { workspaceId, status: 'active' },
      });

      if (existingProject) {
        effectiveProjectId = existingProject.id;
      } else {
        // Create a default project
        const { db: dbClient } = await import('../db');
        const project = await dbClient.project.create({
          data: {
            workspaceId,
            name: `Quick Tasks — ${new Date().toLocaleDateString()}`,
            description: 'Auto-created project for quick tasks',
            sourceType: 'local',
            status: 'active',
          },
        });
        effectiveProjectId = project.id;

        await eventBus.emit(EventTypes.PROJECT_CREATED, {
          projectId: project.id,
          workspaceId,
          name: project.name,
          timestamp: Date.now(),
          source: 'orchestrator-engine',
        });
      }
    }

    // Create the task
    const result = await taskDecompositionEngine.createSingleTask({
      title: message.slice(0, 100),
      description: message,
      projectId: effectiveProjectId,
      workspaceId,
      priority: taskSize === 'small' ? 'low' : 'medium',
      riskLevel,
      requiresApproval: approvalAssessment.requiresApproval,
    });

    // Emit cost estimated event
    await eventBus.emit(EventTypes.ORCHESTRATOR_COST_ESTIMATED, {
      workspaceId,
      costLevel: costEstimate.level,
      estimatedTokens: costEstimate.estimatedTokens,
      estimatedUsd: costEstimate.estimatedUsd,
      correlationId,
      timestamp: Date.now(),
      source: 'orchestrator-engine',
    });

    return {
      type: 'task_started',
      summary: `Task created and assigned: "${message.slice(0, 80)}"${result.task.assignedAgentName ? ` → ${result.task.assignedAgentName}` : ''}`,
      correlationId,
      createdTasks: [result.task],
      approvals: result.approvals.length > 0 ? result.approvals : undefined,
      estimatedCost: costEstimate,
      events: result.events,
    };
  }

  /**
   * Check if the message is too vague and needs clarification
   */
  private checkClarificationNeeded(message: string): OrchestratorResponse | null {
    const trimmed = message.trim().toLowerCase();

    // Too short / vague
    if (trimmed.length < 5) {
      return {
        type: 'clarification_needed',
        summary: 'Your request is too short. Please provide more details about what you want to accomplish.',
      };
    }

    // Just a greeting
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'howdy'];
    if (greetings.some((g) => trimmed === g || trimmed === `${g}!`)) {
      return {
        type: 'clarification_needed',
        summary: 'Hello! I\'m the Agent OS Orchestrator. Please describe a task you\'d like me to help with. For example:\n• "Create a dashboard for user analytics"\n• "Fix the login button styling"\n• "Build a RAG system for document search"',
      };
    }

    // Very vague single words
    const vagueWords = ['help', 'fix', 'make', 'do', 'something', 'anything', 'stuff'];
    if (vagueWords.includes(trimmed)) {
      return {
        type: 'clarification_needed',
        summary: 'Could you be more specific? What would you like me to help with? Try describing the feature or task you need.',
      };
    }

    return null;
  }
}

export const orchestratorEngine = OrchestratorEngine.getInstance();
