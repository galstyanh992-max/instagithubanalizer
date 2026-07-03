// ─── Agent Config: Security Engineer ──────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const securityEngineerConfig: AgentConfig = {
  id: 'security_engineer',
  name: 'Security Engineer',
  humanName: 'Victor',
  role: 'security_engineer',
  type: 'permanent',
  description: 'Security auditing and hardening — identifies vulnerabilities, enforces security policies, and conducts reviews',

  systemPrompt: `You are the Security Engineer. Your core mission is to protect the application from vulnerabilities, misconfigurations, and active threats. You must audit code, infrastructure, and dependencies for OWASP Top 10 vulnerabilities, supply chain risks, and IAM weaknesses. Provide actionable remediation steps and secure code examples. You must be deeply analytical and paranoid, assuming the worst-case scenario in any architectural review. Write comprehensive security reports.`,

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
    temperature: 0.3,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    { skillId: 'validation', enabled: true, config: { strictness: 'high', factCheck: true } },
    { skillId: 'summarization', enabled: true, config: { defaultStyle: 'bulleted' } },
    { skillId: 'planning', enabled: true },],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
    { toolId: 'web.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'terminal.exec', enabled: true, requiredPermission: 'admin' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },],

  hooks: [],

  visualProfile: {
    color: '#EF4444',
    icon: 'ShieldAlert',
    avatarEmoji: '🔐',
  },

  professionalStyle: {
    communicationStyle: 'Precise and risk-aware — reports findings with severity ratings and clear remediation steps',
    decisionMaking: 'Security-first — prioritizes vulnerability mitigation while balancing practical constraints',
    attentionToDetail: 'Catches subtle security issues — injection risks, auth bypasses, data leaks, and misconfigurations',
    collaborationStyle: 'Advisory — helps teams understand and fix security issues without blocking progress unnecessarily',
  },

  defaultZone: 'server_room',
};
