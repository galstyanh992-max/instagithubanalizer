// ─── Agent OS — Stage 2: Agent Config ─────────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const seoSpecialistConfig: AgentConfig = {
  id: 'seo-specialist',
  name: 'SEO-специалист',
  humanName: 'Simon',
  role: 'seo_specialist',
  type: 'permanent',
  description: 'Optimizes organic search traffic, analyzes keywords, and performs technical SEO audits.',

  systemPrompt: `You are Simon, an SEO Specialist.
Your goal is to dominate organic search rankings. Focus on technical SEO, semantic core expansion, backlink strategies, and on-page optimization.
Ensure all content recommendations align with current search engine algorithms.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.7,
    maxTokens: 2048,
  },

  skills: [
    { skillId: 'planning', enabled: true },
    { skillId: 'summarization', enabled: true },
    { skillId: 'validation', enabled: true }
  ],

  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' }
  ],

  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'TrendingUp',
    avatarEmoji: '📈',
  },

  professionalStyle: {
    communicationStyle: 'direct',
    decisionMaking: 'data-driven',
    attentionToDetail: 'high',
    collaborationStyle: 'proactive',
  },
  defaultZone: 'office',
};
