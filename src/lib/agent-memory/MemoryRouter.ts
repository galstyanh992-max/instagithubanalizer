// ─── Agent OS — MemoryRouter ──────────────────────────────────
// Decides when and what to save from agent task results.
// Called by Orchestrator after task completion.

import type { MemoryType, MemoryImportance, MemoryVisibility } from '../types/domain';
import type { MemoryItemInput } from './SharedMemoryService';

// ── Result classification rules ───────────────────────────────

interface ClassificationRule {
  /** Match against result content (case-insensitive) */
  signals: string[];
  type: MemoryType;
  importance: MemoryImportance;
  visibility: MemoryVisibility;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    signals: ['architecture', 'design pattern', 'tech stack', 'framework choice', 'we chose', 'we decided'],
    type: 'architecture',
    importance: 'high',
    visibility: 'workspace',
  },
  {
    signals: ['bug', 'fixed', 'regression', 'root cause', 'the issue was', 'the fix is'],
    type: 'bug',
    importance: 'medium',
    visibility: 'workspace',
  },
  {
    signals: ['brand voice', 'tone of voice', 'brand rule', 'messaging guideline', 'do not use', 'always say'],
    type: 'brand_rule',
    importance: 'high',
    visibility: 'workspace',
  },
  {
    signals: ['risk', 'security concern', 'vulnerability', 'threat', 'dangerous'],
    type: 'risk',
    importance: 'high',
    visibility: 'workspace',
  },
  {
    signals: ['user preference', 'the client prefers', 'the user wants', 'persona'],
    type: 'user_preference',
    importance: 'medium',
    visibility: 'workspace',
  },
  {
    signals: ['lead', 'prospect', 'follow up', 'opportunity', 'qualification'],
    type: 'lead_note',
    importance: 'medium',
    visibility: 'workspace',
  },
  {
    signals: ['decision', 'we agreed', 'final decision', 'approved', 'resolved to'],
    type: 'decision',
    importance: 'high',
    visibility: 'workspace',
  },
  {
    signals: ['completed', 'task result', 'output:', 'deliverable', 'produced'],
    type: 'task_result',
    importance: 'medium',
    visibility: 'workspace',
  },
  {
    signals: ['fact', 'the data shows', 'according to', 'research found', 'statistic'],
    type: 'fact',
    importance: 'medium',
    visibility: 'workspace',
  },
  {
    signals: ['workflow', 'process', 'step by step', 'procedure', 'how to'],
    type: 'workflow_note',
    importance: 'low',
    visibility: 'workspace',
  },
  {
    signals: ['file', 'path:', 'src/', 'located at', 'the file is'],
    type: 'file_reference',
    importance: 'low',
    visibility: 'workspace',
  },
];

// ── Minimum content thresholds ────────────────────────────────

const MIN_CONTENT_LENGTH = 50;    // Too short to be worth storing
const MAX_CONTENT_STORE  = 4_000; // Trim at 4k chars before storing

// ── MemoryRouter class ────────────────────────────────────────

class MemoryRouter {
  private static instance: MemoryRouter | null = null;

  private constructor() {}

  static getInstance(): MemoryRouter {
    if (!MemoryRouter.instance) MemoryRouter.instance = new MemoryRouter();
    return MemoryRouter.instance;
  }

  /**
   * Decide if a task result is worth storing in shared memory.
   */
  shouldRemember(taskResult: {
    content: string;
    agentRole?: string;
    success?: boolean;
    type?: string;
  }): boolean {
    const text = taskResult.content ?? '';

    // Don't store failures, empty results, or trivial content
    if (!taskResult.success && taskResult.type !== 'bug') return false;
    if (text.length < MIN_CONTENT_LENGTH) return false;

    // Always remember architecture, decisions, brand rules, bugs, risks
    const alwaysTypes = ['architecture', 'decision', 'brand_rule', 'risk', 'bug'];
    const lowerText = text.toLowerCase();

    for (const rule of CLASSIFICATION_RULES) {
      if (alwaysTypes.includes(rule.type)) {
        if (rule.signals.some(s => lowerText.includes(s))) return true;
      }
    }

    // For other types, only remember high-value content
    const highValueSignals = [
      'important', 'critical', 'remember', 'key insight',
      'lesson learned', 'do not', 'always', 'never',
    ];
    return highValueSignals.some(s => lowerText.includes(s));
  }

  /**
   * Categorize a task result into a structured memory item.
   * Returns null if content is not worth storing.
   */
  categorizeMemory(taskResult: {
    content: string;
    agentRole?: string;
    agentId?: string;
    workspaceId: string;
    projectId?: string;
    success?: boolean;
  }): Omit<MemoryItemInput, 'workspaceId'> & { workspaceId: string } | null {

    const text = taskResult.content ?? '';
    if (text.length < MIN_CONTENT_LENGTH) return null;

    const lowerText = text.toLowerCase();

    // Score each rule
    const scores = CLASSIFICATION_RULES.map(rule => {
      const matchCount = rule.signals.filter(s => lowerText.includes(s)).length;
      return { rule, matchCount };
    }).filter(s => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    const bestMatch = scores[0];
    const { type, importance, visibility } = bestMatch?.rule ?? {
      type: 'task_result' as MemoryType,
      importance: 'low' as MemoryImportance,
      visibility: 'workspace' as MemoryVisibility,
    };

    // Generate a title from the first meaningful sentence
    const title = this.extractTitle(text, type);
    const content = text.slice(0, MAX_CONTENT_STORE);
    const tags = this.extractTags(text, taskResult.agentRole, type);

    return {
      workspaceId: taskResult.workspaceId,
      projectId: taskResult.projectId,
      agentId: taskResult.agentId,
      type,
      title,
      content,
      tags,
      importance,
      visibility,
      confidence: bestMatch ? Math.min(0.5 + bestMatch.matchCount * 0.1, 0.95) : 0.6,
    };
  }

  /**
   * Build a memory item for an explicit decision.
   */
  categorizeDecision(decision: {
    title: string;
    rationale: string;
    workspaceId: string;
    projectId?: string;
    agentId?: string;
    agentRole?: string;
  }): MemoryItemInput {
    return {
      workspaceId: decision.workspaceId,
      projectId: decision.projectId,
      agentId: decision.agentId,
      type: 'decision',
      title: decision.title.slice(0, 200),
      content: decision.rationale.slice(0, MAX_CONTENT_STORE),
      tags: ['decision', decision.agentRole ?? 'orchestrator'],
      importance: 'high',
      visibility: 'workspace',
      confidence: 0.9,
    };
  }

  /**
   * Build a memory item for a brand rule from marketing output.
   */
  categorizeBrandRule(rule: {
    title: string;
    content: string;
    workspaceId: string;
    agentId?: string;
  }): MemoryItemInput {
    return {
      workspaceId: rule.workspaceId,
      agentId: rule.agentId,
      type: 'brand_rule',
      title: rule.title.slice(0, 200),
      content: rule.content.slice(0, MAX_CONTENT_STORE),
      tags: ['brand', 'marketing', 'guideline'],
      importance: 'high',
      visibility: 'workspace',
      confidence: 0.9,
    };
  }

  // ── Private helpers ───────────────────────────────────────

  private extractTitle(text: string, type: MemoryType): string {
    // Try to find the first sentence that's a good title
    const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 10);
    const first = sentences[0] ?? text.slice(0, 80);

    // Prefix with type for clarity
    const typeLabel: Record<string, string> = {
      decision: 'Decision:',
      architecture: 'Architecture:',
      bug: 'Bug:',
      brand_rule: 'Brand Rule:',
      risk: 'Risk:',
      fact: 'Fact:',
    };

    const prefix = typeLabel[type] ?? '';
    const cleaned = first.replace(/^[-*•]\s*/, '').slice(0, 180);
    return prefix ? `${prefix} ${cleaned}` : cleaned;
  }

  private extractTags(text: string, agentRole?: string, type?: MemoryType): string[] {
    const tags: string[] = [];

    if (agentRole) tags.push(agentRole.replace(/_/g, '-'));
    if (type) tags.push(type.replace(/_/g, '-'));

    // Extract hashtags
    const hashtags = text.match(/#[a-zA-Z]\w+/g) ?? [];
    hashtags.slice(0, 3).forEach(t => tags.push(t.slice(1).toLowerCase()));

    // Common keyword extraction
    const keywords = [
      'react', 'nextjs', 'typescript', 'api', 'database', 'auth',
      'performance', 'security', 'design', 'content', 'seo', 'marketing',
    ];
    keywords.forEach(kw => {
      if (text.toLowerCase().includes(kw)) tags.push(kw);
    });

    return [...new Set(tags)].slice(0, 10);
  }
}

export const memoryRouter = MemoryRouter.getInstance();
