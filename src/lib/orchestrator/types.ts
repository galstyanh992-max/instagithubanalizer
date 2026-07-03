// ─── Agent OS — Orchestrator Types ───────────────────────────

import type { Priority, RiskLevel } from '../types/domain';

// ─── Orchestrator Input ──────────────────────────────────────

export type OrchestratorMode = 'manual' | 'balanced' | 'autonomous';

export interface OrchestratorInput {
  workspaceId: string;
  projectId?: string;
  message: string;
  mode?: OrchestratorMode;
  correlationId?: string; // Optional: auto-generated if not provided. Links orchestrator → tool events for office animation.
}

// ─── Orchestrator Output ─────────────────────────────────────

export type OrchestratorResponseType =
  | 'plan_required'
  | 'task_started'
  | 'clarification_needed'
  | 'error';

export interface OrchestratorResponse {
  type: OrchestratorResponseType;
  summary: string;
  correlationId?: string; // Links this response to the orchestrator run
  plan?: OrchestratorPlan;
  createdTasks?: CreatedTaskInfo[];
  approvals?: CreatedApprovalInfo[];
  estimatedCost?: CostEstimate;
  events?: CreatedEventInfo[];
}

// ─── Plan ────────────────────────────────────────────────────

export type TaskSize = 'small' | 'medium' | 'large' | 'epic';
export type ExecutionMode = 'sequential' | 'parallel' | 'mixed';

export interface PlanEpic {
  title: string;
  description: string;
  priority: Priority;
  tasks: PlanTask[];
}

export interface PlanTask {
  title: string;
  description: string;
  priority: Priority;
  assignedAgentRole?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  subtasks?: PlanSubtask[];
}

export interface PlanSubtask {
  title: string;
  description: string;
  assignedAgentRole?: string;
}

export interface OrchestratorPlan {
  goal: string;
  assumptions: string[];
  involvedAgentRoles: string[];
  epics: PlanEpic[];
  risks: string[];
  requiredApprovals: string[];
  estimatedCost: CostEstimate;
  executionMode: ExecutionMode;
  taskSize: TaskSize;
}

// ─── Cost Estimation ─────────────────────────────────────────

export type CostLevel = 'low' | 'medium' | 'high' | 'potentially_high';

export interface CostEstimate {
  level: CostLevel;
  estimatedTokens?: number;
  estimatedUsd?: number;
  notes: string[];
}

// ─── Agent Assignment ────────────────────────────────────────

export interface AgentAssignment {
  agentRole: string;
  agentId?: string; // resolved from DB, if found
  agentName?: string;
  confidence: number; // 0–1
  reason: string;
  isTemporary?: boolean; // true if no permanent agent matches
}

// ─── Approval Assessment ─────────────────────────────────────

export interface ApprovalAssessment {
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  actionType: string;
  summary: string;
  matchedKeywords: string[];
}

// ─── Task Size Classification ────────────────────────────────

export interface TaskClassification {
  size: TaskSize;
  confidence: number;
  reasons: string[];
  keywords: string[];
}

// ─── Created Entity Info (returned in response) ──────────────

export interface CreatedTaskInfo {
  id: string;
  title: string;
  status: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  epicId?: string;
  parentTaskId?: string;
}

export interface CreatedApprovalInfo {
  id: string;
  taskId: string | null;
  actionType: string;
  summary: string;
  risk: RiskLevel;
  status: string;
}

export interface CreatedEventInfo {
  eventType: string;
  entityId?: string;
  timestamp: number;
}

// ─── Approve Plan Input ──────────────────────────────────────

export interface ApprovePlanInput {
  workspaceId: string;
  projectId?: string;
  plan: OrchestratorPlan;
  createProject?: boolean;
  projectName?: string;
}

// ─── Clarification ───────────────────────────────────────────

export interface ClarificationQuestion {
  question: string;
  field: string;
  options?: string[];
}
