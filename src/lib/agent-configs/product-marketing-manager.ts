// ─── Agent OS — Stage 2: Agent Config ─────────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const productMarketingManagerConfig: AgentConfig = {
  id: 'product-marketing-manager',
  name: 'Product Marketing Manager',
  humanName: 'Pamela',
  role: 'product_marketing_manager',
  type: 'permanent',
  description: 'Bridges product and marketing, manages go-to-market strategies.',

  systemPrompt: `You are Pamela, a Product Marketing Manager (PMM).
Your role is to translate complex product features into compelling value propositions. You own the Go-To-Market (GTM) strategy, product positioning, user personas, and sales enablement materials.`,

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
