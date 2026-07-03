// ─── Agent OS — Domain Entity Types ──────────────────────────
// Mirror of the Prisma schema as TypeScript interfaces
// with additional enum-like constants for type safety.

// ─── Status Enums ────────────────────────────────────────────

export const TaskStatus = {
  BACKLOG: 'backlog',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  WAITING_APPROVAL: 'waiting_approval',
  DONE: 'done',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const AgentStatus = {
  IDLE: 'idle',
  THINKING: 'thinking',
  WORKING: 'working',
  WAITING_API: 'waiting_api',
  REVIEWING: 'reviewing',
  WAITING_APPROVAL: 'waiting_approval',
  DONE: 'done',
  ERROR: 'error',
  OFFLINE: 'offline',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const OfficeZone = {
  COMMAND_AREA: 'command_area',
  SITUATION_ROOM: 'situation_room',
  DEVELOPMENT_AREA: 'development_area',
  DESIGN_AREA: 'design_area',
  RESEARCH_AREA: 'research_area',
  SERVER_ROOM: 'server_room',
  MEETING_ROOM: 'meeting_room',
  LOUNGE_AREA: 'lounge_area',
  MARKETING_AREA: 'marketing_area',
  CONTENT_STUDIO: 'content_studio',
  GROWTH_LAB: 'growth_lab',
  BRAND_STUDIO: 'brand_studio',
} as const;

export type OfficeZone = (typeof OfficeZone)[keyof typeof OfficeZone];

export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const ProjectSourceType = {
  LOCAL: 'local',
  GIT: 'git',
  CLOUD: 'cloud',
} as const;

export type ProjectSourceType = (typeof ProjectSourceType)[keyof typeof ProjectSourceType];

export const ProjectStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const EpicStatus = {
  BACKLOG: 'backlog',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export type EpicStatus = (typeof EpicStatus)[keyof typeof EpicStatus];

export const WorkspaceMode = {
  SINGLE: 'single',
  TEAM: 'team',
  SAAS: 'saas',
} as const;

export type WorkspaceMode = (typeof WorkspaceMode)[keyof typeof WorkspaceMode];

export const AgentType = {
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];

export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ApprovalActionType = {
  EXECUTE: 'execute',
  DEPLOY: 'deploy',
  DELETE: 'delete',
  MODIFY: 'modify',
  SPEND: 'spend',
  ACCESS: 'access',
} as const;

export type ApprovalActionType = (typeof ApprovalActionType)[keyof typeof ApprovalActionType];

export const MemoryScope = {
  GLOBAL: 'global',
  WORKSPACE: 'workspace',
  PROJECT: 'project',
  AGENT: 'agent',
  TASK: 'task',
} as const;

export type MemoryScope = (typeof MemoryScope)[keyof typeof MemoryScope];

export const MemoryType = {
  // ── Original types ──
  CONTEXT: 'context',
  DECISION: 'decision',
  FACT: 'fact',
  LESSON: 'lesson',
  CONVERSATION_SUMMARY: 'conversation_summary',
  ERROR: 'error',
  // ── Extended types ──
  ARCHITECTURE: 'architecture',
  BUG: 'bug',
  TASK_RESULT: 'task_result',
  BRAND_RULE: 'brand_rule',
  USER_PREFERENCE: 'user_preference',
  RISK: 'risk',
  LEAD_NOTE: 'lead_note',
  WORKFLOW_NOTE: 'workflow_note',
  FILE_REFERENCE: 'file_reference',
} as const;

export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];

export const MemoryImportance = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type MemoryImportance = (typeof MemoryImportance)[keyof typeof MemoryImportance];

export const MemoryVisibility = {
  GLOBAL: 'global',
  WORKSPACE: 'workspace',
  AGENT_PRIVATE: 'agent_private',
} as const;
export type MemoryVisibility = (typeof MemoryVisibility)[keyof typeof MemoryVisibility];

// ─── Domain Entity Interfaces ────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  mode: WorkspaceMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  sourceType: ProjectSourceType;
  sourcePath: string | null;
  repoUrl: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Epic {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: EpicStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  epicId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignedAgentId: string | null;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  costEstimate: number | null;
  costActual: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  role: string;
  type: AgentType;
  visualProfile: Record<string, unknown> | null;
  professionalStyle: Record<string, unknown> | null;
  systemPrompt: string | null;
  status: AgentStatus;
  locationZone: OfficeZone;
  activeTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryItem {
  id: string;
  scope: MemoryScope;
  scopeId: string | null;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  agentId: string;
  actionType: ApprovalActionType;
  summary: string;
  risk: RiskLevel;
  payload: Record<string, unknown> | null;
  status: ApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventLogEntry {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CostLogEntry {
  id: string;
  agentId: string;
  taskId: string | null;
  provider: string | null;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  createdAt: Date;
}

// ─── Create/Input Types ──────────────────────────────────────

export interface CreateWorkspaceInput {
  name: string;
  mode?: WorkspaceMode;
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
  sourceType?: ProjectSourceType;
  sourcePath?: string;
  repoUrl?: string;
}

export interface CreateEpicInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: Priority;
}

export interface CreateTaskInput {
  epicId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  priority?: Priority;
  assignedAgentId?: string;
  riskLevel?: RiskLevel;
  requiresApproval?: boolean;
  costEstimate?: number;
}

export interface CreateAgentInput {
  workspaceId: string;
  name: string;
  role: string;
  type?: AgentType;
  visualProfile?: Record<string, unknown>;
  professionalStyle?: Record<string, unknown>;
  systemPrompt?: string;
  locationZone?: OfficeZone;
}

export interface CreateMemoryInput {
  // Legacy fields (preserved for existing code)
  scope?: MemoryScope;
  scopeId?: string;
  // New fields
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  type: MemoryType;
  title?: string;
  content: string;
  tags?: string[];
  importance?: MemoryImportance;
  confidence?: number;
  visibility?: MemoryVisibility;
  metadata?: Record<string, unknown>;
}

export interface CreateApprovalInput {
  taskId?: string;          // Optional — null for task-independent approvals
  workspaceId?: string;    // Direct workspace reference when taskId is null
  agentId: string;
  actionType: ApprovalActionType;
  summary: string;
  risk?: RiskLevel;
  payload?: Record<string, unknown>;
}

export interface CreateCostLogInput {
  agentId: string;
  taskId?: string;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
}
