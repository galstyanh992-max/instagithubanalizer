// ─── Agent OS — Temporary Agent Service ──────────────────────
// Proposes and creates temporary (on-demand) agents for specialized tasks.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { AgentType } from '../types/domain';
import type { TemporaryAgentProposal, CreateTemporaryAgentInput } from './types';
import { agentProfileService } from './AgentProfileService';
import { agentCapabilityService } from './AgentCapabilityService';
import { agentPermissionService } from './AgentPermissionService';
import { agentModelConfigService } from './AgentModelConfigService';
import { agentRuntimeService } from './AgentRuntimeService';
import { getModelConfigForRole, resolveOpenRouterModelAlias } from '../ai-provider/model-registry';
import { resolveDefaultProviderId } from '../ai-provider/default-provider';
import { getDefaultModelsForProvider } from '../ai-provider/default-models';

// ─── Purpose → Proposal mapping ──────────────────────────────

interface ProposalTemplate {
  name: string;
  role: string;
  keywords: string[];
  professionalStyle: {
    communicationStyle: string;
    decisionMaking: string;
    attentionToDetail: string;
    collaborationStyle: string;
  };
  capabilities: { capabilityKey: string; level: string }[];
  permissions: { permissionKey: string; permissionLevel: string }[];
  preferredModel: { provider: string; model: string };
  fallbackModel?: { provider: string; model: string };
  risks: string[];
  estimatedUseCases: string[];
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    name: 'Legal Agent',
    role: 'legal_advisor',
    keywords: ['legal', 'lawyer', 'law', 'compliance', 'contract', 'regulation', 'terms'],
    professionalStyle: {
      communicationStyle: 'Precise and cautious — uses exact legal terminology',
      decisionMaking: 'Risk-averse — always considers worst-case legal scenarios',
      attentionToDetail: 'Meticulous — examines every clause and condition',
      collaborationStyle: 'Advisory — provides legal opinions and flags risks',
    },
    capabilities: [
      { capabilityKey: 'document_processing', level: 'expert' },
      { capabilityKey: 'research', level: 'advanced' },
      { capabilityKey: 'translation', level: 'intermediate' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'read' },
      { permissionKey: 'documents', permissionLevel: 'write' },
      { permissionKey: 'browser', permissionLevel: 'read' },
      { permissionKey: 'rag', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    fallbackModel: { provider: 'openai', model: 'gpt-4o' },
    risks: ['May provide outdated legal information', 'Not a substitute for real legal counsel', 'Jurisdiction-specific knowledge may be limited'],
    estimatedUseCases: ['Contract review', 'Terms of service drafting', 'Compliance checking', 'Legal risk assessment'],
  },
  {
    name: 'Translation Agent',
    role: 'translator',
    keywords: ['translate', 'translation', 'linguist', 'language', 'localize', 'localization', 'i18n'],
    professionalStyle: {
      communicationStyle: 'Multilingual and culturally aware — adapts tone per language',
      decisionMaking: 'Context-sensitive — considers cultural nuances in translation',
      attentionToDetail: 'Grammar and idiom focused — ensures natural expression',
      collaborationStyle: 'Supportive — helps other agents with multilingual content',
    },
    capabilities: [
      { capabilityKey: 'translation', level: 'expert' },
      { capabilityKey: 'document_processing', level: 'advanced' },
      { capabilityKey: 'research', level: 'intermediate' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'read' },
      { permissionKey: 'documents', permissionLevel: 'write' },
      { permissionKey: 'translation', permissionLevel: 'write' },
      { permissionKey: 'browser', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    fallbackModel: { provider: 'openai', model: 'gpt-4o' },
    risks: ['May miss cultural nuances in rare languages', 'Idiomatic expressions may not translate perfectly'],
    estimatedUseCases: ['Content localization', 'Document translation', 'Multi-language support', 'UI text adaptation'],
  },
  {
    name: 'OCR Agent',
    role: 'ocr_specialist',
    keywords: ['ocr', 'optical', 'document scanner', 'scan', 'image text', 'extract text'],
    professionalStyle: {
      communicationStyle: 'Technical and methodical — focuses on accuracy of extracted data',
      decisionMaking: 'Precision-first — prioritizes extraction accuracy over speed',
      attentionToDetail: 'Character-level — validates extracted text against source',
      collaborationStyle: 'Service-oriented — provides clean extracted data to other agents',
    },
    capabilities: [
      { capabilityKey: 'ocr', level: 'expert' },
      { capabilityKey: 'document_processing', level: 'advanced' },
      { capabilityKey: 'research', level: 'basic' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'read' },
      { permissionKey: 'documents', permissionLevel: 'write' },
      { permissionKey: 'ocr', permissionLevel: 'write' },
      { permissionKey: 'browser', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'openai', model: 'gpt-4o' },
    fallbackModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    risks: ['May misread handwriting or low-quality scans', 'Layout-dependent — complex tables may fail', 'Language detection may be imperfect'],
    estimatedUseCases: ['Document digitization', 'Invoice processing', 'Form data extraction', 'Image-to-text conversion'],
  },
  {
    name: 'RAG Specialist',
    role: 'rag_specialist',
    keywords: ['rag', 'vector', 'embedding', 'search', 'retrieval', 'knowledge base', 'semantic'],
    professionalStyle: {
      communicationStyle: 'Data-oriented — speaks in terms of relevance scores and retrieval quality',
      decisionMaking: 'Evidence-based — relies on retrieved context for all conclusions',
      attentionToDetail: 'Chunking and embedding quality focused',
      collaborationStyle: 'Enabling — provides rich context to other agents',
    },
    capabilities: [
      { capabilityKey: 'rag', level: 'expert' },
      { capabilityKey: 'research', level: 'advanced' },
      { capabilityKey: 'document_processing', level: 'advanced' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'read' },
      { permissionKey: 'documents', permissionLevel: 'read' },
      { permissionKey: 'rag', permissionLevel: 'write' },
      { permissionKey: 'database', permissionLevel: 'read' },
      { permissionKey: 'browser', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'openai', model: 'gpt-4o' },
    fallbackModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    risks: ['May retrieve irrelevant context if embeddings are poor', 'Hallucination risk if context is insufficient', 'Dependency on vector DB availability'],
    estimatedUseCases: ['Knowledge base queries', 'Document Q&A', 'Semantic search', 'Context enrichment for other agents'],
  },
  {
    name: 'Security Agent',
    role: 'security_auditor',
    keywords: ['security', 'pen-test', 'vulnerability', 'pentest', 'audit', 'exploit', 'cve'],
    professionalStyle: {
      communicationStyle: 'Security-focused — communicates in terms of threats, vectors, and mitigations',
      decisionMaking: 'Conservative — assumes worst-case threat models',
      attentionToDetail: 'Exhaustive — checks every input vector and permission boundary',
      collaborationStyle: 'Advisory — reports findings clearly with severity ratings',
    },
    capabilities: [
      { capabilityKey: 'security_review', level: 'expert' },
      { capabilityKey: 'backend_development', level: 'advanced' },
      { capabilityKey: 'research', level: 'advanced' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'read' },
      { permissionKey: 'terminal', permissionLevel: 'read' },
      { permissionKey: 'browser', permissionLevel: 'write' },
      { permissionKey: 'database', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    fallbackModel: { provider: 'openai', model: 'gpt-4o' },
    risks: ['May flag false positives in aggressive scanning mode', 'Cannot perform real network penetration tests', 'Findings require manual verification'],
    estimatedUseCases: ['Code security audit', 'Dependency vulnerability scan', 'Security best practices review', 'Threat modeling'],
  },
  {
    name: 'Marketing Agent',
    role: 'marketing_specialist',
    keywords: ['marketing', 'seo', 'content', 'copywriting', 'campaign', 'branding', 'social media'],
    professionalStyle: {
      communicationStyle: 'Engaging and persuasive — crafts compelling narratives',
      decisionMaking: 'Audience-first — tailors content to target demographics',
      attentionToDetail: 'Brand consistency focused — maintains tone and messaging',
      collaborationStyle: 'Creative — brainstorms ideas and iterates on feedback',
    },
    capabilities: [
      { capabilityKey: 'product_analysis', level: 'advanced' },
      { capabilityKey: 'prompt_engineering', level: 'advanced' },
      { capabilityKey: 'research', level: 'intermediate' },
    ],
    permissions: [
      { permissionKey: 'files', permissionLevel: 'write' },
      { permissionKey: 'documents', permissionLevel: 'write' },
      { permissionKey: 'browser', permissionLevel: 'write' },
      { permissionKey: 'rag', permissionLevel: 'read' },
    ],
    preferredModel: { provider: 'openai', model: 'gpt-4o' },
    fallbackModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
    risks: ['May produce generic content without domain expertise', 'SEO recommendations may be outdated', 'Brand voice calibration needed'],
    estimatedUseCases: ['SEO content creation', 'Marketing copy generation', 'Campaign strategy', 'Brand messaging'],
  },
];

// Default fallback template
const DEFAULT_TEMPLATE: ProposalTemplate = {
  name: 'Specialist Agent',
  role: 'specialist',
  keywords: [],
  professionalStyle: {
    communicationStyle: 'Clear and focused — communicates findings concisely',
    decisionMaking: 'Evidence-based — relies on domain knowledge and best practices',
    attentionToDetail: 'Thorough — validates assumptions before concluding',
    collaborationStyle: 'Collaborative — works well within the agent team',
  },
  capabilities: [
    { capabilityKey: 'research', level: 'advanced' },
    { capabilityKey: 'document_processing', level: 'intermediate' },
  ],
  permissions: [
    { permissionKey: 'files', permissionLevel: 'read' },
    { permissionKey: 'documents', permissionLevel: 'read' },
    { permissionKey: 'browser', permissionLevel: 'read' },
  ],
  preferredModel: { provider: 'openai', model: 'gpt-4o' },
  fallbackModel: { provider: 'anthropic', model: 'claude-sonnet-4.6' },
  risks: ['Limited domain expertise outside specialization', 'May require additional training data', 'Unfamiliar with project-specific conventions'],
  estimatedUseCases: ['Domain-specific tasks', 'Specialized analysis', 'Expert consultation'],
};

// ─── Temporary Agent Service ─────────────────────────────────

class TemporaryAgentService {
  private static instance: TemporaryAgentService | null = null;

  private constructor() {}

  static getInstance(): TemporaryAgentService {
    if (!TemporaryAgentService.instance) {
      TemporaryAgentService.instance = new TemporaryAgentService();
    }
    return TemporaryAgentService.instance;
  }

  /**
   * Propose a temporary agent based on purpose keyword matching.
   * Does NOT create an agent in DB — returns a proposal only.
   */
  async proposeTemporaryAgent(workspaceId: string, purpose: string): Promise<TemporaryAgentProposal> {
    const purposeLower = purpose.toLowerCase();

    // Find the best matching template
    let bestMatch: ProposalTemplate | null = null;
    let bestScore = 0;

    for (const template of PROPOSAL_TEMPLATES) {
      let score = 0;
      for (const keyword of template.keywords) {
        if (purposeLower.includes(keyword)) {
          score += keyword.length; // Longer keyword matches are worth more
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    const template = bestMatch ?? DEFAULT_TEMPLATE;
    const defaultProvider = resolveDefaultProviderId();
    const defaultModels = getDefaultModelsForProvider(defaultProvider);
    const modelConfig = getModelConfigForRole(template.role, defaultProvider, defaultModels);

    const proposal: TemporaryAgentProposal = {
      name: template.name,
      role: template.role,
      professionalStyle: { ...template.professionalStyle },
      capabilities: template.capabilities.map((c) => ({ ...c })),
      permissions: template.permissions.map((p) => ({ ...p })),
      preferredModel: { ...modelConfig.preferred },
      fallbackModel: modelConfig.fallback ? { ...modelConfig.fallback } : undefined,
      risks: [...template.risks],
      estimatedUseCases: [...template.estimatedUseCases],
    };

    await eventBus.emit(EventTypes.AGENT_TEMPORARY_PROPOSED, {
      workspaceId,
      proposedName: proposal.name,
      proposedRole: proposal.role,
      timestamp: Date.now(),
      source: 'temporary-agent-service',
    });

    return proposal;
  }

  /**
   * Create a temporary agent from an approved proposal.
   * Creates Agent + Profile + Capabilities + Permissions + ModelConfigs + RuntimeState.
   */
  async createTemporaryAgent(input: CreateTemporaryAgentInput) {
    const { workspaceId, approvedConfig } = input;

    // 1. Create the Agent record
    const agent = await db.agent.create({
      data: {
        workspaceId,
        name: approvedConfig.name,
        role: approvedConfig.role,
        type: AgentType.TEMPORARY,
        visualProfile: approvedConfig.visualProfile
          ? JSON.stringify(approvedConfig.visualProfile)
          : JSON.stringify({ avatarEmoji: '🤖', color: '#6B7280', icon: 'Bot' }),
        professionalStyle: JSON.stringify(approvedConfig.professionalStyle),
        systemPrompt: approvedConfig.systemPrompt ?? `You are a temporary ${approvedConfig.name} with role ${approvedConfig.role}.`,
        status: 'idle',
        locationZone: approvedConfig.locationZone ?? 'meeting_room',
      },
    });

    // 2. Create profile
    await db.agentProfile.create({
      data: {
        agentId: agent.id,
        displayName: approvedConfig.name,
        avatarKey: '🤖',
        bio: `Temporary agent: ${approvedConfig.name} (${approvedConfig.role})`,
        seniority: 'senior',
        workingStyle: JSON.stringify({}),
        strengths: JSON.stringify([]),
        limitations: JSON.stringify(approvedConfig.risks),
        responsibilities: JSON.stringify(approvedConfig.estimatedUseCases),
      },
    });

    // 3. Create capabilities
    for (const cap of approvedConfig.capabilities) {
      await db.agentCapability.create({
        data: {
          agentId: agent.id,
          capabilityKey: cap.capabilityKey,
          level: cap.level,
          enabled: true,
        },
      });
    }

    // 4. Create permissions (conservative defaults + approved)
    // Start with common baseline of "none" for safety
    const allPermissionKeys = [
      'files', 'terminal', 'git', 'database', 'browser',
      'documents', 'rag', 'ocr', 'translation', 'deployment',
      'secrets', 'payments',
    ];
    const approvedPermMap = new Map(
      approvedConfig.permissions.map((p) => [p.permissionKey, p.permissionLevel])
    );

    for (const key of allPermissionKeys) {
      await db.agentPermission.create({
        data: {
          agentId: agent.id,
          permissionKey: key,
          permissionLevel: approvedPermMap.get(key) ?? 'none',
          enabled: true,
        },
      });
    }

    // 5. Create model configs using the default provider
    const defaultProvider = resolveDefaultProviderId();
    await db.agentModelConfig.create({
      data: {
        agentId: agent.id,
        provider: defaultProvider,
        model: resolveOpenRouterModelAlias(approvedConfig.preferredModel.model),
        preferenceType: 'preferred',
        enabled: true,
      },
    });

    if (approvedConfig.fallbackModel) {
      await db.agentModelConfig.create({
        data: {
          agentId: agent.id,
          provider: approvedConfig.fallbackModel.provider || defaultProvider,
          model: resolveOpenRouterModelAlias(approvedConfig.fallbackModel.model),
          preferenceType: 'fallback',
          enabled: true,
        },
      });
    }

    // 6. Create runtime state
    await db.agentRuntimeState.create({
      data: {
        agentId: agent.id,
        status: 'idle',
        locationZone: approvedConfig.locationZone ?? 'meeting_room',
        currentActivity: 'Initialized — awaiting task assignment',
      },
    });

    // 7. Emit event
    await eventBus.emit(EventTypes.AGENT_TEMPORARY_CREATED, {
      agentId: agent.id,
      workspaceId,
      name: approvedConfig.name,
      role: approvedConfig.role,
      timestamp: Date.now(),
      source: 'temporary-agent-service',
    });

    // 8. Return the created agent with all sub-entities
    const fullAgent = await db.agent.findUnique({
      where: { id: agent.id },
      include: {
        profile: true,
        capabilities: true,
        permissions: true,
        modelConfigs: true,
        runtimeState: true,
      },
    });

    return fullAgent;
  }

  /**
   * Deactivate a temporary agent — set status to offline
   */
  async deactivateTemporaryAgent(agentId: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    // Update Agent status to offline
    await db.agent.update({
      where: { id: agentId },
      data: { status: 'offline' },
    });

    // Update RuntimeState
    await db.agentRuntimeState.upsert({
      where: { agentId },
      update: {
        status: 'offline',
        currentActivity: 'Deactivated',
        lastActivityAt: new Date(),
      },
      create: {
        agentId,
        status: 'offline',
        locationZone: agent.locationZone,
        currentActivity: 'Deactivated',
        lastActivityAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.AGENT_DEACTIVATED, {
      agentId,
      reason: 'Temporary agent deactivated',
      timestamp: Date.now(),
      source: 'temporary-agent-service',
    });
  }
}

export const temporaryAgentService = TemporaryAgentService.getInstance();
