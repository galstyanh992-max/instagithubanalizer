// ─── Agent OS — Tool Registry Service ────────────────────────
// Manages tool registration, discovery, and CRUD operations.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { DEFAULT_TOOLS } from './defaults';
import type { CreateToolInput, UpdateToolInput } from './types';

class ToolRegistryService {
  private static instance: ToolRegistryService | null = null;

  private constructor() {}

  static getInstance(): ToolRegistryService {
    if (!ToolRegistryService.instance) {
      ToolRegistryService.instance = new ToolRegistryService();
    }
    return ToolRegistryService.instance;
  }

  /**
   * Get all tools, optionally filtered by workspace
   */
  async getTools(workspaceId?: string) {
    const where = workspaceId
      ? { OR: [{ workspaceId }, { workspaceId: null }] }
      : undefined;

    return db.tool.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      include: { policies: true },
    });
  }

  /**
   * Get a single tool by ID
   */
  async getTool(toolId: string) {
    return db.tool.findUnique({
      where: { id: toolId },
      include: { policies: true },
    });
  }

  /**
   * Get a tool by key within a workspace (or global)
   */
  async getToolByKey(key: string, workspaceId?: string) {
    // Try workspace-specific tool first
    if (workspaceId) {
      const wsTool = await db.tool.findFirst({
        where: { key, workspaceId },
        include: { policies: true },
      });
      if (wsTool) return wsTool;
    }

    // Fallback to global tool (workspaceId is null)
    return db.tool.findFirst({
      where: { key, workspaceId: null },
      include: { policies: true },
    });
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: string, workspaceId?: string) {
    const where = workspaceId
      ? { category, OR: [{ workspaceId }, { workspaceId: null }] }
      : { category };

    return db.tool.findMany({
      where,
      orderBy: { key: 'asc' },
      include: { policies: true },
    });
  }

  /**
   * Create a new tool
   */
  async createTool(input: CreateToolInput) {
    const tool = await db.tool.create({
      data: {
        workspaceId: input.workspaceId ?? null,
        name: input.name,
        key: input.key,
        category: input.category,
        description: input.description ?? null,
        configSchema: input.configSchema ? JSON.stringify(input.configSchema) : null,
        enabled: input.enabled ?? true,
        riskLevel: input.riskLevel ?? 'low',
        requiresApproval: input.requiresApproval ?? false,
      },
    });

    await eventBus.emit(EventTypes.TOOL_CREATED, {
      toolId: tool.id,
      key: tool.key,
      category: tool.category,
      workspaceId: tool.workspaceId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-registry-service',
    });

    return tool;
  }

  /**
   * Update an existing tool
   */
  async updateTool(toolId: string, input: UpdateToolInput) {
    const existing = await db.tool.findUnique({ where: { id: toolId } });
    if (!existing) throw new Error(`Tool not found: ${toolId}`);

    const updatedFields = Object.keys(input);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.configSchema !== undefined) data.configSchema = JSON.stringify(input.configSchema);
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.riskLevel !== undefined) data.riskLevel = input.riskLevel;
    if (input.requiresApproval !== undefined) data.requiresApproval = input.requiresApproval;

    const tool = await db.tool.update({
      where: { id: toolId },
      data,
    });

    await eventBus.emit(EventTypes.TOOL_UPDATED, {
      toolId: tool.id,
      key: tool.key,
      updatedFields,
      timestamp: Date.now(),
      source: 'tool-registry-service',
    });

    return tool;
  }

  /**
   * Seed default tools idempotently.
   * Returns count of tools created and skipped.
   */
  async seedDefaultTools(workspaceId?: string): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const toolConfig of DEFAULT_TOOLS) {
      // Check if tool already exists (global or workspace-specific)
      const existing = await db.tool.findFirst({
        where: {
          key: toolConfig.key,
          OR: [
            { workspaceId: workspaceId ?? null },
            { workspaceId: null },
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create tool
      const tool = await db.tool.create({
        data: {
          workspaceId: workspaceId ?? null,
          name: toolConfig.name,
          key: toolConfig.key,
          category: toolConfig.category,
          description: toolConfig.description,
          configSchema: toolConfig.configSchema ? JSON.stringify(toolConfig.configSchema) : null,
          enabled: toolConfig.enabled,
          riskLevel: toolConfig.riskLevel,
          requiresApproval: toolConfig.requiresApproval,
        },
      });

      // Create policies for this tool
      for (const policy of toolConfig.policies) {
        await db.toolPermissionPolicy.create({
          data: {
            toolId: tool.id,
            permissionKey: policy.permissionKey,
            requiredLevel: policy.requiredLevel,
            constraints: policy.constraints ? JSON.stringify(policy.constraints) : null,
          },
        });
      }

      created++;
    }

    return { created, skipped };
  }

  /**
   * Check if a tool exists and is enabled
   */
  async isToolAvailable(toolKey: string, workspaceId?: string): Promise<boolean> {
    const tool = await this.getToolByKey(toolKey, workspaceId);
    return tool !== null && tool.enabled;
  }
}

export const toolRegistryService = ToolRegistryService.getInstance();
