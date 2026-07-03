// ─── Agent OS — Stage 2: Agent Registry ──────────────────────
// Manages agent configs: registration, lookup, model resolution.
// The registry is the single source of truth for WHAT agents exist
// and HOW they're configured. It does NOT execute agents.

import type { AgentConfig, AgentRole, ModelConfig, ResolvedModel, RegistryStats, AgentStatus } from './types';
import { providerRegistry } from '../ai-provider/provider-registry';
import { loggers } from '@/lib/logger';
import { resolveOpenRouterModelAlias } from '../ai-provider/model-registry';

// ─── Agent Registry ─────────────────────────────────────────

class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private configs: Map<string, AgentConfig> = new Map();
  private statuses: Map<string, AgentStatus> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  // ── Registration ───────────────────────────────────────────

  /**
   * Register an agent config.
   * If an agent with the same ID exists, it will be overwritten.
   */
  register(config: AgentConfig): void {
    if (this.configs.has(config.id)) {
      loggers.agentRuntime.warn(`[AgentRegistry] Overwriting existing agent config: ${config.id}`);
    }
    this.configs.set(config.id, config);
    // Initialize status to idle if not already set
    if (!this.statuses.has(config.id)) {
      this.statuses.set(config.id, 'idle');
    }
  }

  /**
   * Register multiple agent configs at once.
   */
  registerAll(configs: AgentConfig[]): void {
    for (const config of configs) {
      this.register(config);
    }
  }

  /**
   * Unregister an agent by ID.
   */
  unregister(agentId: string): boolean {
    this.statuses.delete(agentId);
    return this.configs.delete(agentId);
  }

  // ── Lookup ─────────────────────────────────────────────────

  /**
   * Get an agent config by ID.
   */
  get(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId);
  }

  /**
   * Get an agent config or throw if not found.
   */
  getOrThrow(agentId: string): AgentConfig {
    const config = this.configs.get(agentId);
    if (!config) {
      const registered = Array.from(this.configs.keys()).join(', ');
      throw new Error(
        `Agent not found in registry: "${agentId}". Registered agents: [${registered}]`
      );
    }
    return config;
  }

  /**
   * List all registered agent configs.
   */
  listAll(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * List agents by role.
   */
  listByRole(role: AgentRole): AgentConfig[] {
    return Array.from(this.configs.values()).filter((c) => c.role === role);
  }

  /**
   * List agents by type.
   */
  listByType(type: 'permanent' | 'temporary'): AgentConfig[] {
    return Array.from(this.configs.values()).filter((c) => c.type === type);
  }

  /**
   * Check if an agent is registered.
   */
  has(agentId: string): boolean {
    return this.configs.has(agentId);
  }

  /**
   * Get all registered agent IDs.
   */
  listIds(): string[] {
    return Array.from(this.configs.keys());
  }

  // ── Model Resolution ───────────────────────────────────────

  /**
   * Resolve the model for an agent.
   * Priority: modelOverride > preferred > fallback
   * Also checks that the provider is available.
   */
  resolveModel(agentId: string, modelOverride?: string): ResolvedModel {
    const config = this.getOrThrow(agentId);

    // If model override is provided, use it
    if (modelOverride) {
      return {
        provider: 'openrouter',
        model: resolveOpenRouterModelAlias(modelOverride),
        preferenceType: 'override',
      };
    }

    // Try preferred model
    const preferred = config.model.preferred;
    if (providerRegistry.has(preferred.provider)) {
      return {
        provider: preferred.provider,
        model: resolveOpenRouterModelAlias(preferred.model),
        preferenceType: 'preferred',
        maxCostPerTask: preferred.maxCostPerTask,
        maxTokens: preferred.maxTokens,
      };
    }

    // Try fallback model
    if (config.model.fallback && providerRegistry.has(config.model.fallback.provider)) {
      return {
        provider: config.model.fallback.provider,
        model: resolveOpenRouterModelAlias(config.model.fallback.model),
        preferenceType: 'fallback',
        maxCostPerTask: config.model.fallback.maxCostPerTask,
        maxTokens: config.model.fallback.maxTokens,
      };
    }

    throw new Error(
      `No available model for agent "${config.name}" (${config.id}). ` +
      `Preferred: ${preferred.provider}/${preferred.model}` +
      (config.model.fallback ? `, Fallback: ${config.model.fallback.provider}/${config.model.fallback.model}` : '') +
      `. Check that providers are initialized.`
    );
  }

  /**
   * Get the model config for an agent.
   */
  getModelConfig(agentId: string): ModelConfig {
    const config = this.getOrThrow(agentId);
    return config.model;
  }

  // ── Status Management ──────────────────────────────────────

  /**
   * Get the current status of an agent.
   */
  getStatus(agentId: string): AgentStatus {
    return this.statuses.get(agentId) ?? 'offline';
  }

  /**
   * Set the status of an agent.
   */
  setStatus(agentId: string, status: AgentStatus): void {
    this.statuses.set(agentId, status);
  }

  /**
   * Get all agent statuses.
   */
  getAllStatuses(): Map<string, AgentStatus> {
    return new Map(this.statuses);
  }

  // ── Stats ──────────────────────────────────────────────────

  /**
   * Get registry statistics.
   */
  getStats(): RegistryStats {
    const configs = Array.from(this.configs.values());
    const agentsByRole: Record<string, number> = {};
    const agentsByStatus: Record<string, number> = {};

    for (const config of configs) {
      agentsByRole[config.role] = (agentsByRole[config.role] || 0) + 1;
      const status = this.statuses.get(config.id) ?? 'offline';
      agentsByStatus[status] = (agentsByStatus[status] || 0) + 1;
    }

    return {
      totalAgents: configs.length,
      permanentAgents: configs.filter((c) => c.type === 'permanent').length,
      temporaryAgents: configs.filter((c) => c.type === 'temporary').length,
      agentsByRole,
      agentsByStatus,
    };
  }

  // ── Reset ──────────────────────────────────────────────────

  /**
   * Clear all registered agents.
   */
  clear(): void {
    this.configs.clear();
    this.statuses.clear();
  }
}

export const agentRegistry = AgentRegistry.getInstance();
