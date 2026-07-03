// ─── Agent OS — Tool Pack Service ─────────────────────────────
// Manages Tool Packs: curated bundles of tools that can be
// installed to or uninstalled from agents in a single operation.
//
// Each pack groups related tools (e.g. Dev Tools, Data Tools, Full Stack)
// so users can quickly equip agents with the right toolset.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { DEFAULT_TOOL_PACKS } from './defaults';
import type { DefaultToolPackDef } from './defaults';
import { logger } from '@/lib/logger';

class ToolPackService {
  private static instance: ToolPackService | null = null;

  private constructor() {}

  static getInstance(): ToolPackService {
    if (!ToolPackService.instance) {
      ToolPackService.instance = new ToolPackService();
    }
    return ToolPackService.instance;
  }

  // ── Pack Listing & Lookup ──────────────────────────────────

  /**
   * List all tool packs
   */
  async listPacks() {
    return db.toolPack.findMany({
      orderBy: { key: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  /**
   * Get a single pack by key, including all items with tool definitions
   */
  async getPack(key: string) {
    return db.toolPack.findUnique({
      where: { key },
      include: {
        items: {
          include: {
            tool: true,
          },
          orderBy: { tool: { key: 'asc' } },
        },
      },
    });
  }

  // ── Pack Install / Uninstall ───────────────────────────────

  /**
   * Install all tools from a pack to an agent.
   * For each tool in the pack, creates an AgentToolLink record.
   * Returns summary of operations.
   */
  async installPack(packKey: string, agentId: string): Promise<{
    packKey: string;
    agentId: string;
    installed: number;
    skipped: number;
    errors: Array<{ toolKey: string; error: string }>;
  }> {
    // Verify pack exists
    const pack = await db.toolPack.findUnique({
      where: { key: packKey },
      include: {
        items: {
          include: { tool: true },
        },
      },
    });

    if (!pack) {
      throw new Error(`Tool pack not found: ${packKey}`);
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    let installed = 0;
    let skipped = 0;
    const errors: Array<{ toolKey: string; error: string }> = [];

    for (const item of pack.items) {
      try {
        // Check if link already exists
        const existing = await db.agentToolLink.findUnique({
          where: {
            agentId_toolId: { agentId, toolId: item.tool.id },
          },
        });

        if (existing) {
          // If exists but uninstalled, re-enable it
          if (!existing.installed || !existing.enabled) {
            await db.agentToolLink.update({
              where: { id: existing.id },
              data: { installed: true, enabled: true, updatedAt: new Date() },
            });
            installed++;
          } else {
            skipped++;
          }
        } else {
          // Create new AgentToolLink
          await db.agentToolLink.create({
            data: {
              agentId,
              toolId: item.tool.id,
              enabled: true,
              installed: true,
            },
          });
          installed++;
        }
      } catch (err) {
        errors.push({
          toolKey: item.tool.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Increment pack install count
    await db.toolPack.update({
      where: { id: pack.id },
      data: { installCount: { increment: 1 } },
    });

    // Emit event
    await eventBus.emit('tool.policy_updated' as any, {
      toolId: pack.id,
      permissionKey: `pack:${packKey}`,
      requiredLevel: 'write',
      timestamp: Date.now(),
      source: 'tool-pack-service',
    } as any);

    logger.info(
      `[ToolPackService] Installed pack "${packKey}" to agent ${agentId}: ` +
      `${installed} installed, ${skipped} skipped, ${errors.length} errors`
    );

    return { packKey, agentId, installed, skipped, errors };
  }

  /**
   * Uninstall all tools from a pack from an agent.
   * For each tool in the pack, removes the AgentToolLink record.
   * Returns summary of operations.
   */
  async uninstallPack(packKey: string, agentId: string): Promise<{
    packKey: string;
    agentId: string;
    removed: number;
    notInstalled: number;
    errors: Array<{ toolKey: string; error: string }>;
  }> {
    // Verify pack exists
    const pack = await db.toolPack.findUnique({
      where: { key: packKey },
      include: {
        items: {
          include: { tool: true },
        },
      },
    });

    if (!pack) {
      throw new Error(`Tool pack not found: ${packKey}`);
    }

    let removed = 0;
    let notInstalled = 0;
    const errors: Array<{ toolKey: string; error: string }> = [];

    for (const item of pack.items) {
      try {
        const existing = await db.agentToolLink.findUnique({
          where: {
            agentId_toolId: { agentId, toolId: item.tool.id },
          },
        });

        if (!existing) {
          notInstalled++;
          continue;
        }

        await db.agentToolLink.delete({
          where: { id: existing.id },
        });

        removed++;
      } catch (err) {
        errors.push({
          toolKey: item.tool.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info(
      `[ToolPackService] Uninstalled pack "${packKey}" from agent ${agentId}: ` +
      `${removed} removed, ${notInstalled} not installed, ${errors.length} errors`
    );

    return { packKey, agentId, removed, notInstalled, errors };
  }

  // ── Seeding ────────────────────────────────────────────────

  /**
   * Seed default tool packs idempotently.
   * Requires that tools already exist in the DB (seeded by ToolRegistryService).
   * Returns summary of operations.
   */
  async seedDefaults(): Promise<{
    packsCreated: number;
    packsSkipped: number;
    itemsCreated: number;
    itemsSkipped: number;
  }> {
    let packsCreated = 0;
    let packsSkipped = 0;
    let itemsCreated = 0;
    let itemsSkipped = 0;

    for (const packDef of DEFAULT_TOOL_PACKS) {
      // Check if pack already exists
      const existingPack = await db.toolPack.findUnique({ where: { key: packDef.key } });

      let packId: string;

      if (existingPack) {
        packId = existingPack.id;
        packsSkipped++;
      } else {
        const newPack = await db.toolPack.create({
          data: {
            key: packDef.key,
            name: packDef.name,
            description: packDef.description,
            icon: packDef.icon,
            color: packDef.color,
            status: 'available',
          },
        });
        packId = newPack.id;
        packsCreated++;
      }

      // Create pack items (link tools to pack)
      for (const toolKey of packDef.tools) {
        // Find tool by key (prefer global tools, fall back to workspace-specific)
        const tool = await db.tool.findFirst({
          where: { key: toolKey },
        });

        if (!tool) {
          logger.warn(`[ToolPackService] Tool "${toolKey}" not found, skipping for pack "${packDef.key}"`);
          itemsSkipped++;
          continue;
        }

        // Check if item already exists
        const existingItem = await db.toolPackItem.findUnique({
          where: {
            packId_toolId: { packId, toolId: tool.id },
          },
        });

        if (existingItem) {
          itemsSkipped++;
          continue;
        }

        await db.toolPackItem.create({
          data: {
            packId,
            toolId: tool.id,
            required: true,
          },
        });

        itemsCreated++;
      }
    }

    if (packsCreated > 0 || itemsCreated > 0) {
      logger.info(
        `[ToolPackService] Seeded ${packsCreated} packs, ${itemsCreated} items ` +
        `(skipped ${packsSkipped} packs, ${itemsSkipped} items)`
      );
    }

    return { packsCreated, packsSkipped, itemsCreated, itemsSkipped };
  }
}

export const toolPackService = ToolPackService.getInstance();
