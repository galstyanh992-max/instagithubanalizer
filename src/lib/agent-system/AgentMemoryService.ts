// ─── Agent OS — Agent Memory Service ─────────────────────────
// Manages links between agents and memory items (relevance-scoped recall).

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';

// ─── Agent Memory Service ────────────────────────────────────

class AgentMemoryService {
  private static instance: AgentMemoryService | null = null;

  private constructor() {}

  static getInstance(): AgentMemoryService {
    if (!AgentMemoryService.instance) {
      AgentMemoryService.instance = new AgentMemoryService();
    }
    return AgentMemoryService.instance;
  }

  /**
   * Link a memory item to an agent with a relevance score
   */
  async linkMemoryToAgent(agentId: string, memoryItemId: string, relevance: number = 1.0) {
    const link = await db.agentMemoryLink.upsert({
      where: {
        agentId_memoryItemId: {
          agentId,
          memoryItemId,
        },
      },
      update: {
        relevance,
      },
      create: {
        agentId,
        memoryItemId,
        relevance,
      },
    });

    await eventBus.emit(EventTypes.AGENT_MEMORY_LINKED, {
      agentId,
      memoryItemId,
      relevance,
      timestamp: Date.now(),
      source: 'agent-memory-service',
    });

    return link;
  }

  /**
   * Get all memory items linked to an agent, including relevance scores
   */
  async getAgentMemory(agentId: string) {
    const links = await db.agentMemoryLink.findMany({
      where: { agentId },
      include: {
        memoryItem: true,
      },
      orderBy: { relevance: 'desc' },
    });

    return links.map((link) => ({
      ...link,
      memoryItem: {
        ...link.memoryItem,
        metadata: link.memoryItem.metadata ? JSON.parse(link.memoryItem.metadata) : null,
      },
    }));
  }

  /**
   * Unlink a memory item from an agent
   */
  async unlinkMemory(agentId: string, memoryItemId: string) {
    await db.agentMemoryLink.deleteMany({
      where: {
        agentId,
        memoryItemId,
      },
    });

    await eventBus.emit(EventTypes.AGENT_MEMORY_UNLINKED, {
      agentId,
      memoryItemId,
      timestamp: Date.now(),
      source: 'agent-memory-service',
    });
  }
}

export const agentMemoryService = AgentMemoryService.getInstance();
