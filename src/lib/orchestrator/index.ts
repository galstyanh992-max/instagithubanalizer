// ─── Agent OS — Orchestrator Module Exports ──────────────────

export { orchestratorEngine } from './OrchestratorEngine';
export { orchestratorChatEngine } from './OrchestratorChatEngine';
export { planningEngine } from './PlanningEngine';
export { taskDecompositionEngine } from './TaskDecompositionEngine';
export { agentAssignmentEngine } from './AgentAssignmentEngine';
export { approvalEngine } from './ApprovalEngine';
export { costEstimationEngine } from './CostEstimationEngine';
export { agentHiringService } from './AgentHiringService';

export type {
  OrchestratorInput,
  OrchestratorResponse,
  OrchestratorMode,
  OrchestratorResponseType,
  OrchestratorPlan,
  PlanEpic,
  PlanTask,
  PlanSubtask,
  TaskSize,
  ExecutionMode,
  CostEstimate,
  CostLevel,
  AgentAssignment,
  ApprovalAssessment,
  TaskClassification,
  CreatedTaskInfo,
  CreatedApprovalInfo,
  CreatedEventInfo,
  ApprovePlanInput,
  ClarificationQuestion,
} from './types';

export type {
  DelegationStep,
  OrchestratorChatResponse,
  OrchestratorChatInput,
} from './OrchestratorChatEngine';

export type {
  AgentHireRequest,
  AgentHireResult,
} from './AgentHiringService';

// ─── Task Contract & Quality Gate (Stage 7) ──────────────────
export {
  createTaskContract,
  isLowConfidence,
  requiresHumanApproval,
  type TaskContract,
  type QualityGateResult,
  type CreateTaskContractInput,
} from './TaskContract';

export { qualityGateService } from './QualityGateService';
