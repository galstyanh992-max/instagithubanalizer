// ─── Agent OS — Skill Registry Service ────────────────────────
// DB-backed skill registry that manages SkillDefinition records,
// agent-skill links (AgentSkillLink), and usage logs (SkillUsageLog).
//
// This EXTENDS the existing in-memory skill system (src/lib/skills/).
// The in-memory system handles runtime lifecycle hooks (beforeRun, afterRun, onError).
// This service handles persistent storage, discovery, and agent-skill binding.
//
// Singleton pattern — use skillRegistryService exported at the bottom.

import { db } from '../db';
import { DEFAULT_SKILLS } from './defaults';
import type { DefaultSkillDefinition } from './defaults';
import { logger } from '@/lib/logger';

// ─── Filter Types ────────────────────────────────────────────

export interface SkillListFilters {
  category?: string;
  status?: string;
  tags?: string[];
}

export interface SeedResult {
  created: number;
  updated: number;
  skipped: number;
}

// ─── Skill Registry Service ──────────────────────────────────

class SkillRegistryService {
  private static instance: SkillRegistryService | null = null;

  private constructor() {}

  static getInstance(): SkillRegistryService {
    if (!SkillRegistryService.instance) {
      SkillRegistryService.instance = new SkillRegistryService();
    }
    return SkillRegistryService.instance;
  }

  // ── List & Get ─────────────────────────────────────────────

  /**
   * List all SkillDefinitions with optional category/status filter.
   */
  async listSkills(filters?: SkillListFilters) {
    const where: Record<string, unknown> = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.tags && filters.tags.length > 0) {
      // SQLite JSON search: check if tags string contains any of the filter tags.
      // Since tags is stored as a JSON string, we use string contains for each tag.
      // This is a simple approach for SQLite; for production PG, use jsonb operators.
      where.AND = filters.tags.map((tag) => ({
        tags: { contains: `"${tag}"` },
      }));
    }

    return db.skillDefinition.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Get a single SkillDefinition by its unique key.
   */
  async getSkill(key: string) {
    return db.skillDefinition.findUnique({
      where: { key },
    });
  }

  // ── Agent-Skill Link Management ────────────────────────────

  /**
   * Install a skill for an agent. Creates an AgentSkillLink.
   * Optionally set the initial capability score (0-100, default 50).
   */
  async installSkill(agentId: string, skillKey: string, score: number = 50) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    // Check if already installed
    const existing = await db.agentSkillLink.findUnique({
      where: {
        agentId_skillId: { agentId, skillId: skill.id },
      },
    });

    if (existing) {
      // Already linked — update to installed/enabled state
      return db.agentSkillLink.update({
        where: { id: existing.id },
        data: {
          installed: true,
          enabled: true,
          score: Math.max(0, Math.min(100, score)),
        },
      });
    }

    // Increment install count on the skill definition
    await db.skillDefinition.update({
      where: { id: skill.id },
      data: { installCount: { increment: 1 } },
    });

    return db.agentSkillLink.create({
      data: {
        agentId,
        skillId: skill.id,
        installed: true,
        enabled: true,
        score: Math.max(0, Math.min(100, score)),
      },
    });
  }

  /**
   * Uninstall a skill from an agent. Removes the AgentSkillLink.
   */
  async uninstallSkill(agentId: string, skillKey: string) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    const link = await db.agentSkillLink.findUnique({
      where: {
        agentId_skillId: { agentId, skillId: skill.id },
      },
    });

    if (!link) {
      throw new Error(`Skill ${skillKey} is not installed for agent ${agentId}`);
    }

    // Decrement install count
    await db.skillDefinition.update({
      where: { id: skill.id },
      data: { installCount: { decrement: 1 } },
    });

    return db.agentSkillLink.delete({
      where: { id: link.id },
    });
  }

  /**
   * Enable a previously installed (but disabled) skill for an agent.
   */
  async enableSkill(agentId: string, skillKey: string) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    const link = await db.agentSkillLink.findUnique({
      where: {
        agentId_skillId: { agentId, skillId: skill.id },
      },
    });

    if (!link) {
      throw new Error(`Skill ${skillKey} is not installed for agent ${agentId}. Install it first.`);
    }

    return db.agentSkillLink.update({
      where: { id: link.id },
      data: { enabled: true },
    });
  }

  /**
   * Disable a skill for an agent (keeps the link but marks it as disabled).
   */
  async disableSkill(agentId: string, skillKey: string) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    const link = await db.agentSkillLink.findUnique({
      where: {
        agentId_skillId: { agentId, skillId: skill.id },
      },
    });

    if (!link) {
      throw new Error(`Skill ${skillKey} is not installed for agent ${agentId}. Install it first.`);
    }

    return db.agentSkillLink.update({
      where: { id: link.id },
      data: { enabled: false },
    });
  }

  // ── Agent & Skill Lookup ───────────────────────────────────

  /**
   * Get all skills installed for an agent, including the skill definition details.
   */
  async getAgentSkills(agentId: string) {
    return db.agentSkillLink.findMany({
      where: { agentId },
      include: { skill: true },
      orderBy: { installedAt: 'desc' },
    });
  }

  /**
   * Get all agents that have a specific skill installed.
   */
  async getSkillAgents(skillKey: string) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    return db.agentSkillLink.findMany({
      where: { skillId: skill.id },
      include: { agent: true },
      orderBy: { installedAt: 'desc' },
    });
  }

  // ── Usage Logging ──────────────────────────────────────────

  /**
   * Log a skill usage event.
   */
  async logUsage(
    skillKey: string,
    agentId?: string,
    action: string = 'execute',
    success: boolean = true,
    durationMs?: number
  ) {
    const skill = await this.getSkill(skillKey);
    if (!skill) {
      throw new Error(`Skill not found: ${skillKey}`);
    }

    return db.skillUsageLog.create({
      data: {
        skillId: skill.id,
        agentId: agentId ?? null,
        action,
        success,
        durationMs: durationMs ?? null,
      },
    });
  }

  // ── Seeding ────────────────────────────────────────────────

  /**
   * Seed the 40+ default skills into the database.
   * Uses upsert by key — existing skills are updated, new ones are created.
   * Returns counts of created, updated, and skipped records.
   */
  async seedDefaults(): Promise<SeedResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const def of DEFAULT_SKILLS) {
      try {
        const result = await db.skillDefinition.upsert({
          where: { key: def.key },
          create: {
            key: def.key,
            name: def.name,
            description: def.description,
            category: def.category,
            icon: def.icon,
            version: def.version,
            status: def.status,
            requiredTools: JSON.stringify(def.requiredTools),
            tags: JSON.stringify(def.tags),
          },
          update: {
            name: def.name,
            description: def.description,
            category: def.category,
            icon: def.icon,
            version: def.version,
            status: def.status,
            requiredTools: JSON.stringify(def.requiredTools),
            tags: JSON.stringify(def.tags),
          },
        });

        // Check if it was created or updated by comparing createdAt and updatedAt
        const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        logger.error({ err: error }, `[SkillRegistryService] Failed to seed skill "${def.key}":`);
        skipped++;
      }
    }

    logger.info(
      `[SkillRegistryService] Seed complete: ${created} created, ${updated} updated, ${skipped} skipped`
    );

    return { created, updated, skipped };
  }

  // ── Utility ────────────────────────────────────────────────

  /**
   * Get counts by category.
   */
  async getCategoryCounts() {
    const skills = await db.skillDefinition.findMany({
      select: { category: true },
    });

    const counts: Record<string, number> = {};
    for (const s of skills) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get total number of skill definitions.
   */
  async getSkillCount() {
    return db.skillDefinition.count();
  }
}

export const skillRegistryService = SkillRegistryService.getInstance();
