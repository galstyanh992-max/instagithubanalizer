// ─── Agent Config: Research Specialist ──────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const researcherConfig: AgentConfig = {
  id: 'researcher',
  name: 'Research Specialist',
  humanName: 'Trent',
  role: 'researcher',
  type: 'permanent',
  description: 'Research and fact-checking — compares alternatives, provides sourced recommendations',

  systemPrompt: `You are the Research Specialist. Your duty is to conduct thorough, unbiased research, compare technical or market alternatives, and verify facts. You must synthesize complex information into clear, sourced recommendations. Distinguish clearly between verifiable facts, expert opinions, and uncertainties. Use browser tools to extract up-to-date data. Output detailed, well-structured research reports with citations.`,

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
    temperature: 0.8,
    maxTokens: 1536,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'detailed', maxKeyPoints: 7 } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high', factCheck: true } },
    { skillId: 'planning', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'calculator', enabled: true, requiredPermission: 'none' },
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'write' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],

  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'BookOpen',
    avatarEmoji: '📚',
  },

  professionalStyle: {
    communicationStyle: 'Curious and thorough — provides well-sourced findings',
    decisionMaking: 'Evidence-based — cites sources and compares alternatives',
    attentionToDetail: 'Distinguishes between facts, opinions, and uncertainties',
    collaborationStyle: 'Supportive — helps other agents with research and fact-checking',
  },

  defaultZone: 'research_area',
};
