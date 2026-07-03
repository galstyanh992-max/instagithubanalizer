// ─── Agent OS — Stage 3: Tool Registry ──────────────────────────
// Singleton registry that holds all registered tool implementations.
// Agents reference tools by ID in their config (ToolRef).
// The ToolExecutor resolves these references at execution time.
//
// Design principles:
// - Registry is the single source of truth for WHAT tools exist
// - Tools are registered once (at startup) and looked up per-execution
// - New tools can be registered without modifying existing code

import type { ITool, ToolRegistration, ToolRegistryStats, ToolPermission } from './types';
import { loggers } from '@/lib/logger';

// ─── Tool Registry ───────────────────────────────────────────

class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private registrations: Map<string, ToolRegistration> = new Map();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  // ── Registration ─────────────────────────────────────────────

  /**
   * Register a tool implementation.
   * If a tool with the same ID exists, it will be overwritten with a warning.
   */
  register(tool: ITool, source: string = 'unknown'): void {
    if (this.registrations.has(tool.id)) {
      loggers.toolHub.warn(`[ToolRegistry] Overwriting existing tool: ${tool.id}`);
    }

    this.registrations.set(tool.id, {
      tool,
      registeredAt: Date.now(),
      source,
    });

    loggers.toolHub.info(`[ToolRegistry] Registered tool: ${tool.id} (${tool.name}) from ${source}`);
  }

  /**
   * Register multiple tools at once.
   */
  registerAll(tools: ITool[], source: string = 'unknown'): void {
    for (const tool of tools) {
      this.register(tool, source);
    }
  }

  /**
   * Unregister a tool by ID.
   */
  unregister(toolId: string): boolean {
    return this.registrations.delete(toolId);
  }

  // ── Lookup ───────────────────────────────────────────────────

  /**
   * Get a tool by ID.
   */
  get(toolId: string): ITool | undefined {
    return this.registrations.get(toolId)?.tool;
  }

  /**
   * Get a tool or throw if not found.
   */
  getOrThrow(toolId: string): ITool {
    const tool = this.get(toolId);
    if (!tool) {
      const registered = Array.from(this.registrations.keys()).join(', ');
      throw new Error(
        `Tool not found in registry: "${toolId}". Registered tools: [${registered}]`
      );
    }
    return tool;
  }

  /**
   * Check if a tool is registered.
   */
  has(toolId: string): boolean {
    return this.registrations.has(toolId);
  }

  /**
   * List all registered tools.
   */
  listAll(): ITool[] {
    return Array.from(this.registrations.values()).map((r) => r.tool);
  }

  /**
   * List all registered tool IDs.
   */
  listIds(): string[] {
    return Array.from(this.registrations.keys());
  }

  // ── Stats ────────────────────────────────────────────────────

  /**
   * Get registry statistics.
   */
  getStats(): ToolRegistryStats {
    const tools = Array.from(this.registrations.values());
    const toolsByPermission: Record<ToolPermission, number> = {
      none: 0,
      read: 0,
      write: 0,
      admin: 0,
    };

    for (const reg of tools) {
      toolsByPermission[reg.tool.requiredPermission]++;
    }

    return {
      totalTools: this.registrations.size,
      toolIds: this.listIds(),
      toolsByPermission,
      registrations: tools.map((r) => ({
        id: r.tool.id,
        name: r.tool.name,
        version: r.tool.version,
        permission: r.tool.requiredPermission,
        source: r.source,
      })),
    };
  }

  // ── Reset ────────────────────────────────────────────────────

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.registrations.clear();
  }
}

export const toolRegistry = ToolRegistry.getInstance();
