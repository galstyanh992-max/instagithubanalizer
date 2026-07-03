// ─── Agent OS — Tool Hub Types ────────────────────────────────

// ─── Tool Categories ─────────────────────────────────────────

export const ToolCategory = {
  MODEL_PROVIDER: 'model_provider',
  FILESYSTEM: 'filesystem',
  TERMINAL: 'terminal',
  GIT: 'git',
  BROWSER: 'browser',
  DATABASE: 'database',
  DOCUMENT: 'document',
  OCR: 'ocr',
  TRANSLATION: 'translation',
  RAG: 'rag',
  DEPLOYMENT: 'deployment',
  NOTIFICATION: 'notification',
  MEDIA: 'media',
  COST: 'cost',
  INTERNAL: 'internal',
} as const;
export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory];

// ─── Risk Levels ─────────────────────────────────────────────

export const ToolRiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type ToolRiskLevel = (typeof ToolRiskLevel)[keyof typeof ToolRiskLevel];

// ─── Execution Status ────────────────────────────────────────

export const ToolExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  REQUIRES_APPROVAL: 'requires_approval',
} as const;
export type ToolExecutionStatus = (typeof ToolExecutionStatus)[keyof typeof ToolExecutionStatus];

// ─── Permission Levels ───────────────────────────────────────

export const ToolPermissionLevel = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const;
export type ToolPermissionLevel = (typeof ToolPermissionLevel)[keyof typeof ToolPermissionLevel];

// ─── Tool Adapter Interface ──────────────────────────────────

export interface ToolExecutionInput {
  workspaceId: string;
  agentId: string;
  taskId?: string;
  toolKey: string;
  action: string;
  input: unknown;
}

export interface ToolExecutionOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolAdapter {
  key: string;
  execute(input: ToolExecutionInput): Promise<ToolExecutionOutput>;
}

// ─── Tool Execution Request ──────────────────────────────────

export interface ExecuteToolRequest {
  workspaceId: string;
  agentId: string;
  taskId?: string;
  toolKey: string;
  action: string;
  input: unknown;
  correlationId?: string;
  resumedFromApproval?: boolean;
}

export interface ExecuteToolResult {
  status: 'success' | 'failed' | 'blocked' | 'requires_approval';
  executionId: string;
  output?: unknown;
  approvalRequestId?: string;
  error?: string;
}

// ─── Tool Config ─────────────────────────────────────────────

export interface ToolConfig {
  name: string;
  key: string;
  category: string;
  description: string;
  configSchema?: Record<string, unknown>;
  enabled: boolean;
  riskLevel: string;
  requiresApproval: boolean;
  policies: ToolPolicyConfig[];
}

export interface ToolPolicyConfig {
  permissionKey: string;
  requiredLevel: string;
  constraints?: Record<string, unknown>;
}

// ─── Create / Update Tool Input ──────────────────────────────

export interface CreateToolInput {
  workspaceId?: string;
  name: string;
  key: string;
  category: string;
  description?: string;
  configSchema?: Record<string, unknown>;
  enabled?: boolean;
  riskLevel?: string;
  requiresApproval?: boolean;
}

export interface UpdateToolInput {
  name?: string;
  description?: string;
  configSchema?: Record<string, unknown>;
  enabled?: boolean;
  riskLevel?: string;
  requiresApproval?: boolean;
}
