// ─── Agent OS — Memory System Skeleton ───────────────────────
// Scoped memory storage for context, decisions, and knowledge.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { MemoryScope, MemoryType } from '../types/domain';
import type { CreateMemoryInput } from '../types/domain';

class MemorySystem {
  private static instance: MemorySystem | null = null;

  private constructor() {}

  static getInstance(): MemorySystem {
    if (!MemorySystem.instance) {
      MemorySystem.instance = new MemorySystem();
    }
    return MemorySystem.instance;
  }

  /**
   * Store a new memory item
   */
  async store(input: CreateMemoryInput) {
    const item = await db.memoryItem.create({
      data: {
        scope: (input.scope ?? 'workspace') as import('../types/domain').MemoryScope,
        scopeId: input.scopeId ?? null,
        type: input.type,
        content: input.content,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    await eventBus.emit(EventTypes.MEMORY_CREATED, {
      memoryId: item.id,
      scope: (input.scope ?? 'workspace') as import('../types/domain').MemoryScope,
      type: input.type,
      timestamp: Date.now(),
      source: 'memory-system',
    });

    return {
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    };
  }

  /**
   * Retrieve memories by scope
   */
  async getByScope(scope: MemoryScope, scopeId?: string, limit = 50) {
    const items = await db.memoryItem.findMany({
      where: {
        scope,
        ...(scopeId ? { scopeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));
  }

  /**
   * Retrieve memories by type within a scope
   */
  async getByType(scope: MemoryScope, type: MemoryType, scopeId?: string, limit = 50) {
    const items = await db.memoryItem.findMany({
      where: {
        scope,
        type,
        ...(scopeId ? { scopeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));
  }

  /**
   * Search memories by content (simple LIKE search)
   * Future: replace with vector search / RAG
   */
  async search(query: string, scope?: MemoryScope, scopeId?: string, limit = 20) {
    const items = await db.memoryItem.findMany({
      where: {
        content: { contains: query },
        ...(scope ? { scope } : {}),
        ...(scopeId ? { scopeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));
  }

  /**
   * Get a single memory item
   */
  async get(memoryId: string) {
    const item = await db.memoryItem.findUnique({ where: { id: memoryId } });
    if (!item) return null;

    return {
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    };
  }

  /**
   * Delete a memory item
   */
  async delete(memoryId: string) {
    return db.memoryItem.delete({ where: { id: memoryId } });
  }

  /**
   * Get recent memories across all scopes
   */
  async getRecent(limit = 50) {
    const items = await db.memoryItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));
  }
}

export const memorySystem = MemorySystem.getInstance();

// ─── Extended Memory Services ─────────────────────────────────
export { sharedMemoryService, type MemoryItemInput, type RecallOptions, type MemoryUpdatePatch, type ProjectSummary } from './SharedMemoryService';
export { memoryRouter } from './MemoryRouter';
export { rlmAgentMemoryRepository } from './RlmAgentMemoryRepository';
export type { RlmTrajectoryInput, RlmTrajectoryStep, RlmCompactionInput } from './RlmAgentMemoryRepository';
