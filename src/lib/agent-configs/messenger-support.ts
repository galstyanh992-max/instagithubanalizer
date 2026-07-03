// ─── Agent Config: Messenger Support ─────────────────────────
import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const messengerSupportConfig: AgentConfig = {
  id: 'messenger_support',
  name: 'Messenger Support',
  humanName: 'Peggy',
  role: 'messenger_support',
  type: 'permanent',
  description: 'Handles inbound messages in WhatsApp, Telegram, Instagram Direct. Qualifies leads, collects contact info, books appointments, escalates complex or high-risk cases.',

  systemPrompt: `You are the Messenger Support Agent. Your objective is to resolve customer inquiries, troubleshoot issues, and provide excellent customer service via chat. You must be polite, concise, and helpful. Follow standard operating procedures, escalate complex issues to human agents, and maintain a calm, professional tone at all times. Deliver clear, step-by-step solutions to users.`,

  model: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.6', maxTokens: 1536 },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o', maxTokens: 1536 },
  },

  execution: { ...DEFAULT_EXECUTION_CONFIG, temperature: 0.3, maxTokens: 1536 },

  skills: [
    { skillId: 'validation', enabled: true, config: { strictness: 'high' } },
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'bulleted' } },
    { skillId: 'planning', enabled: true },],
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],
  hooks: [],

  visualProfile: { color: '#0EA5E9', icon: 'Smartphone', avatarEmoji: '📱' },
  professionalStyle: {
    communicationStyle: 'Helpful and qualifying — guides conversation toward next action',
    decisionMaking: 'Lead-quality focused — distinguishes real buyers from browsers',
    attentionToDetail: 'Collects complete qualification data before routing to Sales',
    collaborationStyle: 'Feeds qualified leads to Sales Agent, flags risks to Marketing Lead',
  },
  defaultZone: 'brand_studio',
};
