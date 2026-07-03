// ─── Agent OS — Agent Capability Service ─────────────────────
// Manages agent capabilities: skill levels, enablement, discovery.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { UpdateCapabilityInput } from './types';

// ─── Default Capabilities per Role ───────────────────────────

interface RoleCapability {
  capabilityKey: string;
  level: string;
}

const DEFAULT_CAPABILITIES: Record<string, RoleCapability[]> = {
  orchestrator: [
    { capabilityKey: 'orchestration', level: 'expert' },
    { capabilityKey: 'product_analysis', level: 'advanced' },
    { capabilityKey: 'prompt_engineering', level: 'advanced' },
  ],
  analyst: [
    { capabilityKey: 'product_analysis', level: 'expert' },
    { capabilityKey: 'research', level: 'advanced' },
    { capabilityKey: 'document_processing', level: 'intermediate' },
  ],
  architect: [
    { capabilityKey: 'system_architecture', level: 'expert' },
    { capabilityKey: 'backend_development', level: 'advanced' },
    { capabilityKey: 'database_design', level: 'advanced' },
  ],
  designer: [
    { capabilityKey: 'frontend_development', level: 'advanced' },
    { capabilityKey: 'prompt_engineering', level: 'intermediate' },
  ],
  frontend_engineer: [
    { capabilityKey: 'frontend_development', level: 'expert' },
    { capabilityKey: 'prompt_engineering', level: 'intermediate' },
  ],
  backend_engineer: [
    { capabilityKey: 'backend_development', level: 'expert' },
    { capabilityKey: 'database_design', level: 'advanced' },
    { capabilityKey: 'security_review', level: 'intermediate' },
  ],
  data_engineer: [
    { capabilityKey: 'database_design', level: 'expert' },
    { capabilityKey: 'backend_development', level: 'advanced' },
  ],
  qa_engineer: [
    { capabilityKey: 'qa_testing', level: 'expert' },
    { capabilityKey: 'security_review', level: 'advanced' },
    { capabilityKey: 'document_processing', level: 'intermediate' },
  ],
  devops_engineer: [
    { capabilityKey: 'devops', level: 'expert' },
    { capabilityKey: 'security_review', level: 'intermediate' },
    { capabilityKey: 'backend_development', level: 'intermediate' },
  ],
  researcher: [
    { capabilityKey: 'research', level: 'expert' },
    { capabilityKey: 'document_processing', level: 'advanced' },
    { capabilityKey: 'rag', level: 'intermediate' },
    { capabilityKey: 'ocr', level: 'basic' },
    { capabilityKey: 'translation', level: 'basic' },
  ],
};

// ─── Agent Capability Service ────────────────────────────────

class AgentCapabilityService {
  private static instance: AgentCapabilityService | null = null;

  private constructor() {}

  static getInstance(): AgentCapabilityService {
    if (!AgentCapabilityService.instance) {
      AgentCapabilityService.instance = new AgentCapabilityService();
    }
    return AgentCapabilityService.instance;
  }

  /**
   * Get all capabilities for an agent, parsing JSON fields
   */
  async getAgentCapabilities(agentId: string) {
    const capabilities = await db.agentCapability.findMany({
      where: { agentId },
      orderBy: { capabilityKey: 'asc' },
    });

    return capabilities.map((cap) => ({
      ...cap,
      metadata: cap.metadata ? JSON.parse(cap.metadata) : null,
    }));
  }

  /**
   * Update or create a capability for an agent (upsert)
   */
  async updateCapability(agentId: string, data: UpdateCapabilityInput) {
    const capability = await db.agentCapability.upsert({
      where: {
        agentId_capabilityKey: {
          agentId,
          capabilityKey: data.capabilityKey,
        },
      },
      update: {
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.metadata !== undefined ? { metadata: JSON.stringify(data.metadata) } : {}),
      },
      create: {
        agentId,
        capabilityKey: data.capabilityKey,
        level: data.level ?? 'intermediate',
        enabled: data.enabled ?? true,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    await eventBus.emit(EventTypes.AGENT_CAPABILITY_UPDATED, {
      agentId,
      capabilityKey: data.capabilityKey,
      level: capability.level === 'basic' ? 0 : capability.level === 'intermediate' ? 1 : capability.level === 'advanced' ? 2 : 3,
      enabled: capability.enabled,
      timestamp: Date.now(),
      source: 'agent-capability-service',
    });

    return {
      ...capability,
      metadata: capability.metadata ? JSON.parse(capability.metadata) : null,
    };
  }

  /**
   * Convenience method to enable/disable a capability
   */
  async setCapabilityEnabled(agentId: string, capabilityKey: string, enabled: boolean) {
    return this.updateCapability(agentId, { capabilityKey, enabled });
  }

  /**
   * Find agents in a workspace that have a specific capability enabled
   */
  async findAgentsByCapability(workspaceId: string, capabilityKey: string) {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        capabilities: {
          some: {
            capabilityKey,
            enabled: true,
          },
        },
      },
      include: {
        capabilities: {
          where: { capabilityKey },
        },
      },
    });

    return agents.map((agent) => ({
      ...agent,
      visualProfile: agent.visualProfile ? JSON.parse(agent.visualProfile) : null,
      professionalStyle: agent.professionalStyle ? JSON.parse(agent.professionalStyle) : null,
      matchedCapability: agent.capabilities[0]
        ? {
            ...agent.capabilities[0],
            metadata: agent.capabilities[0].metadata ? JSON.parse(agent.capabilities[0].metadata) : null,
          }
        : null,
    }));
  }

  /**
   * Seed default capabilities for an agent based on its role
   */
  async seedCapabilitiesForAgent(agentId: string, role: string): Promise<{ created: number; skipped: number }> {
    const roleCapabilities = DEFAULT_CAPABILITIES[role];
    if (!roleCapabilities) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;

    for (const cap of roleCapabilities) {
      const existing = await db.agentCapability.findUnique({
        where: {
          agentId_capabilityKey: {
            agentId,
            capabilityKey: cap.capabilityKey,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.agentCapability.create({
        data: {
          agentId,
          capabilityKey: cap.capabilityKey,
          level: cap.level,
          enabled: true,
        },
      });
      created++;
    }

    return { created, skipped };
  }

  /**
   * Ensure all permanent agents in workspace have default capabilities
   */
  async ensureDefaultCapabilities(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        type: 'permanent',
      },
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const result = await this.seedCapabilitiesForAgent(agent.id, agent.role);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    return { created: totalCreated, skipped: totalSkipped };
  }

  /**
   * Get default capabilities for a role
   */
  getDefaultCapabilities(role: string): RoleCapability[] | undefined {
    return DEFAULT_CAPABILITIES[role];
  }
}

export const agentCapabilityService = AgentCapabilityService.getInstance();
