// ─── Agent OS — Agent Runtime Service ────────────────────────
// Manages agent runtime state: status, location, active tasks.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { AgentStatus, OfficeZone } from '../types/domain';
import type { UpdateRuntimeStateInput } from './types';

// ─── Agent Runtime Service ───────────────────────────────────

class AgentRuntimeService {
  private static instance: AgentRuntimeService | null = null;

  private constructor() {}

  static getInstance(): AgentRuntimeService {
    if (!AgentRuntimeService.instance) {
      AgentRuntimeService.instance = new AgentRuntimeService();
    }
    return AgentRuntimeService.instance;
  }

  /**
   * Get or create runtime state for an agent
   */
  async getRuntimeState(agentId: string) {
    let runtimeState = await db.agentRuntimeState.findUnique({
      where: { agentId },
    });

    if (!runtimeState) {
      // Get agent to use its current status and zone
      const agent = await db.agent.findUnique({ where: { id: agentId } });
      if (!agent) throw new Error(`Agent not found: ${agentId}`);

      runtimeState = await db.agentRuntimeState.create({
        data: {
          agentId,
          status: agent.status,
          locationZone: agent.locationZone,
          activeTaskId: agent.activeTaskId,
          currentActivity: null,
          metadata: null,
        },
      });
    }

    return {
      ...runtimeState,
      metadata: runtimeState.metadata ? JSON.parse(runtimeState.metadata) : null,
    };
  }

  /**
   * Update agent status on both Agent and AgentRuntimeState, emit event
   */
  async updateAgentStatus(agentId: string, status: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const previousStatus = agent.status;

    // Update both Agent and AgentRuntimeState
    const [updatedAgent] = await Promise.all([
      db.agent.update({
        where: { id: agentId },
        data: { status },
      }),
      db.agentRuntimeState.upsert({
        where: { agentId },
        update: { status, lastActivityAt: new Date() },
        create: {
          agentId,
          status,
          locationZone: agent.locationZone,
          activeTaskId: agent.activeTaskId,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    await eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
      agentId,
      fromStatus: previousStatus as AgentStatus,
      toStatus: status as AgentStatus,
      timestamp: Date.now(),
      source: 'agent-runtime-service',
    });

    return updatedAgent;
  }

  /**
   * Update agent location on both Agent and AgentRuntimeState, emit event
   */
  async updateAgentLocation(agentId: string, locationZone: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const previousZone = agent.locationZone;

    const [updatedAgent] = await Promise.all([
      db.agent.update({
        where: { id: agentId },
        data: { locationZone },
      }),
      db.agentRuntimeState.upsert({
        where: { agentId },
        update: { locationZone, lastActivityAt: new Date() },
        create: {
          agentId,
          status: agent.status,
          locationZone,
          activeTaskId: agent.activeTaskId,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    await eventBus.emit(EventTypes.AGENT_LOCATION_CHANGED, {
      agentId,
      fromZone: previousZone as OfficeZone,
      toZone: locationZone as OfficeZone,
      timestamp: Date.now(),
      source: 'agent-runtime-service',
    });

    return updatedAgent;
  }

  /**
   * Assign an active task to an agent — sets activeTaskId, updates status to "working"
   */
  async assignActiveTask(agentId: string, taskId: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    // Update both Agent and AgentRuntimeState
    const [updatedAgent] = await Promise.all([
      db.agent.update({
        where: { id: agentId },
        data: {
          activeTaskId: taskId,
          status: 'working',
        },
      }),
      db.agentRuntimeState.upsert({
        where: { agentId },
        update: {
          activeTaskId: taskId,
          status: 'working',
          currentActivity: `Working on task: ${taskId}`,
          lastActivityAt: new Date(),
        },
        create: {
          agentId,
          status: 'working',
          locationZone: agent.locationZone,
          activeTaskId: taskId,
          currentActivity: `Working on task: ${taskId}`,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    await eventBus.emit(EventTypes.AGENT_TASK_ASSIGNED, {
      agentId,
      taskId,
      timestamp: Date.now(),
      source: 'agent-runtime-service',
    });

    return updatedAgent;
  }

  /**
   * Clear active task from agent — clears activeTaskId, sets status to "idle"
   */
  async clearActiveTask(agentId: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const previousTaskId = agent.activeTaskId;

    // Update both Agent and AgentRuntimeState
    const [updatedAgent] = await Promise.all([
      db.agent.update({
        where: { id: agentId },
        data: {
          activeTaskId: null,
          status: 'idle',
        },
      }),
      db.agentRuntimeState.upsert({
        where: { agentId },
        update: {
          activeTaskId: null,
          status: 'idle',
          currentActivity: null,
          lastActivityAt: new Date(),
        },
        create: {
          agentId,
          status: 'idle',
          locationZone: agent.locationZone,
          activeTaskId: null,
          currentActivity: null,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    await eventBus.emit(EventTypes.AGENT_TASK_CLEARED, {
      agentId,
      taskId: previousTaskId ?? '',
      timestamp: Date.now(),
      source: 'agent-runtime-service',
    });

    return updatedAgent;
  }

  /**
   * Update runtime state with arbitrary data
   */
  async updateRuntimeState(agentId: string, data: UpdateRuntimeStateInput) {
    const updateData: Record<string, unknown> = { lastActivityAt: new Date() };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.locationZone !== undefined) updateData.locationZone = data.locationZone;
    if (data.activeTaskId !== undefined) updateData.activeTaskId = data.activeTaskId;
    if (data.currentActivity !== undefined) updateData.currentActivity = data.currentActivity;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const runtimeState = await db.agentRuntimeState.upsert({
      where: { agentId },
      update: updateData,
      create: {
        agentId,
        status: data.status ?? 'offline',
        locationZone: data.locationZone ?? 'lounge_area',
        activeTaskId: data.activeTaskId ?? null,
        currentActivity: data.currentActivity ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return {
      ...runtimeState,
      metadata: runtimeState.metadata ? JSON.parse(runtimeState.metadata) : null,
    };
  }

  /**
   * Ensure all agents in workspace have runtime states
   */
  async ensureRuntimeStates(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: { workspaceId },
    });

    let created = 0;
    let skipped = 0;

    for (const agent of agents) {
      const existing = await db.agentRuntimeState.findUnique({
        where: { agentId: agent.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.agentRuntimeState.create({
        data: {
          agentId: agent.id,
          status: agent.status,
          locationZone: agent.locationZone,
          activeTaskId: agent.activeTaskId,
        },
      });
      created++;
    }

    return { created, skipped };
  }
}

export const agentRuntimeService = AgentRuntimeService.getInstance();
