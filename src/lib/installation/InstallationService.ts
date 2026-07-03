// ─── Agent OS — Installation Service ──────────────────────────
// Skill/Tool installation orchestration for agents.
// Handles install, uninstall, enable/disable, and pack operations.
// Logs all actions via SkillUsageLog and ToolUsageLog.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────

export interface InstallResult {
  success: boolean;
  message: string;
  id?: string;
}

export interface PackInstallResult {
  packKey: string;
  total: number;
  installed: number;
  skipped: number;
  errors: string[];
}

// ─── Installation Service ─────────────────────────────────────

class InstallationService {
  private static instance: InstallationService | null = null;

  private constructor() {}

  static getInstance(): InstallationService {
    if (!InstallationService.instance) {
      InstallationService.instance = new InstallationService();
    }
    return InstallationService.instance;
  }

  // ── Install Skill ─────────────────────────────────────────────

  /**
   * Install a skill to an agent.
   * Creates AgentSkillLink and increments installCount on the skill.
   */
  async installSkill(agentId: string, skillKey: string): Promise<InstallResult> {
    const skill = await db.skillDefinition.findUnique({ where: { key: skillKey } });
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillKey}` };
    }

    // Check if already installed
    const existing = await db.agentSkillLink.findUnique({
      where: { agentId_skillId: { agentId, skillId: skill.id } },
    });

    if (existing) {
      // Re-enable if disabled/uninstalled
      if (!existing.installed || !existing.enabled) {
        await db.agentSkillLink.update({
          where: { id: existing.id },
          data: { installed: true, enabled: true, installedAt: new Date() },
        });

        await this.logSkillAction(skill.id, agentId, 'install');
        return { success: true, message: `Skill "${skillKey}" re-installed`, id: existing.id };
      }
      return { success: true, message: `Skill "${skillKey}" already installed`, id: existing.id };
    }

    // Create new link
    const link = await db.agentSkillLink.create({
      data: {
        agentId,
        skillId: skill.id,
        enabled: true,
        installed: true,
        score: 50,
      },
    });

    // Increment install count
    await db.skillDefinition.update({
      where: { id: skill.id },
      data: { installCount: { increment: 1 } },
    });

    await this.logSkillAction(skill.id, agentId, 'install');

    return { success: true, message: `Skill "${skillKey}" installed`, id: link.id };
  }

  // ── Uninstall Skill ───────────────────────────────────────────

  /**
   * Uninstall a skill from an agent.
   */
  async uninstallSkill(agentId: string, skillKey: string): Promise<InstallResult> {
    const skill = await db.skillDefinition.findUnique({ where: { key: skillKey } });
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillKey}` };
    }

    const link = await db.agentSkillLink.findUnique({
      where: { agentId_skillId: { agentId, skillId: skill.id } },
    });

    if (!link || !link.installed) {
      return { success: false, message: `Skill "${skillKey}" not installed on this agent` };
    }

    await db.agentSkillLink.update({
      where: { id: link.id },
      data: { installed: false, enabled: false },
    });

    await this.logSkillAction(skill.id, agentId, 'uninstall');

    return { success: true, message: `Skill "${skillKey}" uninstalled` };
  }

  // ── Install Tool ──────────────────────────────────────────────

  /**
   * Install a tool to an agent.
   * Creates AgentToolLink.
   */
  async installTool(agentId: string, toolKey: string): Promise<InstallResult> {
    const tool = await db.tool.findFirst({ where: { key: toolKey } });
    if (!tool) {
      return { success: false, message: `Tool not found: ${toolKey}` };
    }

    const existing = await db.agentToolLink.findUnique({
      where: { agentId_toolId: { agentId, toolId: tool.id } },
    });

    if (existing) {
      if (!existing.installed || !existing.enabled) {
        await db.agentToolLink.update({
          where: { id: existing.id },
          data: { installed: true, enabled: true, installedAt: new Date() },
        });

        await this.logToolAction(tool.id, agentId, 'install');
        return { success: true, message: `Tool "${toolKey}" re-installed`, id: existing.id };
      }
      return { success: true, message: `Tool "${toolKey}" already installed`, id: existing.id };
    }

    const link = await db.agentToolLink.create({
      data: {
        agentId,
        toolId: tool.id,
        enabled: true,
        installed: true,
      },
    });

    await this.logToolAction(tool.id, agentId, 'install');

    return { success: true, message: `Tool "${toolKey}" installed`, id: link.id };
  }

  // ── Uninstall Tool ────────────────────────────────────────────

  /**
   * Uninstall a tool from an agent.
   */
  async uninstallTool(agentId: string, toolKey: string): Promise<InstallResult> {
    const tool = await db.tool.findFirst({ where: { key: toolKey } });
    if (!tool) {
      return { success: false, message: `Tool not found: ${toolKey}` };
    }

    const link = await db.agentToolLink.findUnique({
      where: { agentId_toolId: { agentId, toolId: tool.id } },
    });

    if (!link || !link.installed) {
      return { success: false, message: `Tool "${toolKey}" not installed on this agent` };
    }

    await db.agentToolLink.update({
      where: { id: link.id },
      data: { installed: false, enabled: false },
    });

    await this.logToolAction(tool.id, agentId, 'uninstall');

    return { success: true, message: `Tool "${toolKey}" uninstalled` };
  }

  // ── Enable Skill ──────────────────────────────────────────────

  /**
   * Enable a previously installed skill.
   */
  async enableSkill(agentId: string, skillKey: string): Promise<InstallResult> {
    const skill = await db.skillDefinition.findUnique({ where: { key: skillKey } });
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillKey}` };
    }

    const link = await db.agentSkillLink.findUnique({
      where: { agentId_skillId: { agentId, skillId: skill.id } },
    });

    if (!link) {
      return { success: false, message: `Skill "${skillKey}" not linked to this agent` };
    }

    if (link.enabled) {
      return { success: true, message: `Skill "${skillKey}" already enabled` };
    }

    await db.agentSkillLink.update({
      where: { id: link.id },
      data: { enabled: true },
    });

    await this.logSkillAction(skill.id, agentId, 'enable');

    return { success: true, message: `Skill "${skillKey}" enabled` };
  }

  // ── Disable Skill ─────────────────────────────────────────────

  /**
   * Disable a skill without uninstalling it.
   */
  async disableSkill(agentId: string, skillKey: string): Promise<InstallResult> {
    const skill = await db.skillDefinition.findUnique({ where: { key: skillKey } });
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillKey}` };
    }

    const link = await db.agentSkillLink.findUnique({
      where: { agentId_skillId: { agentId, skillId: skill.id } },
    });

    if (!link) {
      return { success: false, message: `Skill "${skillKey}" not linked to this agent` };
    }

    if (!link.enabled) {
      return { success: true, message: `Skill "${skillKey}" already disabled` };
    }

    await db.agentSkillLink.update({
      where: { id: link.id },
      data: { enabled: false },
    });

    await this.logSkillAction(skill.id, agentId, 'disable');

    return { success: true, message: `Skill "${skillKey}" disabled` };
  }

  // ── Enable Tool ───────────────────────────────────────────────

  /**
   * Enable a previously installed tool.
   */
  async enableTool(agentId: string, toolKey: string): Promise<InstallResult> {
    const tool = await db.tool.findFirst({ where: { key: toolKey } });
    if (!tool) {
      return { success: false, message: `Tool not found: ${toolKey}` };
    }

    const link = await db.agentToolLink.findUnique({
      where: { agentId_toolId: { agentId, toolId: tool.id } },
    });

    if (!link) {
      return { success: false, message: `Tool "${toolKey}" not linked to this agent` };
    }

    if (link.enabled) {
      return { success: true, message: `Tool "${toolKey}" already enabled` };
    }

    await db.agentToolLink.update({
      where: { id: link.id },
      data: { enabled: true },
    });

    await this.logToolAction(tool.id, agentId, 'enable');

    return { success: true, message: `Tool "${toolKey}" enabled` };
  }

  // ── Disable Tool ──────────────────────────────────────────────

  /**
   * Disable a tool without uninstalling it.
   */
  async disableTool(agentId: string, toolKey: string): Promise<InstallResult> {
    const tool = await db.tool.findFirst({ where: { key: toolKey } });
    if (!tool) {
      return { success: false, message: `Tool not found: ${toolKey}` };
    }

    const link = await db.agentToolLink.findUnique({
      where: { agentId_toolId: { agentId, toolId: tool.id } },
    });

    if (!link) {
      return { success: false, message: `Tool "${toolKey}" not linked to this agent` };
    }

    if (!link.enabled) {
      return { success: true, message: `Tool "${toolKey}" already disabled` };
    }

    await db.agentToolLink.update({
      where: { id: link.id },
      data: { enabled: false },
    });

    await this.logToolAction(tool.id, agentId, 'disable');

    return { success: true, message: `Tool "${toolKey}" disabled` };
  }

  // ── Install Pack ──────────────────────────────────────────────

  /**
   * Install all items from a skill or tool pack to an agent.
   */
  async installPack(
    packKey: string,
    agentId: string,
    packType: 'skill' | 'tool'
  ): Promise<PackInstallResult> {
    const result: PackInstallResult = {
      packKey,
      total: 0,
      installed: 0,
      skipped: 0,
      errors: [],
    };

    if (packType === 'skill') {
      const pack = await db.skillPack.findUnique({ where: { key: packKey } });
      if (!pack) {
        result.errors.push(`Skill pack not found: ${packKey}`);
        return result;
      }

      const items = await db.skillPackItem.findMany({
        where: { packId: pack.id },
        include: { skill: true },
      });

      result.total = items.length;

      for (const item of items) {
        const installResult = await this.installSkill(agentId, item.skill.key);
        if (installResult.success) {
          result.installed++;
        } else {
          result.errors.push(installResult.message);
          result.skipped++;
        }
      }

      // Increment pack install count
      await db.skillPack.update({
        where: { id: pack.id },
        data: { installCount: { increment: 1 } },
      });
    } else {
      const pack = await db.toolPack.findUnique({ where: { key: packKey } });
      if (!pack) {
        result.errors.push(`Tool pack not found: ${packKey}`);
        return result;
      }

      const items = await db.toolPackItem.findMany({
        where: { packId: pack.id },
        include: { tool: true },
      });

      result.total = items.length;

      for (const item of items) {
        const installResult = await this.installTool(agentId, item.tool.key);
        if (installResult.success) {
          result.installed++;
        } else {
          result.errors.push(installResult.message);
          result.skipped++;
        }
      }

      // Increment pack install count
      await db.toolPack.update({
        where: { id: pack.id },
        data: { installCount: { increment: 1 } },
      });
    }

    return result;
  }

  // ── Get Installed Skills ──────────────────────────────────────

  /**
   * List all installed skills for an agent.
   */
  async getInstalledSkills(agentId: string) {
    const links = await db.agentSkillLink.findMany({
      where: { agentId, installed: true },
      include: { skill: true },
      orderBy: { installedAt: 'desc' },
    });

    return links.map((link) => ({
      ...link,
      skill: {
        ...link.skill,
        tags: link.skill.tags ? JSON.parse(link.skill.tags) : [],
        requiredTools: link.skill.requiredTools ? JSON.parse(link.skill.requiredTools) : [],
        metadata: link.skill.metadata ? JSON.parse(link.skill.metadata) : null,
      },
      config: link.config ? JSON.parse(link.config) : null,
    }));
  }

  // ── Get Installed Tools ───────────────────────────────────────

  /**
   * List all installed tools for an agent.
   */
  async getInstalledTools(agentId: string) {
    const links = await db.agentToolLink.findMany({
      where: { agentId, installed: true },
      include: { tool: true },
      orderBy: { installedAt: 'desc' },
    });

    return links.map((link) => ({
      ...link,
      tool: {
        ...link.tool,
        configSchema: link.tool.configSchema ? JSON.parse(link.tool.configSchema) : null,
      },
      config: link.config ? JSON.parse(link.config) : null,
    }));
  }

  // ── Private: Log Skill Action ─────────────────────────────────

  private async logSkillAction(
    skillId: string,
    agentId: string,
    action: 'install' | 'uninstall' | 'enable' | 'disable'
  ) {
    try {
      await db.skillUsageLog.create({
        data: {
          skillId,
          agentId,
          action,
          success: true,
          metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
        },
      });
    } catch (error) {
      logger.error({ err: error }, '[InstallationService] Failed to log skill action:');
    }
  }

  // ── Private: Log Tool Action ──────────────────────────────────

  private async logToolAction(
    toolId: string,
    agentId: string,
    action: 'install' | 'uninstall' | 'enable' | 'disable'
  ) {
    try {
      await db.toolUsageLog.create({
        data: {
          toolId,
          agentId,
          action,
          success: true,
          metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
        },
      });
    } catch (error) {
      logger.error({ err: error }, '[InstallationService] Failed to log tool action:');
    }
  }
}

export const installationService = InstallationService.getInstance();
