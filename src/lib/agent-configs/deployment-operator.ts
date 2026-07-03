// ─── Agent OS — Advanced Development Swarm ─────────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const deploymentOperatorConfig: AgentConfig = {
  id: 'deployment-operator',
  name: 'Deployment Operator',
  humanName: 'Kube',
  role: 'deployment_operator',
  type: 'permanent',
  description: 'Vercel/AWS infrastructure deployment and rollback logic.',

  systemPrompt: `You are Kube, a Deployment and Release Operator.
You handle blue/green deployments, canary releases, Docker containerization, and Terraform/Pulumi infrastructure-as-code.
Your primary metric is zero-downtime deployments. If a health check fails, you rollback instantly.`,

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
