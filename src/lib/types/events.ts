// ─── Agent OS — Event System Types ───────────────────────────

import type {
  TaskStatus,
  AgentStatus,
  OfficeZone,
  ApprovalStatus,
  MemoryScope,
  RiskLevel,
} from './domain';

// ─── Event Type Constants ────────────────────────────────────

export const EventTypes = {
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_ARCHIVED: 'project.archived',

  // Epic events
  EPIC_CREATED: 'epic.created',
  EPIC_UPDATED: 'epic.updated',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STARTED: 'task.started',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  TASK_STATUS_CHANGED: 'task.status_changed',

  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_LOCATION_CHANGED: 'agent.location_changed',

  // Approval events
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',

  // Memory events
  MEMORY_CREATED: 'memory.created',
  MEMORY_UPDATED: 'memory.updated',
  MEMORY_REMOVED: 'memory.removed',
  MEMORY_CONFLICT: 'memory.conflict',

  // Cost events
  COST_LOGGED: 'cost.logged',

  // Orchestrator events
  ORCHESTRATOR_MESSAGE_RECEIVED: 'orchestrator.message_received',
  ORCHESTRATOR_PLAN_CREATED: 'orchestrator.plan_created',
  ORCHESTRATOR_PLAN_APPROVED: 'orchestrator.plan_approved',
  ORCHESTRATOR_COST_ESTIMATED: 'orchestrator.cost_estimated',

  // Agent system events (Stage 3)
  AGENT_PROFILE_UPDATED: 'agent.profile_updated',
  AGENT_CAPABILITY_UPDATED: 'agent.capability_updated',
  AGENT_PERMISSION_UPDATED: 'agent.permission_updated',
  AGENT_MODEL_CONFIG_UPDATED: 'agent.model_config_updated',
  AGENT_TASK_ASSIGNED: 'agent.task_assigned',
  AGENT_TASK_CLEARED: 'agent.task_cleared',
  AGENT_TEMPORARY_PROPOSED: 'agent.temporary_proposed',
  AGENT_TEMPORARY_CREATED: 'agent.temporary_created',
  AGENT_DEACTIVATED: 'agent.deactivated',
  AGENT_MEMORY_LINKED: 'agent.memory_linked',
  AGENT_MEMORY_UNLINKED: 'agent.memory_unlinked',

  // Tool Hub events (Stage 4)
  TOOL_CREATED: 'tool.created',
  TOOL_UPDATED: 'tool.updated',
  TOOL_POLICY_UPDATED: 'tool.policy_updated',
  TOOL_EXECUTION_REQUESTED: 'tool.execution_requested',
  TOOL_EXECUTION_STARTED: 'tool.execution_started',
  TOOL_EXECUTION_SUCCEEDED: 'tool.execution_succeeded',
  TOOL_EXECUTION_FAILED: 'tool.execution_failed',
  TOOL_EXECUTION_BLOCKED: 'tool.execution_blocked',
  TOOL_APPROVAL_REQUIRED: 'tool.approval_required',
  TOOL_EXECUTION_RESUMED: 'tool.execution_resumed',

  // Cross-department handoff events
  PRODUCT_CONCEPT_READY: 'handoff.product_concept_ready',
  MVP_READY_FOR_MARKETING: 'handoff.mvp_ready_for_marketing',
  RELEASE_CANDIDATE_READY: 'handoff.release_candidate_ready',
  LAUNCH_APPROVED: 'handoff.launch_approved',
  CAMPAIGN_LIVE: 'handoff.campaign_live',
  MARKET_FEEDBACK_COLLECTED: 'handoff.market_feedback_collected',

  // ─── Task Contract & Quality Gate Events ────────────────
  TASK_CONTRACT_CREATED: 'task.contract.created',
  TASK_ROUTING_DECIDED: 'task.routing.decided',
  TASK_QUALITY_CHECKED: 'task.quality.checked',
  TASK_ESCALATED: 'task.escalated',
  POST_LAUNCH_REVIEW: 'handoff.post_launch_review',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// ─── Event Payloads ──────────────────────────────────────────

export interface BaseEventPayload {
  timestamp: number;
  source?: string; // module that emitted the event
}

export interface ProjectCreatedPayload extends BaseEventPayload {
  projectId: string;
  workspaceId: string;
  name: string;
}

export interface EpicCreatedPayload extends BaseEventPayload {
  workspaceId?: string | null;
  epicId: string;
  projectId: string;
  title: string;
}

export interface TaskCreatedPayload extends BaseEventPayload {
  workspaceId?: string | null;
  taskId: string;
  epicId: string;
  title: string;
}

export interface TaskAssignedPayload extends BaseEventPayload {
  workspaceId?: string | null;
  taskId: string;
  agentId: string;
  agentName: string;
}

export interface TaskStartedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
}

export interface TaskCompletedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
  costActual?: number;
}

export interface TaskFailedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
  error?: string;
}

export interface TaskStatusChangedPayload extends BaseEventPayload {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

export interface AgentCreatedPayload extends BaseEventPayload {
  agentId: string;
  workspaceId: string;
  name: string;
  role: string;
}

export interface AgentStatusChangedPayload extends BaseEventPayload {
  agentId: string;
  fromStatus: AgentStatus;
  toStatus: AgentStatus;
}

export interface AgentLocationChangedPayload extends BaseEventPayload {
  agentId: string;
  fromZone: OfficeZone;
  toZone: OfficeZone;
}

export interface ApprovalRequestedPayload extends BaseEventPayload {
  approvalId: string;
  taskId?: string;
  agentId: string;
  actionType: string;
  risk: RiskLevel;
  correlationId?: string;
  workspaceId?: string;
}

export interface ApprovalApprovedPayload extends BaseEventPayload {
  approvalId: string;
  taskId?: string;
  workspaceId?: string;
}

export interface ApprovalRejectedPayload extends BaseEventPayload {
  approvalId: string;
  taskId?: string;
  workspaceId?: string;
}

export interface MemoryCreatedPayload extends BaseEventPayload {
  memoryId: string;
  scope: MemoryScope;
  type: string;
}

export interface CostLoggedPayload extends BaseEventPayload {
  costLogId: string;
  agentId: string;
  taskId?: string;
  provider?: string;
  model?: string;
  cost: number;
}

// ─── Orchestrator Event Payloads ─────────────────────────────

export interface OrchestratorMessageReceivedPayload extends BaseEventPayload {
  workspaceId: string;
  message: string;
  mode: string;
  correlationId?: string;
}

export interface OrchestratorPlanCreatedPayload extends BaseEventPayload {
  workspaceId: string;
  planGoal: string;
  taskSize: string;
  epicCount: number;
  taskCount: number;
  estimatedCostLevel: string;
  correlationId?: string;
}

export interface OrchestratorPlanApprovedPayload extends BaseEventPayload {
  workspaceId: string;
  planGoal: string;
  createdEpicCount: number;
  createdTaskCount: number;
  createdApprovalCount: number;
  correlationId?: string;
}

export interface OrchestratorCostEstimatedPayload extends BaseEventPayload {
  workspaceId: string;
  costLevel: string;
  estimatedTokens?: number;
  estimatedUsd?: number;
  correlationId?: string;
}

// ─── Agent System Event Payloads (Stage 3) ──────────────────

export interface AgentProfileUpdatedPayload extends BaseEventPayload {
  agentId: string;
  updatedFields: string[];
}

export interface AgentCapabilityUpdatedPayload extends BaseEventPayload {
  agentId: string;
  capabilityKey: string;
  level: number;
  enabled: boolean;
}

export interface AgentPermissionUpdatedPayload extends BaseEventPayload {
  agentId: string;
  permissionKey: string;
  permissionLevel: string;
  enabled: boolean;
}

export interface AgentModelConfigUpdatedPayload extends BaseEventPayload {
  agentId: string;
  configId: string;
  provider: string;
  model: string;
  preferenceType: string;
  enabled: boolean;
}

export interface AgentTaskAssignedPayload extends BaseEventPayload {
  agentId: string;
  taskId: string;
}

export interface AgentTaskClearedPayload extends BaseEventPayload {
  agentId: string;
  taskId: string;
}

export interface AgentTemporaryProposedPayload extends BaseEventPayload {
  workspaceId: string;
  proposedName: string;
  proposedRole: string;
}

export interface AgentTemporaryCreatedPayload extends BaseEventPayload {
  agentId: string;
  workspaceId: string;
  name: string;
  role: string;
}

export interface AgentDeactivatedPayload extends BaseEventPayload {
  agentId: string;
  reason?: string;
}

export interface AgentMemoryLinkedPayload extends BaseEventPayload {
  agentId: string;
  memoryItemId: string;
  relevance: number;
}

export interface AgentMemoryUnlinkedPayload extends BaseEventPayload {
  agentId: string;
  memoryItemId: string;
}

// ─── Tool Hub Event Payloads (Stage 4) ─────────────────────

export interface ToolCreatedPayload extends BaseEventPayload {
  toolId: string;
  key: string;
  category: string;
  workspaceId?: string;
}

export interface ToolUpdatedPayload extends BaseEventPayload {
  toolId: string;
  key: string;
  updatedFields: string[];
}

export interface ToolPolicyUpdatedPayload extends BaseEventPayload {
  toolId: string;
  permissionKey: string;
  requiredLevel: string;
}

export interface ToolExecutionRequestedPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  action: string;
  workspaceId: string;
  correlationId?: string;
}

export interface ToolExecutionStartedPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  correlationId?: string;
}

export interface ToolExecutionSucceededPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  correlationId?: string;
}

export interface ToolExecutionFailedPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  error: string;
  correlationId?: string;
}

export interface ToolExecutionBlockedPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  reason: string;
  correlationId?: string;
}

export interface ToolApprovalRequiredPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  approvalRequestId: string;
  correlationId?: string;
}

export interface ToolExecutionResumedPayload extends BaseEventPayload {
  executionId: string;
  toolId: string;
  toolKey: string;
  agentId?: string;
  approvalRequestId: string;
  correlationId?: string;
}

// ─── Cross-Department Handoff Event Payloads ────────────────

export interface ProductConceptReadyPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  productBrief: string;
  targetUserHypothesis: string;
  knownConstraints: string[];
  emittedBy: string; // agent ID that emitted
}

export interface MvpReadyForMarketingPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  prd: string;
  changelog: string;
  demoUrl?: string;
  screenshots?: string[];
  emittedBy: string;
}

export interface ReleaseCandidateReadyPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  releaseNotes: string;
  version: string;
  features: string[];
  knownIssues: string[];
  emittedBy: string;
}

export interface LaunchApprovedPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  launchPlan: string;
  targetDate: string;
  approvedBy: string;
}

export interface CampaignLivePayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  campaignId: string;
  channel: string;
  liveUrl?: string;
  emittedBy: string;
}

export interface MarketFeedbackCollectedPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  feedbackType: string; // sentiment | conversion | retention | nps | review
  summary: string;
  dataPoints: number;
  emittedBy: string;
}

export interface PostLaunchReviewPayload extends BaseEventPayload {
  workspaceId: string;
  projectId: string;
  kpiResults: Record<string, unknown>;
  recommendations: string[];
  devFeedbackItems: string[];
}

// ─── Event Map (for type-safe subscriptions) ─────────────────

// ─── Extended Memory Payloads ────────────────────────────────

export interface MemoryUpdatedPayload extends BaseEventPayload {
  memoryId: string;
  workspaceId?: string;
  type: string;
  title: string;
}

export interface MemoryRemovedPayload extends BaseEventPayload {
  memoryId: string;
  workspaceId?: string;
  type: string;
}

export interface MemoryConflictPayload extends BaseEventPayload {
  newItemId: string;
  conflictingItemId: string;
  workspaceId?: string;
  type: string;
  title: string;
}

// ─── Task Contract & Quality Gate Payloads ───────────────────

export interface TaskContractCreatedPayload extends BaseEventPayload {
  workspaceId: string;
  contractId: string;
  goal: string;
  assignedAgentRole: string;
  assignedDepartment: string;
  riskLevel: string;
  approvalRequired: boolean;
  routingConfidence: number;
}

export interface TaskRoutingDecidedPayload extends BaseEventPayload {
  workspaceId: string;
  contractId: string;
  agentRole: string;
  agentId?: string;
  confidence: number;
  reason: string;
  isLowConfidence: boolean;
}

export interface TaskQualityCheckedPayload extends BaseEventPayload {
  workspaceId: string;
  contractId: string;
  agentId: string;
  score: number;
  status: string;
  issues: string[];
  riskTriggered: boolean;
}

export interface TaskEscalatedPayload extends BaseEventPayload {
  workspaceId: string;
  contractId: string;
  agentId: string;
  approvalRequestId?: string;
  reason: string;
}

export interface EventMap {
  [EventTypes.PROJECT_CREATED]: ProjectCreatedPayload;
  [EventTypes.PROJECT_UPDATED]: BaseEventPayload & { projectId: string };
  [EventTypes.PROJECT_ARCHIVED]: BaseEventPayload & { projectId: string };
  [EventTypes.EPIC_CREATED]: EpicCreatedPayload;
  [EventTypes.EPIC_UPDATED]: BaseEventPayload & { epicId: string };
  [EventTypes.TASK_CREATED]: TaskCreatedPayload;
  [EventTypes.TASK_ASSIGNED]: TaskAssignedPayload;
  [EventTypes.TASK_STARTED]: TaskStartedPayload;
  [EventTypes.TASK_COMPLETED]: TaskCompletedPayload;
  [EventTypes.TASK_FAILED]: TaskFailedPayload;
  [EventTypes.TASK_STATUS_CHANGED]: TaskStatusChangedPayload;
  [EventTypes.AGENT_CREATED]: AgentCreatedPayload;
  [EventTypes.AGENT_STATUS_CHANGED]: AgentStatusChangedPayload;
  [EventTypes.AGENT_LOCATION_CHANGED]: AgentLocationChangedPayload;
  [EventTypes.APPROVAL_REQUESTED]: ApprovalRequestedPayload;
  [EventTypes.APPROVAL_APPROVED]: ApprovalApprovedPayload;
  [EventTypes.APPROVAL_REJECTED]: ApprovalRejectedPayload;
  [EventTypes.MEMORY_CREATED]: MemoryCreatedPayload;
  [EventTypes.COST_LOGGED]: CostLoggedPayload;
  [EventTypes.ORCHESTRATOR_MESSAGE_RECEIVED]: OrchestratorMessageReceivedPayload;
  [EventTypes.ORCHESTRATOR_PLAN_CREATED]: OrchestratorPlanCreatedPayload;
  [EventTypes.ORCHESTRATOR_PLAN_APPROVED]: OrchestratorPlanApprovedPayload;
  [EventTypes.ORCHESTRATOR_COST_ESTIMATED]: OrchestratorCostEstimatedPayload;
  [EventTypes.AGENT_PROFILE_UPDATED]: AgentProfileUpdatedPayload;
  [EventTypes.AGENT_CAPABILITY_UPDATED]: AgentCapabilityUpdatedPayload;
  [EventTypes.AGENT_PERMISSION_UPDATED]: AgentPermissionUpdatedPayload;
  [EventTypes.AGENT_MODEL_CONFIG_UPDATED]: AgentModelConfigUpdatedPayload;
  [EventTypes.AGENT_TASK_ASSIGNED]: AgentTaskAssignedPayload;
  [EventTypes.AGENT_TASK_CLEARED]: AgentTaskClearedPayload;
  [EventTypes.AGENT_TEMPORARY_PROPOSED]: AgentTemporaryProposedPayload;
  [EventTypes.AGENT_TEMPORARY_CREATED]: AgentTemporaryCreatedPayload;
  [EventTypes.AGENT_DEACTIVATED]: AgentDeactivatedPayload;
  [EventTypes.AGENT_MEMORY_LINKED]: AgentMemoryLinkedPayload;
  [EventTypes.AGENT_MEMORY_UNLINKED]: AgentMemoryUnlinkedPayload;
  [EventTypes.TOOL_CREATED]: ToolCreatedPayload;
  [EventTypes.TOOL_UPDATED]: ToolUpdatedPayload;
  [EventTypes.TOOL_POLICY_UPDATED]: ToolPolicyUpdatedPayload;
  [EventTypes.TOOL_EXECUTION_REQUESTED]: ToolExecutionRequestedPayload;
  [EventTypes.TOOL_EXECUTION_STARTED]: ToolExecutionStartedPayload;
  [EventTypes.TOOL_EXECUTION_SUCCEEDED]: ToolExecutionSucceededPayload;
  [EventTypes.TOOL_EXECUTION_FAILED]: ToolExecutionFailedPayload;
  [EventTypes.TOOL_EXECUTION_BLOCKED]: ToolExecutionBlockedPayload;
  [EventTypes.TOOL_APPROVAL_REQUIRED]: ToolApprovalRequiredPayload;
  [EventTypes.TOOL_EXECUTION_RESUMED]: ToolExecutionResumedPayload;
  [EventTypes.PRODUCT_CONCEPT_READY]: ProductConceptReadyPayload;
  [EventTypes.MVP_READY_FOR_MARKETING]: MvpReadyForMarketingPayload;
  [EventTypes.RELEASE_CANDIDATE_READY]: ReleaseCandidateReadyPayload;
  [EventTypes.LAUNCH_APPROVED]: LaunchApprovedPayload;
  [EventTypes.CAMPAIGN_LIVE]: CampaignLivePayload;
  [EventTypes.MARKET_FEEDBACK_COLLECTED]: MarketFeedbackCollectedPayload;
  [EventTypes.POST_LAUNCH_REVIEW]: PostLaunchReviewPayload;
  [EventTypes.MEMORY_UPDATED]: MemoryUpdatedPayload;
  [EventTypes.MEMORY_REMOVED]: MemoryRemovedPayload;
  [EventTypes.MEMORY_CONFLICT]: MemoryConflictPayload;
  [EventTypes.TASK_CONTRACT_CREATED]: TaskContractCreatedPayload;
  [EventTypes.TASK_ROUTING_DECIDED]: TaskRoutingDecidedPayload;
  [EventTypes.TASK_QUALITY_CHECKED]: TaskQualityCheckedPayload;
  [EventTypes.TASK_ESCALATED]: TaskEscalatedPayload;
}

// ─── Event Handler Types ─────────────────────────────────────

export type EventHandler<T extends EventType = EventType> = (
  payload: EventMap[T]
) => void | Promise<void>;

export interface AgentOSEvent {
  type: EventType;
  payload: EventMap[EventType];
}
