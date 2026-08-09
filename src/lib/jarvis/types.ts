// ─── JARVIS AGENT NETWORK — Core Contracts ───────────────────
// Typed contracts for AgentRequest, AgentResult, ToolDefinition,
// TaskGraph, OrchestrationRun, Artifact, Finding, Verification,
// DecisionLog, Checkpoint, and Release Gate.
//
// These types are intentionally plain objects so they can be:
//   - stored as JSON in Prisma;
//   - passed between agents;
//   - validated with Zod where needed.

import type { ToolCategory, ToolRiskLevel } from '@/lib/tool-hub/types';
import type { ToolPermission, ToolInputSchema } from '@/lib/tools/types';
import type { Priority, RiskLevel } from '@/lib/types/domain';

// ─── Orchestration Run ────────────────────────────────────────

export interface OrchestrationRun {
  id: string;
  workspaceId?: string;
  projectId?: string;
  ownerUserId?: string;
  goal: string;
  constraints: string[];
  status: OrchestrationRunStatus;
  mode: string;
  maxAgents: number;
  maxTasks: number;
  maxRetries: number;
  timeoutMs: number;
  context: RunContext;
  createdAt: Date;
  updatedAt: Date;
}

export type OrchestrationRunStatus =
  | 'CREATED'
  | 'ANALYZING'
  | 'PLANNING'
  | 'RUNNING'
  | 'VERIFYING'
  | 'REPAIRING'
  | 'BLOCKED'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskNodeStatus =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'verify'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'skipped';

export type VerificationType =
  | 'self_check'
  | 'independent_audit'
  | 'test'
  | 'build'
  | 'lint'
  | 'typecheck'
  | 'browser'
  | 'security';

export type VerificationStatus = 'passed' | 'failed' | 'not_run' | 'blocked';

export type FindingSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type FindingStatus = 'open' | 'in_repair' | 'verified' | 'closed' | 'deferred';

export type ReleaseVerdict =
  | 'NOT_READY'
  | 'READY_FOR_INTERNAL_TESTING'
  | 'READY_FOR_BETA'
  | 'READY_FOR_LIMITED_PRODUCTION'
  | 'READY_FOR_PRODUCTION'
  | 'STOP_UNSAFE'
  | 'BLOCKED_BY_ACCESS';

export type ArtifactType =
  | 'plan'
  | 'spec'
  | 'code_report'
  | 'test_report'
  | 'audit_report'
  | 'browser_report'
  | 'release_report'
  | 'log';

// ─── Agent Contract ─────────────────────────────────────────

export interface AgentRequest {
  runId: string;
  taskId: string;
  agentId: string;
  role: string;
  mission: string;
  confirmedContext: Record<string, unknown>;
  inputArtifacts: ArtifactRef[];
  availableTools: ToolCapability[];
  allowedScope: string[];
  forbiddenActions: string[];
  expectedOutput: Record<string, unknown>;
  acceptanceCriteria: string[];
  verificationMethod: 'self_check' | 'independent_audit' | 'test' | 'browser' | 'manual';
  exitCriteria: string[];
  timeoutMs: number;
  maxRetries: number;
}

export interface AgentResult {
  status: 'passed' | 'needs_review' | 'failed' | 'blocked';
  summary: string;
  completedTasks: string[];
  artifacts: ArtifactRef[];
  proposedChanges: ProposedChange[];
  changedFiles: string[];
  commandsRun: { command: string; exitCode: number | null }[];
  verificationEvidence: VerificationEvidence[];
  confirmedFindings: string[];
  assumptions: string[];
  unknowns: string[];
  blockers: string[];
  recommendedNextAction: string;
  durationMs: number;
}

export interface ProposedChange {
  filePath: string;
  description: string;
  diff?: string;
}

export interface VerificationEvidence {
  type: string;
  summary: string;
  data?: unknown;
}

// ─── Agent Definition ───────────────────────────────────────

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  mission: string;
  capabilities: string[];
  allowedTools: string[];
  forbiddenActions: string[];
  skills: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  constraints: string[];
  verificationRules: string[];
  exitCriteria: string[];
  enabled: boolean;
  isTemporary?: boolean;
}

// ─── Tool Contract ──────────────────────────────────────────

export interface ToolCapability {
  key: string;
  name: string;
  source: 'default' | 'skill' | 'mcp' | 'browser' | 'script';
  category: ToolCategory | string;
  description: string;
  inputSchema: ToolInputSchema;
  requiredPermission: ToolPermission;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  available: boolean;
  unavailableReason?: string;
  timeoutMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  durationMs: number;
}

// ─── Task Graph ─────────────────────────────────────────────

export interface TaskNode {
  id: string;
  runId: string;
  title: string;
  description: string;
  agentId: string;
  role: string;
  toolKeys: string[];
  dependsOn: string[];
  dependents: string[];
  status: TaskNodeStatus;
  priority: Priority;
  riskLevel: RiskLevel;
  artifactsIn: ArtifactRef[];
  artifactsOut: ArtifactRef[];
  findings: string[];
  retryCount: number;
  request?: AgentRequest;
  result?: AgentResult;
  checkpointId?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface TaskGraph {
  runId: string;
  tasks: TaskNode[];
  ready: string[];
  blocked: string[];
  passed: string[];
  failed: string[];
}

export interface ArtifactRef {
  id: string;
  type: ArtifactType;
  title: string;
}

// ─── Run Context ────────────────────────────────────────────

export interface RunContext {
  runId: string;
  goal: string;
  constraints: string[];
  assumptions: string[];
  confirmedFacts: string[];
  currentPlan: TaskGraph;
  artifacts: ArtifactRef[];
  agentReports: AgentResult[];
  decisions: DecisionLogEntry[];
  blockers: Blocker[];
}

export interface Blocker {
  id: string;
  reason: string;
  severity: FindingSeverity;
  createdAt: Date;
}

// ─── Artifact ───────────────────────────────────────────────

export interface Artifact {
  id: string;
  runId: string;
  agentId?: string;
  type: ArtifactType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  fileRefs: string[];
  createdAt: Date;
}

// ─── Finding ──────────────────────────────────────────────────

export interface Finding {
  id: string;
  runId: string;
  severity: FindingSeverity;
  status: FindingStatus;
  evidence: string;
  rootCause?: string;
  fixSummary?: string;
  fixArtifactId?: string;
  verificationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Verification ───────────────────────────────────────────

export interface VerificationResult {
  id: string;
  runId: string;
  type: VerificationType;
  status: VerificationStatus;
  evidence: string;
  findings: string[];
  durationMs?: number;
  createdAt: Date;
}

// ─── Decision Log ─────────────────────────────────────────────

export interface DecisionLogEntry {
  id: string;
  runId: string;
  phase: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  createdAt: Date;
}

// ─── Checkpoint ───────────────────────────────────────────────

export interface Checkpoint {
  id: string;
  runId: string;
  phase: string;
  taskStatuses: Record<string, TaskNodeStatus>;
  context: RunContext;
  createdAt: Date;
}

// ─── Release Gate ─────────────────────────────────────────────

export interface ReleaseGateResult {
  verdict: ReleaseVerdict;
  reasons: string[];
  completed: string[];
  notCompleted: string[];
  openP0: string[];
  openP1: string[];
  knownLimitations: string[];
  evidence: string;
}

// ─── Browser Agent ──────────────────────────────────────────

export interface BrowserScenario {
  name: string;
  path: string;
  actions: BrowserAction[];
  expected: string;
}

export type BrowserAction =
  | { type: 'navigate'; url: string }
  | { type: 'click'; selector: string }
  | { type: 'type'; selector: string; text: string }
  | { type: 'submit'; selector: string }
  | { type: 'wait'; ms: number }
  | { type: 'screenshot' };

export interface BrowserInventory {
  routes: string[];
  links: string[];
  buttons: string[];
  forms: string[];
  inputs: string[];
  menus: string[];
}

export interface BrowserLogEntry {
  level: string;
  message: string;
  source: string;
  timestamp: number;
}

export interface BrowserNetworkEntry {
  url: string;
  method: string;
  status?: number;
  failed: boolean;
}

export interface BrowserVerificationRequest {
  runId: string;
  targetUrl: string;
  scenarios: BrowserScenario[];
  viewports: number[];
}

export interface BrowserVerificationResult {
  status: 'passed' | 'failed' | 'not_available';
  inventory: BrowserInventory;
  consoleErrors: BrowserLogEntry[];
  failedRequests: BrowserNetworkEntry[];
  screenshots: string[];
  findings: string[];
  evidence: string;
  durationMs: number;
}

export interface BrowserAgent {
  verify(options: BrowserVerificationRequest): Promise<BrowserVerificationResult>;
}

// ─── Orchestrator Input / Output ────────────────────────────

export interface StartRunInput {
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  goal: string;
  constraints?: string[];
  mode?: 'manual' | 'balanced' | 'autonomous';
  maxAgents?: number;
  maxTasks?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface RunReport {
  runId: string;
  status: OrchestrationRunStatus;
  goal: string;
  context: RunContext;
  artifacts: ArtifactRef[];
  findings: string[];
  verificationResults: VerificationResult[];
  releaseGate?: ReleaseGateResult;
  nextSafeAction: string;
  createdAt: Date;
  updatedAt: Date;
}
