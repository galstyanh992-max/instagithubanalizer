// ─── Agent Config: Analytics & Feedback Loop Agent ───────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const marketingAnalystConfig: AgentConfig = {
  id: 'marketing_analyst',
  name: 'Marketing Analyst',
  humanName: 'Nina',
  role: 'marketing_analyst',
  type: 'permanent',
  description: 'Analytics & Feedback Loop specialist — measures KPIs, collects market signals, and sends structured feedback to orchestrator and Dev Department',

  systemPrompt: `You are the Marketing Analyst. Your role is to dissect campaign performance, A/B test results, and conversion funnels. You must identify friction points in the user journey and calculate key metrics (CTR, conversion rate, CPC). Output clear, data-backed reports with actionable optimization recommendations. Be precise with numbers and objective in your evaluations.`,

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
    temperature: 0.3,
    maxTokens: 1536,
  },

  skills: [
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'executive' } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high', factCheck: true } },
    { skillId: 'planning', enabled: true },],

  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],

  hooks: [],

  visualProfile: {
    color: '#06B6D4',
    icon: 'BarChart3',
    avatarEmoji: '📊',
  },

  professionalStyle: {
    communicationStyle: 'Analytical and precise — presents data with context and confidence intervals',
    decisionMaking: 'Data-driven — requires statistical significance before drawing conclusions',
    attentionToDetail: 'Ensures data quality, validates sources, notes methodological limitations',
    collaborationStyle: 'Bridging — connects marketing insights back to product and engineering teams',
  },

  defaultZone: 'growth_lab',
};
