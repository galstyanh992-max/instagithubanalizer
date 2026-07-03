// ─── Agent OS — TaskContract ──────────────────────────────────
// A structured contract that defines the complete specification
// for a task before it is assigned to an agent.
// Used by the Orchestrator to enforce quality, routing, and safety.

import type { RiskLevel } from '../types/domain';

// ─── Core Contract Type ───────────────────────────────────────

export interface TaskContract {
  /** Unique contract ID — generated at creation time */
  id: string;

  /** The specific goal this task must achieve.
   *  Written as an imperative sentence: "Generate a weekly content plan for..." */
  goal: string;

  /** Supporting context: prior messages, project background, related output.
   *  MUST NOT contain secrets, credentials, or PII. */
  context: string[];

  /** Structured inputs the agent will receive.
   *  Shape is task-specific; validated against expectedOutput at quality gate. */
  inputs: Record<string, unknown>;

  /** Expected output shape or example.
   *  Used by QualityGateService to validate agent result structure. */
  expectedOutput: Record<string, unknown>;

  /** Hard constraints the agent must respect.
   *  Examples: "Do not read outside /src", "No API calls to external services",
   *  "Require human approval before writing to filesystem" */
  constraints: string[];

  /** Department this task is routed to: "dev_department" | "marketing_department" */
  assignedDepartment: string;

  /** Specific agent role assigned to execute this task.
   *  Must be a valid AgentRole value. */
  assignedAgentRole: string;

  /** Numeric priority: 1 (critical) → 5 (low). Matches task.priority convention. */
  priority: 1 | 2 | 3 | 4 | 5;

  /** Risk classification for this task.
   *  Drives approval requirements and quality gate behaviour. */
  riskLevel: RiskLevel;

  /** If true, the task result MUST be reviewed by a human operator
   *  before being considered complete.
   *  Automatically set to true for riskLevel >= 'high'. */
  approvalRequired: boolean;

  /** Human-readable criteria for a result to be considered successful.
   *  Used by QualityGateService to score agent output.
   *  Example: ["Response contains at least 3 content pillars",
   *            "No prohibited brand phrases used"] */
  successCriteria: string[];

  /** IDs of TaskContracts that must complete before this one starts.
   *  Used for sequential/dependency-aware scheduling. */
  dependencies: string[];

  /** Confidence score of the routing decision (0–1).
   *  < 0.5 → low confidence, task is flagged for Orchestrator clarification.
   *  Set by AgentAssignmentEngine. */
  routingConfidence: number;

  /** ISO timestamp when the contract was created */
  createdAt: string;

  /** ID of the workspace this contract belongs to */
  workspaceId: string;

  /** ID of the source message/task that triggered this contract (optional) */
  sourceTaskId?: string;
}

// ─── Contract Creation Input ──────────────────────────────────

export interface CreateTaskContractInput {
  goal: string;
  context?: string[];
  inputs?: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  constraints?: string[];
  assignedDepartment: string;
  assignedAgentRole: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  riskLevel?: RiskLevel;
  successCriteria?: string[];
  dependencies?: string[];
  workspaceId: string;
  sourceTaskId?: string;
}

// ─── Quality Gate Result ──────────────────────────────────────

export type QualityStatus =
  | 'passed'         // All criteria met, no risk triggers
  | 'needs_review'   // medium risk or partial criteria match
  | 'blocked'        // high/critical risk or constraint violation
  | 'escalated';     // ApprovalRequest created, awaiting human

export interface QualityGateResult {
  contractId: string;
  status: QualityStatus;
  score: number;           // 0–1, proportion of successCriteria met
  issues: string[];        // Specific problems found
  riskTriggered: boolean;  // true if riskLevel caused escalation
  approvalRequestId?: string; // Set when an ApprovalRequest was created
  checkedAt: string;       // ISO timestamp
}

// ─── Contract Factory ─────────────────────────────────────────

let contractCounter = 0;

export function createTaskContract(input: CreateTaskContractInput): TaskContract {
  contractCounter++;
  const id = `contract_${Date.now()}_${contractCounter}`;

  // Auto-escalate approval for high/critical risk
  const riskLevel = input.riskLevel ?? 'low';
  const approvalRequired = riskLevel === 'high' || riskLevel === 'critical';

  return {
    id,
    goal: input.goal,
    context: input.context ?? [],
    inputs: input.inputs ?? {},
    expectedOutput: input.expectedOutput ?? {},
    constraints: input.constraints ?? [
      'Do not expose secrets or credentials',
      'Do not access paths outside workspace root',
      'Do not make external API calls unless tool-permitted',
    ],
    assignedDepartment: input.assignedDepartment,
    assignedAgentRole: input.assignedAgentRole,
    priority: input.priority ?? 3,
    riskLevel,
    approvalRequired,
    successCriteria: input.successCriteria ?? ['Task produces a non-empty result', 'No error state returned'],
    dependencies: input.dependencies ?? [],
    routingConfidence: 0, // Set by AgentAssignmentEngine after creation
    createdAt: new Date().toISOString(),
    workspaceId: input.workspaceId,
    sourceTaskId: input.sourceTaskId,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

export function isLowConfidence(contract: TaskContract): boolean {
  return contract.routingConfidence < 0.5;
}

export function requiresHumanApproval(contract: TaskContract): boolean {
  return contract.approvalRequired ||
    contract.riskLevel === 'high' ||
    contract.riskLevel === 'critical';
}
