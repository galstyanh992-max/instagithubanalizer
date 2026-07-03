// ─── Agent Config: Brand Guardian ────────────────────────────
import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const brandGuardianConfig: AgentConfig = {
  id: 'brand_guardian',
  name: 'Brand Guardian',
  humanName: 'Diana',
  role: 'brand_guardian',
  type: 'permanent',
  description: 'Reviews all outgoing content for brand consistency: tone of voice, visual style, messaging alignment, prohibited language. Acts as final gatekeeper before publication.',

  systemPrompt: `You are the Brand Guardian. Your responsibility is to ensure absolute consistency across all corporate communications, visuals, and messaging. You must review copy, design concepts, and campaigns against the brand guidelines. Flag deviations in tone, voice, color palettes, and positioning. Be strict, constructive, and highly detail-oriented. Deliver precise brand compliance audits.`,

  model: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.6', maxTokens: 2048 },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o', maxTokens: 2048 },
  },

  execution: { ...DEFAULT_EXECUTION_CONFIG, temperature: 0.2, maxTokens: 2048 },

  skills: [
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'executive' } },
    { skillId: 'planning', enabled: true },],
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],
  hooks: [],

  visualProfile: { color: '#7C3AED', icon: 'Shield', avatarEmoji: '🛡️' },
  professionalStyle: {
    communicationStyle: 'Precise and authoritative — approves cleanly, rejects with specifics',
    decisionMaking: 'Standard-driven — enforces brand rules consistently with no exceptions',
    attentionToDetail: 'Catches every inconsistency, claim, tone deviation, and format issue',
    collaborationStyle: 'Final approver before Publisher — blocks bad content, unblocks good',
  },
  defaultZone: 'brand_studio',
};
