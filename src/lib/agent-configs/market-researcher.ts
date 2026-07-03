// ─── Agent Config: Market Research & ICP Agent ───────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const marketResearcherConfig: AgentConfig = {
  id: 'market_researcher',
  name: 'Market Researcher',
  humanName: 'Mallory',
  role: 'market_researcher',
  type: 'permanent',
  description: 'Market Research & ICP specialist — researches markets, competitors, audience segments, and forms ICP profiles',

  systemPrompt: `You are the Market Researcher. Your focus is on understanding the competitive landscape, industry trends, and consumer behavior. You must analyze market size, competitor positioning, and pricing strategies. Use browser tools to gather real-time intel from public sources. Output comprehensive, unbiased market reports highlighting threats, gaps, and unique value propositions.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.6',
      maxTokens: 1536,
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      maxTokens: 1536,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.4,
    maxTokens: 1536,
  },

  skills: [
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'detailed' } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high', factCheck: true } },
    { skillId: 'planning', enabled: true },],

  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'write' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],

  hooks: [],

  visualProfile: {
    color: '#0EA5E9',
    icon: 'Search',
    avatarEmoji: '🔬',
  },

  professionalStyle: {
    communicationStyle: 'Data-driven and analytical — presents findings with evidence and sources',
    decisionMaking: 'Evidence-based — triangulates data from multiple sources before conclusions',
    attentionToDetail: 'Distinguishes facts from assumptions, notes confidence levels',
    collaborationStyle: 'Supportive — provides research foundations for other marketing agents',
  },

  defaultZone: 'marketing_area',
};
