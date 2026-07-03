// ─── Agent OS — Cost Tracking Skeleton ───────────────────────
// Tracks AI model usage costs per agent and task.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { CreateCostLogInput } from '../types/domain';

class CostTracker {
  private static instance: CostTracker | null = null;

  private constructor() {}

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  /**
   * Log a cost entry
   */
  async log(input: CreateCostLogInput) {
    const entry = await db.costLog.create({
      data: {
        agentId: input.agentId,
        taskId: input.taskId ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        tokensIn: input.tokensIn ?? 0,
        tokensOut: input.tokensOut ?? 0,
        cost: input.cost ?? 0,
      },
    });

    await eventBus.emit(EventTypes.COST_LOGGED, {
      costLogId: entry.id,
      agentId: input.agentId,
      taskId: input.taskId ?? undefined,
      provider: input.provider ?? undefined,
      model: input.model ?? undefined,
      cost: input.cost ?? 0,
      timestamp: Date.now(),
      source: 'cost-tracker',
    });

    return entry;
  }

  /**
   * Get cost logs for an agent
   */
  async getByAgent(agentId: string, limit = 50) {
    return db.costLog.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get cost logs for a task
   */
  async getByTask(taskId: string) {
    return db.costLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get total cost for an agent
   */
  async getTotalByAgent(agentId: string) {
    const result = await db.costLog.aggregate({
      where: { agentId },
      _sum: { cost: true, tokensIn: true, tokensOut: true },
      _count: true,
    });

    return {
      totalCost: result._sum.cost ?? 0,
      totalTokensIn: result._sum.tokensIn ?? 0,
      totalTokensOut: result._sum.tokensOut ?? 0,
      entryCount: result._count,
    };
  }

  /**
   * Get total cost for a workspace (all agents in workspace)
   */
  async getTotalByWorkspace(workspaceId: string) {
    const agents = await db.agent.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const agentIds = agents.map((a) => a.id);

    if (agentIds.length === 0) {
      return { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, entryCount: 0 };
    }

    const result = await db.costLog.aggregate({
      where: { agentId: { in: agentIds } },
      _sum: { cost: true, tokensIn: true, tokensOut: true },
      _count: true,
    });

    return {
      totalCost: result._sum.cost ?? 0,
      totalTokensIn: result._sum.tokensIn ?? 0,
      totalTokensOut: result._sum.tokensOut ?? 0,
      entryCount: result._count,
    };
  }

  /**
   * Get recent cost logs
   */
  async getRecent(limit = 50) {
    return db.costLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const costTracker = CostTracker.getInstance();
