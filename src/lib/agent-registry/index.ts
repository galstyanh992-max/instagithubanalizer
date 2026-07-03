// ─── Agent OS — Agent Registry ───────────────────────────────
// Manages agent registration, discovery, and status updates.

import { db } from '../db';
import { DEFAULT_AGENTS } from './defaults';
import { EventTypes } from '../types/events';
import { eventBus } from '../event-bus';
import type { AgentStatus, OfficeZone } from '../types/domain';
import type { DefaultAgentConfig } from '../types/agents';

// ─── Agent Registry ──────────────────────────────────────────

class AgentRegistry {
  private static instance: AgentRegistry | null = null;

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Get all agents in a workspace
   */
  async getAgents(workspaceId?: string) {
    return db.agent.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single agent by ID
   */
  async getAgent(agentId: string) {
    return db.agent.findUnique({
      where: { id: agentId },
    });
  }

  /**
   * Get agents by role
   */
  async getAgentsByRole(role: string, workspaceId?: string) {
    return db.agent.findMany({
      where: {
        role,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
  }

  /**
   * Get agents by status
   */
  async getAgentsByStatus(status: AgentStatus, workspaceId?: string) {
    return db.agent.findMany({
      where: {
        status,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
  }

  /**
   * Get agents in a specific office zone
   */
  async getAgentsByZone(zone: OfficeZone, workspaceId?: string) {
    return db.agent.findMany({
      where: {
        locationZone: zone,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
  }

  /**
   * Update agent status and emit event
   */
  async updateAgentStatus(agentId: string, newStatus: AgentStatus) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const previousStatus = agent.status as AgentStatus;
    const updated = await db.agent.update({
      where: { id: agentId },
      data: { status: newStatus },
    });

    await eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
      agentId,
      fromStatus: previousStatus,
      toStatus: newStatus,
      timestamp: Date.now(),
      source: 'agent-registry',
    });

    return updated;
  }

  /**
   * Move agent to a new office zone and emit event
   */
  async moveAgentToZone(agentId: string, newZone: OfficeZone) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const previousZone = agent.locationZone as OfficeZone;
    const updated = await db.agent.update({
      where: { id: agentId },
      data: { locationZone: newZone },
    });

    await eventBus.emit(EventTypes.AGENT_LOCATION_CHANGED, {
      agentId,
      fromZone: previousZone,
      toZone: newZone,
      timestamp: Date.now(),
      source: 'agent-registry',
    });

    return updated;
  }

  /**
   * Register a new agent
   */
  async registerAgent(workspaceId: string, config: DefaultAgentConfig) {
    const agent = await db.agent.create({
      data: {
        workspaceId,
        name: config.name,
        role: config.role,
        type: config.type,
        visualProfile: JSON.stringify(config.visualProfile),
        professionalStyle: JSON.stringify(config.professionalStyle),
        systemPrompt: config.systemPrompt,
        status: config.defaultStatus,
        locationZone: config.defaultLocationZone,
      },
    });

    await eventBus.emit(EventTypes.AGENT_CREATED, {
      agentId: agent.id,
      workspaceId,
      name: config.name,
      role: config.role,
      timestamp: Date.now(),
      source: 'agent-registry',
    });

    return agent;
  }

  /**
   * Seed default agents for a workspace
   * Checks if agents already exist to avoid duplicates
   */
  async seedDefaultAgents(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const existingAgents = await db.agent.findMany({
      where: { workspaceId },
    });

    const existingRoles = new Set(existingAgents.map((a) => a.role));

    let created = 0;
    let skipped = 0;

    for (const config of DEFAULT_AGENTS) {
      if (existingRoles.has(config.role)) {
        skipped++;
        continue;
      }

      await this.registerAgent(workspaceId, config);
      created++;
    }

    return { created, skipped };
  }

  /**
   * Get the default agent configurations (without creating them)
   */
  getDefaultAgentConfigs(): DefaultAgentConfig[] {
    return [...DEFAULT_AGENTS];
  }

  /**
   * Get agent with parsed JSON fields
   */
  async getAgentParsed(agentId: string) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) return null;

    return {
      ...agent,
      visualProfile: agent.visualProfile ? JSON.parse(agent.visualProfile) : null,
      professionalStyle: agent.professionalStyle ? JSON.parse(agent.professionalStyle) : null,
    };
  }
}

export const agentRegistry = AgentRegistry.getInstance();
