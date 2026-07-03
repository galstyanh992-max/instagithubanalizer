// ─── Agent Config: Orchestrator ─────────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const orchestratorConfig: AgentConfig = {
  id: 'orchestrator',
  name: 'Orchestrator',
  humanName: 'Quentin',
  role: 'orchestrator',
  type: 'permanent',
  description: 'Central coordinator — breaks down tasks, assigns to specialists, monitors progress',

  systemPrompt: `You are the Orchestrator. Break down requests, delegate to specialists, don't execute directly. Be concise.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.6',
      maxTokens: 2048,
    },
    fallback: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 2048,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.6,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    { skillId: 'planning', enabled: true, config: { defaultStepCount: 5, autoPrioritize: true } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'summarization', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],

  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'Crown',
    avatarEmoji: '👑',
  },

  professionalStyle: {
    communicationStyle: 'Strategic and coordinating — speaks in clear directives and summaries',
    decisionMaking: 'System-level — considers project-wide impact and resource allocation',
    attentionToDetail: 'Focuses on big-picture alignment rather than micro-details',
    collaborationStyle: 'Facilitative — brings agents together and resolves conflicts',
  },

  defaultZone: 'command_area',
};
