// ─── Agent OS — Stage 3: Skill Registry ────────────────────────
// Singleton registry that holds all registered skill implementations.
// Agents reference skills by ID in their config (SkillRef).
// The runtime resolves these references at execution time.
//
// Design principles:
// - Registry is the single source of truth for WHAT skills exist
// - Skills are registered once (at startup) and looked up per-execution
// - New skills can be registered without modifying existing code

import type { ISkill, SkillRegistration, SkillRegistryStats } from './types';
import { logger } from '@/lib/logger';

// ─── Skill Registry ──────────────────────────────────────────

class SkillRegistry {
  private static instance: SkillRegistry | null = null;
  private registrations: Map<string, SkillRegistration> = new Map();

  private constructor() {}

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  // ── Registration ─────────────────────────────────────────────

  /**
   * Register a skill implementation.
   * If a skill with the same ID exists, it will be overwritten with a warning.
   */
  register(skill: ISkill, source: string = 'unknown'): void {
    if (this.registrations.has(skill.id)) {
      logger.warn(`[SkillRegistry] Overwriting existing skill: ${skill.id}`);
    }

    this.registrations.set(skill.id, {
      skill,
      registeredAt: Date.now(),
      source,
    });

    logger.info(`[SkillRegistry] Registered skill: ${skill.id} (${skill.name}) from ${source}`);
  }

  /**
   * Register multiple skills at once.
   */
  registerAll(skills: ISkill[], source: string = 'unknown'): void {
    for (const skill of skills) {
      this.register(skill, source);
    }
  }

  /**
   * Unregister a skill by ID.
   */
  unregister(skillId: string): boolean {
    return this.registrations.delete(skillId);
  }

  // ── Lookup ───────────────────────────────────────────────────

  /**
   * Get a skill by ID.
   */
  get(skillId: string): ISkill | undefined {
    return this.registrations.get(skillId)?.skill;
  }

  /**
   * Get a skill or throw if not found.
   */
  getOrThrow(skillId: string): ISkill {
    const skill = this.get(skillId);
    if (!skill) {
      const registered = Array.from(this.registrations.keys()).join(', ');
      throw new Error(
        `Skill not found in registry: "${skillId}". Registered skills: [${registered}]`
      );
    }
    return skill;
  }

  /**
   * Check if a skill is registered.
   */
  has(skillId: string): boolean {
    return this.registrations.has(skillId);
  }

  /**
   * List all registered skills.
   */
  listAll(): ISkill[] {
    return Array.from(this.registrations.values()).map((r) => r.skill);
  }

  /**
   * List all registered skill IDs.
   */
  listIds(): string[] {
    return Array.from(this.registrations.keys());
  }

  // ── Stats ────────────────────────────────────────────────────

  /**
   * Get registry statistics.
   */
  getStats(): SkillRegistryStats {
    return {
      totalSkills: this.registrations.size,
      skillIds: this.listIds(),
      registrations: Array.from(this.registrations.values()).map((r) => ({
        id: r.skill.id,
        name: r.skill.name,
        version: r.skill.version,
        source: r.source,
      })),
    };
  }

  // ── Reset ────────────────────────────────────────────────────

  /**
   * Clear all registered skills.
   */
  clear(): void {
    this.registrations.clear();
  }
}

export const skillRegistry = SkillRegistry.getInstance();
