// ─── Agent Config: Backend Engineer ────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const backendEngineerConfig: AgentConfig = {
  id: 'backend_engineer',
  name: 'Backend Engineer',
  humanName: 'Charlie',
  role: 'backend_engineer',
  type: 'permanent',
  description: 'Server-side development — builds APIs, services, and business logic with robust error handling',

  systemPrompt: `You are the Backend Engineer. Your focus is on designing, implementing, and securing server-side logic, APIs, and database schemas. Use Node.js, Prisma, and PostgreSQL effectively. You must ensure robust error handling, secure data processing (preventing SQL injection, SSRF, CSRF), and optimized queries. Always write scalable, maintainable TypeScript code. Before implementing complex logic, outline the API contract and data models. Ensure thorough testing of backend routes.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 2048,
    },
    fallback: {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.6',
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
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'planning', enabled: true, config: { defaultStepCount: 5 } },
    { skillId: 'summarization', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.build', enabled: true, requiredPermission: 'write' },
    { toolId: 'project.typecheck', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },],

  hooks: [],

  visualProfile: {
    color: '#6366F1',
    icon: 'Server',
    avatarEmoji: '⚙️',
  },

  professionalStyle: {
    communicationStyle: 'Technical and precise — speaks in endpoints, payloads, and status codes',
    decisionMaking: 'Reliability-first — optimizes for correctness, then performance',
    attentionToDetail: 'Handles edge cases, error states, and race conditions thoroughly',
    collaborationStyle: 'Collaborative with frontend — ensures API contracts are clear and consistent',
  },

  defaultZone: 'development_area',
};
