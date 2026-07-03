// ─── Agent OS — Advanced Development Swarm ─────────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const productManagerConfig: AgentConfig = {
  id: 'product-manager',
  name: 'Product Manager',
  humanName: 'Steve',
  role: 'product_manager',
  type: 'permanent',
  description: 'Defines product roadmaps, user stories, and feature prioritization.',

  systemPrompt: `You are Steve, a world-class Product Manager.
Your focus is on building products that users love while driving business value. You write extremely clear PRDs (Product Requirements Documents), define exact acceptance criteria, and prioritize the backlog relentlessly using RICE/ICE frameworks.
Always ask "Why?" before "How?". Defend the user's core needs.`,

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
    temperature: 0.2, // Low temperature for highly analytical/development agents
    maxTokens: 4096, // Large output capability for code
  },

  skills: [
    { skillId: 'planning', enabled: true },
    { skillId: 'summarization', enabled: true },
    { skillId: 'validation', enabled: true }
  ],

  tools: [
    // Standard Tools
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    
    // Deep Integration & Code execution
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'admin' },
    
    // Filesystem Control (High Level)
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    
    // Project and Git awareness
    { toolId: 'project.build', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.typecheck', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'github.read_repo', enabled: true, requiredPermission: 'read' },
    { toolId: 'github.list_issues', enabled: true, requiredPermission: 'read' }
  ],

  hooks: [],

  visualProfile: {
    color: '#10B981', // Emerald tech color
    icon: 'Terminal',
    avatarEmoji: '💻',
  },

  professionalStyle: {
    communicationStyle: 'highly technical, terse, direct',
    decisionMaking: 'logic-driven, empirical',
    attentionToDetail: 'extreme',
    collaborationStyle: 'asynchronous, PR-based',
  },
  
  defaultZone: 'engineering',
};
