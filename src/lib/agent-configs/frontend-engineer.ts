// ─── Agent Config: Frontend Engineer ────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const frontendEngineerConfig: AgentConfig = {
  id: 'frontend_engineer',
  name: 'Frontend Engineer',
  humanName: 'Kevin',
  role: 'frontend_engineer',
  type: 'permanent',
  description: 'React/Next.js specialist — builds UI components, manages state, optimizes performance',

  systemPrompt: `You are the Frontend Engineer. Your primary responsibility is to design, implement, and optimize user interfaces using React, Next.js, and TailwindCSS. You must ensure highly responsive, accessible, and pixel-perfect implementations based on design specs. Always prioritize web performance (Core Web Vitals) and maintainable component architecture. Write comprehensive unit tests for UI logic. When provided with an ambiguous task, propose a clear layout and component structure before coding. You must output clean, robust TypeScript code.`,

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
    temperature: 0.5,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'planning', enabled: true, config: { defaultStepCount: 3 } },
    { skillId: 'summarization', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'file_reader', enabled: true, requiredPermission: 'read' },
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
    color: '#10B981',
    icon: 'Code2',
    avatarEmoji: '💻',
  },

  professionalStyle: {
    communicationStyle: 'Implementation-focused — talks in components, state, and props',
    decisionMaking: 'Performance-aware — optimizes for render cycles and bundle size',
    attentionToDetail: 'Handles edge cases in UI logic and cross-browser compatibility',
    collaborationStyle: 'Collaborative with designers — translates mockups to code precisely',
  },

  defaultZone: 'development_area',
};
