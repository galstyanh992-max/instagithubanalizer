// ─── Agent OS — Agent System Types ────────────────────────────

// ─── Capability levels ───────────────────────────────────────

export const CapabilityLevel = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;
export type CapabilityLevel = (typeof CapabilityLevel)[keyof typeof CapabilityLevel];

// ─── Permission levels ───────────────────────────────────────

export const PermissionLevel = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const;
export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

// ─── Model preference types ──────────────────────────────────

export const ModelPreferenceType = {
  PREFERRED: 'preferred',
  FALLBACK: 'fallback',
} as const;
export type ModelPreferenceType = (typeof ModelPreferenceType)[keyof typeof ModelPreferenceType];

// ─── Seniority levels ────────────────────────────────────────

export const SeniorityLevel = {
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
  PRINCIPAL: 'principal',
} as const;
export type SeniorityLevel = (typeof SeniorityLevel)[keyof typeof SeniorityLevel];

// ─── Capability keys ─────────────────────────────────────────

export const CapabilityKeys = {
  ORCHESTRATION: 'orchestration',
  PRODUCT_ANALYSIS: 'product_analysis',
  SYSTEM_ARCHITECTURE: 'system_architecture',
  FRONTEND_DEVELOPMENT: 'frontend_development',
  BACKEND_DEVELOPMENT: 'backend_development',
  DATABASE_DESIGN: 'database_design',
  QA_TESTING: 'qa_testing',
  DEVOPS: 'devops',
  RESEARCH: 'research',
  DOCUMENT_PROCESSING: 'document_processing',
  TRANSLATION: 'translation',
  RAG: 'rag',
  OCR: 'ocr',
  SECURITY_REVIEW: 'security_review',
  PROMPT_ENGINEERING: 'prompt_engineering',
} as const;
export type CapabilityKey = (typeof CapabilityKeys)[keyof typeof CapabilityKeys];

// ─── Permission keys ─────────────────────────────────────────

export const PermissionKeys = {
  FILES: 'files',
  TERMINAL: 'terminal',
  GIT: 'git',
  DATABASE: 'database',
  BROWSER: 'browser',
  DOCUMENTS: 'documents',
  RAG: 'rag',
  OCR: 'ocr',
  TRANSLATION: 'translation',
  DEPLOYMENT: 'deployment',
  SECRETS: 'secrets',
  PAYMENTS: 'payments',
} as const;
export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

// ─── Profile update input ────────────────────────────────────

export interface UpdateAgentProfileInput {
  displayName?: string;
  avatarKey?: string;
  bio?: string;
  seniority?: string;
  workingStyle?: Record<string, unknown>;
  strengths?: string[];
  limitations?: string[];
  responsibilities?: string[];
}

// ─── Capability update input ─────────────────────────────────

export interface UpdateCapabilityInput {
  capabilityKey: string;
  level?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// ─── Permission update input ─────────────────────────────────

export interface UpdatePermissionInput {
  permissionKey: string;
  permissionLevel?: string;
  constraints?: Record<string, unknown>;
  enabled?: boolean;
}

// ─── Model config input ──────────────────────────────────────

export interface UpdateModelConfigInput {
  provider: string;
  model: string;
  preferenceType?: string;
  maxCostPerTask?: number;
  maxTokens?: number;
  enabled?: boolean;
}

// ─── Runtime state update input ──────────────────────────────

export interface UpdateRuntimeStateInput {
  status?: string;
  locationZone?: string;
  activeTaskId?: string | null; // null to clear
  currentActivity?: string;
  metadata?: Record<string, unknown>;
}

// ─── Temporary agent proposal ────────────────────────────────

export interface TemporaryAgentProposal {
  name: string;
  role: string;
  professionalStyle: {
    communicationStyle: string;
    decisionMaking: string;
    attentionToDetail: string;
    collaborationStyle: string;
  };
  capabilities: { capabilityKey: string; level: string }[];
  permissions: { permissionKey: string; permissionLevel: string }[];
  preferredModel: { provider: string; model: string };
  fallbackModel?: { provider: string; model: string };
  risks: string[];
  estimatedUseCases: string[];
}

// ─── Create temporary agent input ────────────────────────────

export interface CreateTemporaryAgentInput {
  workspaceId: string;
  approvedConfig: TemporaryAgentProposal & {
    systemPrompt?: string;
    locationZone?: string;
    visualProfile?: Record<string, unknown>;
  };
}
