// ─── Agent OS — Agent Model Config Service ───────────────────
// Manages preferred/fallback model configurations for agents.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { getOpenRouterModelConfigForRole, resolveOpenRouterModelAlias } from '../ai-provider/model-registry';
import type { ModelConfig } from '../agent-core/types';

// ─── Default Models per Role ─────────────────────────────────

interface RoleModels {
  preferred: { provider: string; model: string };
  fallback: { provider: string; model: string };
}

// ─── OpenRouter model assignments per role ──────────────────────
// All persisted model configs are derived from the server-side OpenRouter model
// registry so agent seeding and runtime resolution cannot drift.
function toRoleModels(config: ModelConfig): RoleModels {
  const defaultFallback = getOpenRouterModelConfigForRole('custom').fallback;

  return {
    preferred: {
      provider: config.preferred.provider,
      model: config.preferred.model,
    },
    fallback: {
      provider: config.fallback?.provider ?? defaultFallback?.provider ?? config.preferred.provider,
      model: config.fallback?.model ?? defaultFallback?.model ?? config.preferred.model,
    },
  };
}

const DEFAULT_MODELS: Record<string, RoleModels> = {
  _default: toRoleModels(getOpenRouterModelConfigForRole('custom')),
};

// ─── Agent Model Config Service ──────────────────────────────

class AgentModelConfigService {
  private static instance: AgentModelConfigService | null = null;

  private constructor() {}

  static getInstance(): AgentModelConfigService {
    if (!AgentModelConfigService.instance) {
      AgentModelConfigService.instance = new AgentModelConfigService();
    }
    return AgentModelConfigService.instance;
  }

  /**
   * Get all model configs for an agent
   */
  async getAgentModels(agentId: string) {
    return db.agentModelConfig.findMany({
      where: { agentId },
      orderBy: [
        { preferenceType: 'asc' }, // 'fallback' < 'preferred' alphabetically, but we want preferred first
      ],
    });
  }

  /**
   * Set the preferred model for an agent (upsert)
   */
  async setPreferredModel(agentId: string, provider: string, model: string) {
    // Find existing preferred config
    const existing = await db.agentModelConfig.findFirst({
      where: { agentId, preferenceType: 'preferred' },
    });

    let config;

    if (existing) {
      config = await db.agentModelConfig.update({
        where: { id: existing.id },
        data: { provider, model, enabled: true },
      });
    } else {
      config = await db.agentModelConfig.create({
        data: {
          agentId,
          provider,
          model,
          preferenceType: 'preferred',
          enabled: true,
        },
      });
    }

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider,
      model,
      preferenceType: 'preferred',
      enabled: config.enabled,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Add a fallback model config for an agent
   */
  async addFallbackModel(agentId: string, provider: string, model: string) {
    const config = await db.agentModelConfig.create({
      data: {
        agentId,
        provider,
        model,
        preferenceType: 'fallback',
        enabled: true,
      },
    });

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider,
      model,
      preferenceType: 'fallback',
      enabled: config.enabled,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Disable a model config by ID
   */
  async disableModel(agentId: string, configId: string) {
    const config = await db.agentModelConfig.update({
      where: { id: configId },
      data: { enabled: false },
    });

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider: config.provider,
      model: config.model,
      preferenceType: config.preferenceType,
      enabled: false,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Deterministic model resolution for an agent.
   * Returns preferred if enabled, else first enabled fallback, else null.
   */
  async resolveModelForAgent(agentId: string, _taskContext?: Record<string, unknown>) {
    const configs = await db.agentModelConfig.findMany({
      where: { agentId, enabled: true },
      orderBy: { preferenceType: 'desc' }, // 'preferred' > 'fallback' alphabetically desc puts preferred first
    });

    // Try preferred first
    const preferred = configs.find((c) => c.preferenceType === 'preferred');
    if (preferred && preferred.enabled) {
      return {
        provider: preferred.provider,
        model: resolveOpenRouterModelAlias(preferred.model),
        preferenceType: preferred.preferenceType,
        maxCostPerTask: preferred.maxCostPerTask,
        maxTokens: preferred.maxTokens,
      };
    }

    // Try fallback
    const fallback = configs.find((c) => c.preferenceType === 'fallback');
    if (fallback && fallback.enabled) {
      return {
        provider: fallback.provider,
        model: resolveOpenRouterModelAlias(fallback.model),
        preferenceType: fallback.preferenceType,
        maxCostPerTask: fallback.maxCostPerTask,
        maxTokens: fallback.maxTokens,
      };
    }

    return null;
  }

  /**
   * Seed default model configs for an agent based on its role
   */
  async seedDefaultModels(agentId: string, role: string): Promise<{ created: number; skipped: number }> {
    const roleModels = this.getDefaultModels(role);

    // Check if any model configs already exist
    const existing = await db.agentModelConfig.findMany({
      where: { agentId },
    });

    if (existing.length > 0) {
      return { created: 0, skipped: existing.length };
    }

    // Create preferred model
    await db.agentModelConfig.create({
      data: {
        agentId,
        provider: roleModels.preferred.provider,
        model: roleModels.preferred.model,
        preferenceType: 'preferred',
        enabled: true,
      },
    });

    // Create fallback model
    await db.agentModelConfig.create({
      data: {
        agentId,
        provider: roleModels.fallback.provider,
        model: roleModels.fallback.model,
        preferenceType: 'fallback',
        enabled: true,
      },
    });

    return { created: 2, skipped: 0 };
  }

  /**
   * Ensure all permanent agents in workspace have default model configs
   */
  async ensureDefaultModels(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        type: 'permanent',
      },
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const result = await this.seedDefaultModels(agent.id, agent.role);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    return { created: totalCreated, skipped: totalSkipped };
  }

  /**
   * Get default models for a role
   */
  getDefaultModels(role: string): RoleModels {
    return toRoleModels(getOpenRouterModelConfigForRole(role) ?? DEFAULT_MODELS._default);
  }
}

export const agentModelConfigService = AgentModelConfigService.getInstance();
