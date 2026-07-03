// ─── Agent OS — Zod Validation Schemas ───────────────────────

import { z } from 'zod';

// ─── Orchestrator Schemas ────────────────────────────────────

export const orchestratorMessageSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  message: z.string().min(1, 'message is required').max(5000, 'message is too long (max 5000 characters)'),
  mode: z.enum(['manual', 'balanced', 'autonomous']).default('balanced'),
  correlationId: z.string().optional(), // Auto-generated if not provided. Links orchestrator → tool events for office animation.
});

export const orchestratorPlanSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  message: z.string().min(1, 'message is required').max(5000, 'message is too long'),
});

export const planEpicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tasks: z.array(z.lazy(() => planTaskSchema)),
});

export const planTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedAgentRole: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  requiresApproval: z.boolean().default(false),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    assignedAgentRole: z.string().optional(),
  })).optional(),
});

export const approvePlanSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  plan: z.object({
    goal: z.string().min(1),
    assumptions: z.array(z.string()),
    involvedAgentRoles: z.array(z.string()),
    epics: z.array(planEpicSchema),
    risks: z.array(z.string()),
    requiredApprovals: z.array(z.string()),
    estimatedCost: z.object({
      level: z.enum(['low', 'medium', 'high', 'potentially_high']),
      estimatedTokens: z.number().optional(),
      estimatedUsd: z.number().optional(),
      notes: z.array(z.string()),
    }),
    executionMode: z.enum(['sequential', 'parallel', 'mixed']),
    taskSize: z.enum(['small', 'medium', 'large', 'epic']),
  }),
  createProject: z.boolean().optional(),
  projectName: z.string().optional(),
});

// ─── Existing Entity Schemas (for future use) ────────────────

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional(),
  sourceType: z.enum(['local', 'git', 'cloud']).default('local'),
  sourcePath: z.string().optional(),
  repoUrl: z.string().optional(),
});

export const createTaskSchema = z.object({
  epicId: z.string().min(1, 'epicId is required'),
  parentTaskId: z.string().optional(),
  title: z.string().min(1, 'title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedAgentId: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  requiresApproval: z.boolean().default(false),
  costEstimate: z.number().positive().optional(),
});

export const createAgentSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  name: z.string().min(1, 'name is required').max(100),
  role: z.string().min(1, 'role is required').max(100),
  type: z.enum(['permanent', 'temporary']).default('temporary'),
  systemPrompt: z.string().max(10000).optional(),
  locationZone: z.enum([
    'command_area', 'situation_room', 'development_area', 'design_area',
    'research_area', 'server_room', 'meeting_room', 'lounge_area',
  ]).default('lounge_area'),
  visualProfile: z.object({
    color: z.string(),
    icon: z.string(),
    avatarEmoji: z.string(),
  }).optional(),
  professionalStyle: z.object({
    communicationStyle: z.string(),
    decisionMaking: z.string(),
    attentionToDetail: z.string(),
    collaborationStyle: z.string(),
  }).optional(),
});

export const createMemorySchema = z.object({
  scope: z.enum(['global', 'workspace', 'project', 'agent', 'task']),
  scopeId: z.string().optional(),
  type: z.enum(['context', 'decision', 'fact', 'lesson', 'conversation_summary', 'error']),
  content: z.string().min(1, 'content is required').max(10000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApprovalSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  agentId: z.string().min(1, 'agentId is required'),
  actionType: z.enum(['execute', 'deploy', 'delete', 'modify', 'spend', 'access']),
  summary: z.string().min(1, 'summary is required').max(1000),
  risk: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ─── Type Inference Helpers ──────────────────────────────────

export type OrchestratorMessageInput = z.infer<typeof orchestratorMessageSchema>;
export type OrchestratorPlanInput = z.infer<typeof orchestratorPlanSchema>;
export type ApprovePlanInput = z.infer<typeof approvePlanSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ─── Agent System Schemas (Stage 3) ─────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarKey: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']).optional(),
  workingStyle: z.record(z.string(), z.unknown()).optional(),
  strengths: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
});

export const updateCapabilitySchema = z.array(z.object({
  capabilityKey: z.string().min(1),
  level: z.enum(['basic', 'intermediate', 'advanced', 'expert']).optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}));

export const updatePermissionSchema = z.array(z.object({
  permissionKey: z.string().min(1),
  permissionLevel: z.enum(['none', 'read', 'write', 'admin']).optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
}));

export const updateModelConfigSchema = z.array(z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  preferenceType: z.enum(['preferred', 'fallback']).default('preferred'),
  maxCostPerTask: z.number().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
}));

export const updateRuntimeSchema = z.object({
  status: z.enum(['idle', 'thinking', 'working', 'waiting_api', 'reviewing', 'waiting_approval', 'done', 'error', 'offline']).optional(),
  locationZone: z.enum(['command_area', 'situation_room', 'development_area', 'design_area', 'research_area', 'server_room', 'meeting_room', 'lounge_area', 'marketing_area', 'content_studio', 'growth_lab']).optional(),
  activeTaskId: z.string().nullable().optional(),
  currentActivity: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const proposeTemporaryAgentSchema = z.object({
  workspaceId: z.string().min(1),
  purpose: z.string().min(1).max(500),
});

export const createTemporaryAgentSchema = z.object({
  workspaceId: z.string().min(1),
  approvedConfig: z.object({
    name: z.string().min(1).max(100),
    role: z.string().min(1).max(100),
    professionalStyle: z.object({
      communicationStyle: z.string(),
      decisionMaking: z.string(),
      attentionToDetail: z.string(),
      collaborationStyle: z.string(),
    }),
    capabilities: z.array(z.object({
      capabilityKey: z.string(),
      level: z.string(),
    })),
    permissions: z.array(z.object({
      permissionKey: z.string(),
      permissionLevel: z.string(),
    })),
    preferredModel: z.object({
      provider: z.string(),
      model: z.string(),
    }),
    fallbackModel: z.object({
      provider: z.string(),
      model: z.string(),
    }).optional(),
    risks: z.array(z.string()),
    estimatedUseCases: z.array(z.string()),
    systemPrompt: z.string().max(10000).optional(),
    locationZone: z.enum(['command_area', 'situation_room', 'development_area', 'design_area', 'research_area', 'server_room', 'meeting_room', 'lounge_area', 'marketing_area', 'content_studio', 'growth_lab']).optional(),
    visualProfile: z.object({
      color: z.string(),
      icon: z.string(),
      avatarEmoji: z.string(),
    }).optional(),
  }),
});

export const deactivateAgentSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Agent System Type Inference Helpers ──────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateCapabilityInput = z.infer<typeof updateCapabilitySchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
export type UpdateModelConfigInput = z.infer<typeof updateModelConfigSchema>;
export type UpdateRuntimeInput = z.infer<typeof updateRuntimeSchema>;
export type ProposeTemporaryAgentInput = z.infer<typeof proposeTemporaryAgentSchema>;
export type CreateTemporaryAgentInput = z.infer<typeof createTemporaryAgentSchema>;

// ─── Tool Hub Schemas (Stage 4) ───────────────────────────

export const createToolSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1, 'name is required').max(200),
  key: z.string().min(1, 'key is required').max(200),
  category: z.enum([
    'model_provider', 'filesystem', 'terminal', 'git', 'browser',
    'database', 'document', 'ocr', 'translation', 'rag',
    'deployment', 'notification', 'media', 'cost', 'internal',
  ]),
  description: z.string().max(2000).optional(),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  requiresApproval: z.boolean().default(false),
});

export const updateToolSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  requiresApproval: z.boolean().optional(),
});

export const updateToolPolicySchema = z.array(z.object({
  permissionKey: z.string().min(1, 'permissionKey is required'),
  requiredLevel: z.enum(['none', 'read', 'write', 'admin']).default('read'),
  constraints: z.record(z.string(), z.unknown()).optional(),
}));

export const executeToolSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  agentId: z.string().min(1, 'agentId is required'),
  taskId: z.string().optional(),
  toolKey: z.string().min(1, 'toolKey is required'),
  action: z.string().min(1, 'action is required'),
  input: z.unknown().optional(),
  correlationId: z.string().optional(),

});

export const executionQuerySchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  agentId: z.string().optional(),
  toolId: z.string().optional(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'blocked', 'requires_approval']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Tool Hub Type Inference Helpers ──────────────────────

export type CreateToolInput = z.infer<typeof createToolSchema>;
export type UpdateToolInput = z.infer<typeof updateToolSchema>;
export type UpdateToolPolicyInput = z.infer<typeof updateToolPolicySchema>;
export type ExecuteToolInput = z.infer<typeof executeToolSchema>;
export type ExecutionQueryInput = z.infer<typeof executionQuerySchema>;
