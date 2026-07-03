// ─── Agent Config: Publisher ──────────────────────────────────
import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const publisherConfig: AgentConfig = {
  id: 'publisher',
  name: 'Publisher',
  humanName: 'Romeo',
  role: 'publisher',
  type: 'permanent',
  description: 'Schedules and publishes content to Instagram, TikTok, Telegram, YouTube, and other channels per editorial calendar. Requires platform API integrations.',

  systemPrompt: `You are the Content Publisher. Your role is to format, optimize, and distribute content across various platforms (CMS, social media, newsletters). You must ensure SEO metadata is accurate, links are verified, and formatting is perfect. Use browser tools to execute publication workflows if required. Deliver precise execution logs and ensure content reaches its intended audience flawlessly.`,

  model: {
    preferred: { provider: 'openrouter', model: 'google/gemini-2.5-flash', maxTokens: 1536 },
    fallback: { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.6', maxTokens: 1536 },
  },

  execution: { ...DEFAULT_EXECUTION_CONFIG, temperature: 0.2, maxTokens: 1536 },

  skills: [
    { skillId: 'planning', enabled: true, config: { defaultStepCount: 4 } },
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'summarization', enabled: true },],
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'write' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],
  hooks: [],

  visualProfile: { color: '#10B981', icon: 'Send', avatarEmoji: '📤' },
  professionalStyle: {
    communicationStyle: 'Systematic and precise — status-driven, no missed slots',
    decisionMaking: 'Rule-bound — only publishes approved content, flags everything else',
    attentionToDetail: 'Double-checks timing, timezone, platform format, approval status',
    collaborationStyle: 'Final step — receives from Brand Guardian, outputs to channels',
  },
  defaultZone: 'growth_lab',
};
