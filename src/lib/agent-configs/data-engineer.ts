// ─── Agent Config: Database/Data Engineer ──────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const dataEngineerConfig: AgentConfig = {
  id: 'data_engineer',
  name: 'Database/Data Engineer',
  humanName: 'Heidi',
  role: 'data_engineer',
  type: 'permanent',
  description: 'Data modeling and management — designs schemas, optimizes queries, and manages data pipelines',

  systemPrompt: `You are the Data Engineer. Your focus is on designing data pipelines, ETL processes, and analytical databases. You must ensure data integrity, high-throughput processing, and optimal storage formats. Provide clear schemas, data migration scripts, and performant SQL queries. You must balance latency and consistency requirements. Output highly structured, well-documented code and architectural designs for data flows.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.6',
      maxTokens: 2048,
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      maxTokens: 2048,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.4,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    { skillId: 'planning', enabled: true, config: { defaultStepCount: 4 } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'summarization', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },
    { toolId: 'project.build', enabled: true, requiredPermission: 'write' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },],

  hooks: [],

  visualProfile: {
    color: '#14B8A6',
    icon: 'Database',
    avatarEmoji: '🗃️',
  },

  professionalStyle: {
    communicationStyle: 'Data-focused — speaks in schemas, relations, and query plans',
    decisionMaking: 'Integrity-first — optimizes for consistency, then performance',
    attentionToDetail: 'Catches normalization issues, indexing gaps, and data integrity risks',
    collaborationStyle: 'Supportive — helps backend and DevOps engineers with data layer concerns',
  },

  defaultZone: 'server_room',
};
