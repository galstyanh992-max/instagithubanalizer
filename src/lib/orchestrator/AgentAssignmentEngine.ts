// ─── Agent OS — Agent Assignment Engine ──────────────────────
// Assigns tasks to agents based on keyword-to-role matching.
// Future: replace with semantic similarity or AI-based matching.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { createTaskContract, type CreateTaskContractInput } from './TaskContract';
import type { AgentAssignment } from './types';

// ─── Keyword → Role mapping ─────────────────────────────────

interface RoleKeywordMap {
  role: string;
  keywords: string[];
  priority: number; // higher = preferred when multiple match
}

const ROLE_KEYWORDS: RoleKeywordMap[] = [
  {
    role: 'frontend_engineer',
    keywords: [
      'frontend', 'front-end', 'ui', 'page', 'component', 'react', 'next.js',
      'css', 'tailwind', 'styled', 'layout', 'button', 'form', 'modal',
      'dialog', 'navigation', 'sidebar', 'menu', 'responsive', 'animation',
      'hover', 'click', 'input', 'table', 'chart', 'dashboard ui',
    ],
    priority: 10,
  },
  {
    role: 'designer',
    keywords: [
      'design', 'mockup', 'wireframe', 'figma', 'prototype', 'color',
      'typography', 'spacing', 'user experience', 'ux', 'accessibility',
      'icon', 'logo', 'brand', 'visual', 'theme', 'dark mode', 'layout',
    ],
    priority: 9,
  },
  {
    role: 'backend_engineer',
    keywords: [
      'backend', 'back-end', 'api', 'server', 'endpoint', 'rest', 'graphql',
      'route', 'controller', 'middleware', 'authentication', 'auth',
      'session', 'token', 'jwt', 'webhook', 'cron', 'queue', 'worker',
      'validation', 'business logic', 'service',
    ],
    priority: 10,
  },
  {
    role: 'data_engineer',
    keywords: [
      'database', 'db', 'schema', 'prisma', 'sql', 'migration', 'query',
      'index', 'table', 'model', 'orm', 'postgres', 'mysql', 'mongodb',
      'redis', 'cache', 'seed', 'data pipeline', 'etl', 'backup',
    ],
    priority: 10,
  },
  {
    role: 'qa_engineer',
    keywords: [
      'test', 'testing', 'qa', 'bug', 'regression', 'unit test', 'e2e',
      'integration test', 'coverage', 'assertion', 'mock', 'fixture',
      'ci', 'quality', 'validation', 'verification',
    ],
    priority: 10,
  },
  {
    role: 'devops_engineer',
    keywords: [
      'deploy', 'deployment', 'vercel', 'docker', 'container', 'kubernetes',
      'ci/cd', 'pipeline', 'github actions', 'server', 'infrastructure',
      'monitoring', 'logging', 'ssl', 'domain', 'dns', 'cdn', 'nginx',
      'caddy', 'production', 'staging', 'environment',
    ],
    priority: 10,
  },
  {
    role: 'researcher',
    keywords: [
      'research', 'docs', 'documentation', 'find', 'investigate',
      'compare', 'evaluate', 'benchmark', 'best practice', 'tutorial',
      'guide', 'reference', 'rag', 'vector', 'embedding', 'search',
      'ocr', 'pdf', 'document', 'translation', 'nlp', 'ai model',
      'llm', 'language model',
    ],
    priority: 8,
  },
  {
    role: 'architect',
    keywords: [
      'architecture', 'system', 'design pattern', 'microservice',
      'monorepo', 'scalability', 'performance', 'refactor', 'restructure',
      'migration plan', 'technical debt', 'dependency', 'module',
      'abstraction', 'interface', 'contract',
    ],
    priority: 9,
  },
  {
    role: 'analyst',
    keywords: [
      'requirement', 'specification', 'user story', 'acceptance criteria',
      'business', 'stakeholder', 'workflow', 'process', 'feature request',
      'roadmap', 'priority', 'scope',
    ],
    priority: 8,
  },
  {
    role: 'orchestrator',
    keywords: [
      'coordinate', 'orchestrate', 'manage', 'plan', 'strategy',
      'project', 'timeline', 'milestone', 'sprint',
    ],
    priority: 7,
  },
  {
    role: 'marketing_lead',
    keywords: [
      'marketing', 'gtm', 'go-to-market', 'launch plan', 'positioning',
      'product marketing', 'pmm', 'market strategy', 'launch strategy',
      'brand positioning', 'value proposition', 'launch coordination',
    ],
    priority: 9,
  },
  {
    role: 'market_researcher',
    keywords: [
      'market research', 'competitor analysis', 'icp', 'ideal customer',
      'persona', 'target audience', 'market size', 'tam', 'sam', 'som',
      'jtbd', 'jobs to be done', 'differentiation', 'competitive analysis',
      'market intelligence', 'audience segment',
    ],
    priority: 9,
  },
  {
    role: 'content_strategist',
    keywords: [
      'content', 'messaging', 'copywriting', 'landing page copy',
      'email copy', 'social media post', 'blog post', 'press release',
      'content plan', 'editorial calendar', 'brand voice', 'tone of voice',
      'content strategy', 'copy', 'headline', 'tagline', 'slogan',
    ],
    priority: 9,
  },
  {
    role: 'growth_manager',
    keywords: [
      'growth', 'acquisition', 'seo', 'sem', 'paid ads', 'campaign',
      'distribution', 'channel', 'funnel', 'conversion optimization',
      'a/b test', 'experiment', 'community', 'product hunt', 'launch day',
      'referral', 'viral', 'organic traffic', 'paid traffic',
    ],
    priority: 9,
  },
  {
    role: 'trend_analyst',
    keywords: [
      'trend', 'trending', 'viral', 'tiktok trend', 'instagram trend',
      'reels trend', 'shorts trend', 'hashtag', 'viral idea', 'hot topic',
      'google trends', 'social trend', 'what is trending',
      'popular content', 'viral format', 'content trend',
    ],
    priority: 9,
  },
  {
    role: 'copywriter',
    keywords: [
      'post text', 'caption', 'write post', 'telegram post', 'instagram caption',
      'cta', 'call to action', 'ad copy', 'email copy', 'whatsapp message',
      'story text', 'reel script', 'tiktok script', 'broadcast message',
      'newsletter', 'subject line', 'headline copy',
    ],
    priority: 9,
  },
  {
    role: 'visual_designer',
    keywords: [
      'banner', 'carousel', 'story cover', 'social graphic', 'visual',
      'image for post', 'instagram image', 'thumbnail', 'brand visual',
      'image generation', 'midjourney prompt', 'canva', 'design post',
      'stories template', 'visual asset',
    ],
    priority: 9,
  },
  {
    role: 'video_editor',
    keywords: [
      'reel', 'reels', 'short video', 'tiktok video', 'youtube short',
      'video edit', 'video script', 'hook video', 'subtitle', 'montage',
      'cut video', 'video production', 'shorts video', 'video content',
    ],
    priority: 9,
  },
  {
    role: 'publisher',
    keywords: [
      'publish', 'schedule post', 'posting schedule', 'auto post',
      'publication queue', 'content calendar execution', 'post timing',
      'when to post', 'schedule instagram', 'schedule telegram',
      'schedule tiktok', 'buffer', 'later', 'postiz',
    ],
    priority: 9,
  },
  {
    role: 'community_manager',
    keywords: [
      'comment reply', 'respond to comments', 'community reply',
      'instagram comment', 'telegram comment', 'react to comments',
      'manage comments', 'handle reactions', 'community management',
      'user complaint', 'negative comment', 'review response',
    ],
    priority: 9,
  },
  {
    role: 'messenger_support',
    keywords: [
      'dm reply', 'direct message', 'whatsapp', 'telegram dm',
      'instagram direct', 'messenger support', 'qualify lead',
      'incoming message', 'inbox reply', 'lead qualification',
      'collect contact', 'book appointment dm', 'messenger bot',
    ],
    priority: 9,
  },
  {
    role: 'sales_agent',
    keywords: [
      'close deal', 'inbound lead', 'sales follow up', 'lead conversion',
      'offer service', 'sales pitch', 'handle objection', 'proposal',
      'consultation booking', 'sales script', 'convert lead',
      'move to sale', 'lead to payment',
    ],
    priority: 9,
  },
  {
    role: 'brand_guardian',
    keywords: [
      'brand review', 'check tone of voice', 'brand consistency',
      'approve content', 'brand guidelines', 'content review',
      'visual consistency', 'brand audit', 'tone check', 'logo usage',
      'content approval', 'brand compliance',
    ],
    priority: 9,
  },
  {
    role: 'marketing_analyst',
    keywords: [
      'analytics', 'kpi', 'metrics', 'dashboard', 'reporting',
      'conversion rate', 'cac', 'ltv', 'roi', 'engagement rate',
      'market feedback', 'user feedback', 'sentiment analysis',
      'campaign performance', 'measurement', 'tracking',
    ],
    priority: 9,
  },
];

class AgentAssignmentEngine {
  private static instance: AgentAssignmentEngine | null = null;

  private constructor() {}

  static getInstance(): AgentAssignmentEngine {
    if (!AgentAssignmentEngine.instance) {
      AgentAssignmentEngine.instance = new AgentAssignmentEngine();
    }
    return AgentAssignmentEngine.instance;
  }

  /**
   * Find the best agent assignment for a task description
   */
  async findAssignment(
    taskTitle: string,
    taskDescription: string,
    workspaceId: string
  ): Promise<AgentAssignment> {
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();

    // Score each role by keyword matches
    const scored = ROLE_KEYWORDS.map((mapping) => {
      const matchedKeywords = mapping.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );
      const score = matchedKeywords.length * mapping.priority;
      return {
        role: mapping.role,
        score,
        matchedKeywords,
        priority: mapping.priority,
      };
    }).filter((s) => s.score > 0);

    // Sort by score descending, then by priority descending
    scored.sort((a, b) => b.score - a.score || b.priority - a.priority);

    // Get the best match
    const bestMatch = scored[0];

    if (!bestMatch) {
      // No keyword match — assign to orchestrator as default
      const orchestrator = await this.findAgentInWorkspace('orchestrator', workspaceId);
      return {
        agentRole: 'orchestrator',
        agentId: orchestrator?.id,
        agentName: orchestrator?.name,
        confidence: 0.3,
        reason: 'No specific keyword match found — defaulting to Orchestrator for triage',
        isTemporary: false,
      };
    }

    // Try to find a permanent agent with this role in the workspace
    const agent = await this.findAgentInWorkspace(bestMatch.role, workspaceId);

    const confidence = Math.min(bestMatch.score / 30, 1.0);
    const isTemporary = !agent;

    const assignment = {
      agentRole: bestMatch.role,
      agentId: agent?.id,
      agentName: agent?.name,
      confidence,
      reason: isTemporary
        ? `Matched role "${bestMatch.role}" by keywords: ${bestMatch.matchedKeywords.join(', ')}. No permanent agent found — recommend creating a temporary specialist.`
        : `Matched to ${agent!.name} by keywords: ${bestMatch.matchedKeywords.join(', ')}`,
      isTemporary,
    };

    // Emit routing decision event (non-blocking)
    eventBus.emit(EventTypes.TASK_ROUTING_DECIDED, {
      workspaceId,
      timestamp: Date.now(),
      source: 'agent-assignment-engine',
      contractId: '',  // Caller sets contractId after contract creation
      agentRole: assignment.agentRole,
      agentId: assignment.agentId,
      confidence,
      reason: assignment.reason,
      isLowConfidence: confidence < 0.5,
    }).catch(() => {});  // Non-fatal

    return assignment;
  }

  /**
   * Build a TaskContract from an assignment result.
   * Merges routing confidence into the contract.
   */
  buildContract(
    input: Omit<CreateTaskContractInput, 'assignedAgentRole' | 'assignedDepartment'>,
    assignment: AgentAssignment,
    department: string
  ) {
    const contract = createTaskContract({
      ...input,
      assignedAgentRole: assignment.agentRole,
      assignedDepartment: department,
    });
    contract.routingConfidence = assignment.confidence;

    // Emit contract created event (non-blocking)
    eventBus.emit(EventTypes.TASK_CONTRACT_CREATED, {
      workspaceId: input.workspaceId,
      timestamp: Date.now(),
      source: 'agent-assignment-engine',
      contractId: contract.id,
      goal: contract.goal,
      assignedAgentRole: contract.assignedAgentRole,
      assignedDepartment: contract.assignedDepartment,
      riskLevel: contract.riskLevel,
      approvalRequired: contract.approvalRequired,
      routingConfidence: contract.routingConfidence,
    }).catch(() => {});

    return contract;
  }

  /**
   * Find all suitable agents for a task (returns ranked list)
   */
  async findAllAssignments(
    taskTitle: string,
    taskDescription: string,
    workspaceId: string
  ): Promise<AgentAssignment[]> {
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();

    const scored = ROLE_KEYWORDS.map((mapping) => {
      const matchedKeywords = mapping.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );
      const score = matchedKeywords.length * mapping.priority;
      return { role: mapping.role, score, matchedKeywords };
    }).filter((s) => s.score > 0);

    scored.sort((a, b) => b.score - a.score);

    const assignments: AgentAssignment[] = [];
    for (const match of scored.slice(0, 3)) {
      const agent = await this.findAgentInWorkspace(match.role, workspaceId);
      const confidence = Math.min(match.score / 30, 1.0);
      assignments.push({
        agentRole: match.role,
        agentId: agent?.id,
        agentName: agent?.name,
        confidence,
        reason: `Matched by keywords: ${match.matchedKeywords.join(', ')}`,
        isTemporary: !agent,
      });
    }

    return assignments;
  }

  /**
   * Find an agent by role in a workspace
   */
  private async findAgentInWorkspace(role: string, workspaceId: string) {
    return db.agent.findFirst({
      where: { role, workspaceId, type: 'permanent' },
    });
  }

  /**
   * Get all available role keywords (for debugging/display)
   */
  getRoleKeywords(): RoleKeywordMap[] {
    return [...ROLE_KEYWORDS];
  }
}

export const agentAssignmentEngine = AgentAssignmentEngine.getInstance();
