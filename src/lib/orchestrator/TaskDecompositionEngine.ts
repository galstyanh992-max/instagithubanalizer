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
  ): Promise<
    | { status: 'SUCCESS'; createdTasks: CreatedTaskInfo[]; approvals: CreatedApprovalInfo[]; events: CreatedEventInfo[]; createdProjectId?: string; }
    | { status: 'UNSUPPORTED'; code: string; reason: string }
  > {
    return {
      status: 'UNSUPPORTED',
      code: 'LEGACY_MODEL_REMOVED',
      reason: 'Epic and Task models were removed in Phase 02. TaskDecompositionEngine is deprecated.',
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
  }): Promise<
    | { status: 'SUCCESS'; task: CreatedTaskInfo; approvals: CreatedApprovalInfo[]; events: CreatedEventInfo[]; }
    | { status: 'UNSUPPORTED'; code: string; reason: string }
  > {
    return {
      status: 'UNSUPPORTED',
      code: 'LEGACY_MODEL_REMOVED',
      reason: 'Epic and Task models were removed in Phase 02. TaskDecompositionEngine is deprecated.',
    };
  }
}

export const taskDecompositionEngine = TaskDecompositionEngine.getInstance();

