// ─── Agent OS — SharedMemoryService ──────────────────────────
// Persistent shared memory layer for agents and Orchestrator.
// Enforces: deduplication, visibility scoping, content limits, no secrets.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { MemoryType, MemoryImportance, MemoryVisibility, CreateMemoryInput } from '../types/domain';

// ── Safety constraints ────────────────────────────────────────

const MAX_CONTENT_LENGTH = 8_000;   // ~2k tokens
const MAX_TITLE_LENGTH   = 200;
const MAX_TAGS           = 10;

// Secret patterns — never store these
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-or-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /DATABASE_URL\s*=\s*\S+/g,
  /password\s*[:=]\s*["']?\S{4,}/gi,
  /-----BEGIN\s+(RSA|EC|PRIVATE)\s+KEY-----/g,
];

function containsSecret(text: string): boolean {
  return SECRET_PATTERNS.some(p => { p.lastIndex = 0; const r = p.test(text); p.lastIndex = 0; return r; });
}

// ── Public types ──────────────────────────────────────────────

export interface MemoryItemInput {
  workspaceId: string;
  projectId?: string;
  agentId?: string;
  type: MemoryType;
  title: string;
  content: string;
  tags?: string[];
  importance?: MemoryImportance;
  confidence?: number;         // 0–1
  visibility?: MemoryVisibility;
  metadata?: Record<string, unknown>;
}

export interface RecallOptions {
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  types?: MemoryType[];
  importance?: MemoryImportance[];
  visibility?: MemoryVisibility[];
  tags?: string[];
  limit?: number;
}

export interface MemoryUpdatePatch {
  title?: string;
  content?: string;
  tags?: string[];
  importance?: MemoryImportance;
  confidence?: number;
  visibility?: MemoryVisibility;
  metadata?: Record<string, unknown>;
}

export interface ProjectSummary {
  projectId: string;
  totalItems: number;
  byType: Record<string, number>;
  keyDecisions: Array<{ id: string; title: string; content: string }>;
  keyFacts: Array<{ id: string; title: string; content: string }>;
  risks: Array<{ id: string; title: string; content: string }>;
  recentItems: Array<{ id: string; type: string; title: string; createdAt: Date }>;
}

// ── Internal DB item mapper ───────────────────────────────────

function parseItem(raw: {
  id: string; scope: string; scopeId: string | null; workspaceId: string | null;
  projectId: string | null; agentId: string | null; type: string; title: string;
  content: string; tags: string; importance: string; confidence: number;
  visibility: string; conflictIds: string; metadata: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId ?? raw.scopeId ?? null,
    projectId: raw.projectId,
    agentId: raw.agentId,
    type: raw.type,
    title: raw.title,
    content: raw.content,
    tags: (() => { try { return JSON.parse(raw.tags) as string[]; } catch { return []; } })(),
    importance: raw.importance,
    confidence: raw.confidence,
    visibility: raw.visibility,
    conflictIds: (() => { try { return JSON.parse(raw.conflictIds) as string[]; } catch { return []; } })(),
    metadata: raw.metadata ? (() => { try { return JSON.parse(raw.metadata!) as Record<string,unknown>; } catch { return null; } })() : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Service ───────────────────────────────────────────────────

class SharedMemoryService {
  private static instance: SharedMemoryService | null = null;

  private constructor() {}

  static getInstance(): SharedMemoryService {
    if (!SharedMemoryService.instance) {
      SharedMemoryService.instance = new SharedMemoryService();
    }
    return SharedMemoryService.instance;
  }

  /**
   * Store a new memory item (or update duplicate).
   * Checks for secrets, enforces size limits, detects conflicts.
   */
  async remember(input: MemoryItemInput) {
    // ── Safety checks ─────────────────────────────────────────
    if (containsSecret(input.content) || containsSecret(input.title)) {
      throw new Error('Memory rejected: content contains a secret or credential');
    }
    if (input.metadata && containsSecret(JSON.stringify(input.metadata))) {
      throw new Error('Memory rejected: metadata contains a secret or credential');
    }

    const content = input.content.slice(0, MAX_CONTENT_LENGTH);
    const title   = input.title.slice(0, MAX_TITLE_LENGTH);
    const tags    = (input.tags ?? []).slice(0, MAX_TAGS);
    const metadata = input.metadata ? JSON.stringify(input.metadata) : undefined;

    // ── Conflict detection ────────────────────────────────────
    const existing = await this.findDuplicate(input.workspaceId, title, input.type);

    if (existing) {
      // Update the existing item instead of creating a duplicate
      const updated = await db.memoryItem.update({
        where: { id: existing.id },
        data: {
          content,
          tags: JSON.stringify(tags),
          importance: input.importance ?? existing.importance,
          confidence: input.confidence ?? existing.confidence,
          ...(metadata !== undefined ? { metadata } : {}),
          updatedAt: new Date(),
        },
      });

      await this.emitEvent(EventTypes.MEMORY_UPDATED, {
        memoryId: updated.id,
        workspaceId: input.workspaceId,
        type: updated.type,
        title: updated.title,
      });

      return { item: parseItem(updated as Parameters<typeof parseItem>[0]), updated: true, conflict: false };
    }

    // ── Near-duplicate detection (same type + similar title) ──
    const nearDuplicates = await this.findNearDuplicates(input.workspaceId, title, input.type);

    // ── Create new item ───────────────────────────────────────
    const item = await db.memoryItem.create({
      data: {
        scope: input.visibility === 'global' ? 'global' : 'workspace',
        scopeId: input.workspaceId,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        agentId: input.agentId ?? null,
        type: input.type,
        title,
        content,
        tags: JSON.stringify(tags),
        importance: input.importance ?? 'medium',
        confidence: input.confidence ?? 0.8,
        visibility: input.visibility ?? 'workspace',
        conflictIds: JSON.stringify(nearDuplicates.map(d => d.id)),
        metadata,
      },
    });

    await eventBus.emit(EventTypes.MEMORY_CREATED, {
      memoryId: item.id,
      scope: (item.scope ?? 'workspace') as 'global' | 'workspace' | 'project' | 'agent' | 'task',
      type: item.type,
      timestamp: Date.now(),
      source: 'shared-memory-service',
    });

    if (nearDuplicates.length > 0) {
      await this.emitEvent(EventTypes.MEMORY_CONFLICT, {
        newItemId: item.id,
        conflictingItemId: nearDuplicates[0].id,
        workspaceId: input.workspaceId,
        type: item.type,
        title,
      });
    }

    return { item: parseItem(item as Parameters<typeof parseItem>[0]), updated: false, conflict: nearDuplicates.length > 0 };
  }

  /**
   * Retrieve relevant memories by query + filters.
   * Respects visibility scoping.
   */
  async recall(query: string, options: RecallOptions = {}) {
    const limit = Math.min(options.limit ?? 20, 100);
    const where: Record<string, unknown> = {};
    const andFilters: Record<string, unknown>[] = [];

    // Visibility filter: agent_private items only visible to their creator
    if (options.agentId) {
      andFilters.push({ OR: [
        { visibility: { in: ['global', 'workspace'] } },
        { visibility: 'agent_private', agentId: options.agentId },
      ] });
    } else {
      andFilters.push({ visibility: { in: ['global', 'workspace'] } });
    }

    if (options.workspaceId) where['workspaceId'] = options.workspaceId;
    if (options.projectId)   where['projectId']   = options.projectId;
    if (options.types?.length) where['type'] = { in: options.types };
    if (options.importance?.length) where['importance'] = { in: options.importance };
    if (options.tags?.length) {
      andFilters.push({
        OR: options.tags.map((tag) => ({ tags: { contains: tag } })),
      });
    }

    // Text search across title + content
    if (query.trim()) {
      andFilters.push({ OR: [
        { title:   { contains: query } },
        { content: { contains: query } },
        { tags:    { contains: query } },
      ] });
    }

    if (andFilters.length > 0) {
      where['AND'] = andFilters;
    }

    const items = await db.memoryItem.findMany({
      where,
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return items.map(i => parseItem(i as Parameters<typeof parseItem>[0]));
  }

  /**
   * Update a memory item (title, content, tags, importance, visibility).
   */
  async update(id: string, patch: MemoryUpdatePatch, requestingAgentId?: string) {
    const existing = await db.memoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error(`Memory item ${id} not found`);

    // Visibility check: agent_private items only editable by creator
    if (existing.visibility === 'agent_private' && existing.agentId && existing.agentId !== requestingAgentId) {
      throw new Error('Cannot update agent_private memory item owned by another agent');
    }

    if (patch.content && containsSecret(patch.content)) {
      throw new Error('Update rejected: content contains a secret');
    }
    if (patch.metadata && containsSecret(JSON.stringify(patch.metadata))) {
      throw new Error('Update rejected: metadata contains a secret');
    }

    const updated = await db.memoryItem.update({
      where: { id },
      data: {
        ...(patch.title   ? { title:   patch.title.slice(0, MAX_TITLE_LENGTH)   } : {}),
        ...(patch.content ? { content: patch.content.slice(0, MAX_CONTENT_LENGTH) } : {}),
        ...(patch.tags    ? { tags:    JSON.stringify(patch.tags.slice(0, MAX_TAGS)) } : {}),
        ...(patch.importance ? { importance: patch.importance } : {}),
        ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
        ...(patch.visibility ? { visibility: patch.visibility } : {}),
        ...(patch.metadata ? { metadata: JSON.stringify(patch.metadata) } : {}),
      },
    });

    await this.emitEvent(EventTypes.MEMORY_UPDATED, {
      memoryId: updated.id,
      workspaceId: updated.workspaceId ?? undefined,
      type: updated.type,
      title: updated.title,
    });

    return parseItem(updated as Parameters<typeof parseItem>[0]);
  }

  /**
   * Delete a memory item.
   */
  async forget(id: string, requestingAgentId?: string) {
    const existing = await db.memoryItem.findUnique({ where: { id } });
    if (!existing) return;

    if (existing.visibility === 'agent_private' && existing.agentId && existing.agentId !== requestingAgentId) {
      throw new Error('Cannot delete agent_private memory item owned by another agent');
    }

    await db.memoryItem.delete({ where: { id } });

    await this.emitEvent(EventTypes.MEMORY_REMOVED, {
      memoryId: id,
      workspaceId: existing.workspaceId ?? undefined,
      type: existing.type,
    });
  }

  /**
   * Summarize all memory for a project — key decisions, facts, risks.
   */
  async summarizeProject(projectId: string): Promise<ProjectSummary> {
    const all = await db.memoryItem.findMany({
      where: { projectId },
      orderBy: { importance: 'desc' },
    });

    const byType: Record<string, number> = {};
    all.forEach(i => { byType[i.type] = (byType[i.type] ?? 0) + 1; });

    const pick = (type: string) => all
      .filter(i => i.type === type)
      .slice(0, 3)
      .map(i => ({ id: i.id, title: i.title, content: i.content.slice(0, 200) }));

    return {
      projectId,
      totalItems: all.length,
      byType,
      keyDecisions: pick('decision'),
      keyFacts: pick('fact'),
      risks: pick('risk'),
      recentItems: all.slice(0, 10).map(i => ({
        id: i.id, type: i.type, title: i.title, createdAt: i.createdAt
      })),
    };
  }

  /**
   * Build a context string from recalled memories for injection into agent prompts.
   * Used by OrchestratorChatEngine before task delegation.
   */
  async buildContextString(query: string, options: RecallOptions): Promise<string> {
    const items = await this.recall(query, { ...options, limit: 8 });
    if (items.length === 0) return '';

    const lines = items.map(i =>
      `[${i.type.toUpperCase()}] ${i.title}: ${i.content.slice(0, 300)}`
    );

    return `\n\n--- Relevant Memory Context ---\n${lines.join('\n')}\n---`;
  }

  // ── Private helpers ───────────────────────────────────────

  private async findDuplicate(workspaceId: string, title: string, type: string) {
    return db.memoryItem.findFirst({
      where: {
        workspaceId,
        type,
        title: { equals: title },
      },
    });
  }

  private async findNearDuplicates(workspaceId: string, title: string, type: string) {
    // Find items with same type where title contains significant overlap
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    if (words.length === 0) return [];

    const candidates = await db.memoryItem.findMany({
      where: { workspaceId, type },
      take: 50,
    });

    return candidates.filter(item => {
      const itemTitle = item.title.toLowerCase();
      const matchCount = words.filter(w => itemTitle.includes(w)).length;
      return matchCount >= Math.ceil(words.length * 0.6) && item.title !== title;
    }).slice(0, 3);
  }

  private async emitEvent(eventType: typeof EventTypes[keyof typeof EventTypes], payload: Record<string, unknown>) {
    try {
      await eventBus.emit(
        eventType as import('../types/events').EventType,
        { timestamp: Date.now(), source: 'shared-memory-service', ...payload } as unknown as import('../types/events').EventMap[import('../types/events').EventType]
      );
    } catch {}
  }
}

export const sharedMemoryService = SharedMemoryService.getInstance();
