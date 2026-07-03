// ─── Agent OS — Skill Pack Service ────────────────────────────
// Manages Skill Packs: curated bundles of skills that can be
// installed to or uninstalled from agents in a single operation.
//
// Each pack groups related skills (e.g. Legal, Coding, Marketing)
// so users can quickly equip agents with domain-relevant capabilities.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { DEFAULT_SKILL_PACKS } from './defaults';
import type { DefaultSkillPackDef } from './defaults';
import { logger } from '@/lib/logger';

// Use dynamic import to avoid circular dependencies
// SkillRegistryService.installSkill is called per-skill during pack install
async function getSkillRegistryService() {
  const { skillRegistryService } = await import('../skill-registry');
  return skillRegistryService;
}

class SkillPackService {
  private static instance: SkillPackService | null = null;

  private constructor() {}

  static getInstance(): SkillPackService {
    if (!SkillPackService.instance) {
      SkillPackService.instance = new SkillPackService();
    }
    return SkillPackService.instance;
  }

  // ── Pack Listing & Lookup ──────────────────────────────────

  /**
   * List all skill packs
   */
  async listPacks() {
    return db.skillPack.findMany({
      orderBy: { key: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  /**
   * Get a single pack by key, including all items with skill definitions
   */
  async getPack(key: string) {
    return db.skillPack.findUnique({
      where: { key },
      include: {
        items: {
          include: {
            skill: true,
          },
          orderBy: { skill: { key: 'asc' } },
        },
      },
    });
  }

  // ── Pack Install / Uninstall ───────────────────────────────

  /**
   * Install all skills from a pack to an agent.
   * For each skill in the pack, calls SkillRegistryService.installSkill.
   * Returns summary of operations.
   */
  async installPack(packKey: string, agentId: string): Promise<{
    packKey: string;
    agentId: string;
    installed: number;
    skipped: number;
    errors: Array<{ skillKey: string; error: string }>;
  }> {
    // Verify pack exists
    const pack = await db.skillPack.findUnique({
      where: { key: packKey },
      include: {
        items: {
          include: { skill: true },
        },
      },
    });

    if (!pack) {
      throw new Error(`Skill pack not found: ${packKey}`);
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const skillService = await getSkillRegistryService();
    let installed = 0;
    let skipped = 0;
    const errors: Array<{ skillKey: string; error: string }> = [];

    for (const item of pack.items) {
      try {
        const result = await skillService.installSkill(item.skill.key, agentId);
        // If installedAt ≈ updatedAt (within 1s), it was just created; otherwise it was updated/skipped
        const wasCreated = Math.abs(result.installedAt.getTime() - result.updatedAt.getTime()) < 1000;
        if (wasCreated) {
          installed++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({
          skillKey: item.skill.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Increment pack install count
    await db.skillPack.update({
      where: { id: pack.id },
      data: { installCount: { increment: 1 } },
    });

    // Emit event
    await eventBus.emit('agent.capability_updated' as any, {
      agentId,
      capabilityKey: `pack:${packKey}`,
      level: installed,
      enabled: true,
      timestamp: Date.now(),
      source: 'skill-pack-service',
    } as any);

    logger.info(
      `[SkillPackService] Installed pack "${packKey}" to agent ${agentId}: ` +
      `${installed} installed, ${skipped} skipped, ${errors.length} errors`
    );

    return { packKey, agentId, installed, skipped, errors };
  }

  /**
   * Uninstall all skills from a pack from an agent.
   * For each skill in the pack, calls SkillRegistryService.uninstallSkill.
   * Returns summary of operations.
   */
  async uninstallPack(packKey: string, agentId: string): Promise<{
    packKey: string;
    agentId: string;
    removed: number;
    notInstalled: number;
    errors: Array<{ skillKey: string; error: string }>;
  }> {
    // Verify pack exists
    const pack = await db.skillPack.findUnique({
      where: { key: packKey },
      include: {
        items: {
          include: { skill: true },
        },
      },
    });

    if (!pack) {
      throw new Error(`Skill pack not found: ${packKey}`);
    }

    const skillService = await getSkillRegistryService();
    let removed = 0;
    let notInstalled = 0;
    const errors: Array<{ skillKey: string; error: string }> = [];

    for (const item of pack.items) {
      try {
        await skillService.uninstallSkill(item.skill.key, agentId);
        // uninstallSkill throws if not installed, so reaching here means it was removed
        removed++;
      } catch (err) {
        errors.push({
          skillKey: item.skill.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info(
      `[SkillPackService] Uninstalled pack "${packKey}" from agent ${agentId}: ` +
      `${removed} removed, ${notInstalled} not installed, ${errors.length} errors`
    );

    return { packKey, agentId, removed, notInstalled, errors };
  }

  // ── Seeding ────────────────────────────────────────────────

  /**
   * Seed default skill packs idempotently.
   * Also seeds skill definitions if they don't exist.
   * Returns summary of operations.
   */
  async seedDefaults(): Promise<{
    packsCreated: number;
    packsSkipped: number;
    itemsCreated: number;
    itemsSkipped: number;
  }> {
    // First, ensure all skill definitions exist
    const skillService = await getSkillRegistryService();
    await skillService.seedDefaults();

    let packsCreated = 0;
    let packsSkipped = 0;
    let itemsCreated = 0;
    let itemsSkipped = 0;

    for (const packDef of DEFAULT_SKILL_PACKS) {
      // Check if pack already exists
      const existingPack = await db.skillPack.findUnique({ where: { key: packDef.key } });

      let packId: string;

      if (existingPack) {
        packId = existingPack.id;
        packsSkipped++;
      } else {
        const newPack = await db.skillPack.create({
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

      // Create pack items (link skills to pack)
      for (const skillKey of packDef.skills) {
        const skill = await db.skillDefinition.findUnique({ where: { key: skillKey } });
        if (!skill) {
          logger.warn(`[SkillPackService] Skill "${skillKey}" not found, skipping for pack "${packDef.key}"`);
          itemsSkipped++;
          continue;
        }

        // Check if item already exists
        const existingItem = await db.skillPackItem.findUnique({
          where: {
            packId_skillId: { packId, skillId: skill.id },
          },
        });

        if (existingItem) {
          itemsSkipped++;
          continue;
        }

        await db.skillPackItem.create({
          data: {
            packId,
            skillId: skill.id,
            required: true,
          },
        });

        itemsCreated++;
      }
    }

    if (packsCreated > 0 || itemsCreated > 0) {
      logger.info(
        `[SkillPackService] Seeded ${packsCreated} packs, ${itemsCreated} items ` +
        `(skipped ${packsSkipped} packs, ${itemsSkipped} items)`
      );
    }

    return { packsCreated, packsSkipped, itemsCreated, itemsSkipped };
  }
}

export const skillPackService = SkillPackService.getInstance();
