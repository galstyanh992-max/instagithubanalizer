// ─── Agent OS — Agent Permission Service ─────────────────────
// Manages agent permissions: access levels, constraints, enforcement.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { PermissionLevel } from './types';

// ─── Permission Level Hierarchy ──────────────────────────────

const PERMISSION_HIERARCHY: Record<string, number> = {
  [PermissionLevel.NONE]: 0,
  [PermissionLevel.READ]: 1,
  [PermissionLevel.WRITE]: 2,
  [PermissionLevel.ADMIN]: 3,
};

// ─── Default Permissions per Role ────────────────────────────

interface RolePermission {
  permissionKey: string;
  permissionLevel: string;
}

// Common baseline for ALL agents
const COMMON_PERMISSIONS: RolePermission[] = [
  { permissionKey: 'files', permissionLevel: 'read' },
  { permissionKey: 'documents', permissionLevel: 'read' },
  { permissionKey: 'browser', permissionLevel: 'read' },
  { permissionKey: 'rag', permissionLevel: 'read' },
  { permissionKey: 'ocr', permissionLevel: 'none' },
  { permissionKey: 'translation', permissionLevel: 'none' },
  { permissionKey: 'deployment', permissionLevel: 'none' },
  { permissionKey: 'secrets', permissionLevel: 'none' },
  { permissionKey: 'payments', permissionLevel: 'none' },
  { permissionKey: 'terminal', permissionLevel: 'none' },
  { permissionKey: 'git', permissionLevel: 'none' },
  { permissionKey: 'database', permissionLevel: 'none' },
];

// Role-specific overrides (merged on top of common baseline)
const ROLE_OVERRIDES: Record<string, RolePermission[]> = {
  orchestrator: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'browser', permissionLevel: 'write' },
    { permissionKey: 'database', permissionLevel: 'read' },
    { permissionKey: 'deployment', permissionLevel: 'read' },
  ],
  analyst: [
    { permissionKey: 'files', permissionLevel: 'read' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'browser', permissionLevel: 'write' },
    { permissionKey: 'database', permissionLevel: 'read' },
  ],
  architect: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'database', permissionLevel: 'read' },
    { permissionKey: 'git', permissionLevel: 'read' },
  ],
  designer: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'browser', permissionLevel: 'write' },
  ],
  frontend_engineer: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'browser', permissionLevel: 'write' },
    { permissionKey: 'git', permissionLevel: 'write' },
    { permissionKey: 'terminal', permissionLevel: 'read' },
  ],
  backend_engineer: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'database', permissionLevel: 'write' },
    { permissionKey: 'git', permissionLevel: 'write' },
    { permissionKey: 'terminal', permissionLevel: 'write' },
    { permissionKey: 'secrets', permissionLevel: 'read' },
  ],
  data_engineer: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'database', permissionLevel: 'write' },
    { permissionKey: 'git', permissionLevel: 'read' },
    { permissionKey: 'terminal', permissionLevel: 'write' },
  ],
  qa_engineer: [
    { permissionKey: 'files', permissionLevel: 'read' },
    { permissionKey: 'documents', permissionLevel: 'write' },
    { permissionKey: 'browser', permissionLevel: 'write' },
    { permissionKey: 'terminal', permissionLevel: 'read' },
    { permissionKey: 'database', permissionLevel: 'read' },
  ],
  devops_engineer: [
    { permissionKey: 'files', permissionLevel: 'write' },
    { permissionKey: 'terminal', permissionLevel: 'write' },
    { permissionKey: 'git', permissionLevel: 'write' },
    { permissionKey: 'deployment', permissionLevel: 'write' },
    { permissionKey: 'secrets', permissionLevel: 'read' },
    { permissionKey: 'database', permissionLevel: 'read' },
  ],
  researcher: [
    { permissionKey: 'files', permissionLevel: 'read' },
    { permissionKey: 'documents', permissionLevel: 'read' },
    { permissionKey: 'browser', permissionLevel: 'write' },
    { permissionKey: 'rag', permissionLevel: 'write' },
  ],
};

// ─── Agent Permission Service ────────────────────────────────

class AgentPermissionService {
  private static instance: AgentPermissionService | null = null;

  private constructor() {}

  static getInstance(): AgentPermissionService {
    if (!AgentPermissionService.instance) {
      AgentPermissionService.instance = new AgentPermissionService();
    }
    return AgentPermissionService.instance;
  }

  /**
   * Get all permissions for an agent, parsing JSON fields
   */
  async getAgentPermissions(agentId: string) {
    const permissions = await db.agentPermission.findMany({
      where: { agentId },
      orderBy: { permissionKey: 'asc' },
    });

    return permissions.map((perm) => ({
      ...perm,
      constraints: perm.constraints ? JSON.parse(perm.constraints) : null,
    }));
  }

  /**
   * Set (upsert) a permission for an agent and emit event
   */
  async setAgentPermission(
    agentId: string,
    permissionKey: string,
    permissionLevel: string,
    constraints?: Record<string, unknown>
  ) {
    const permission = await db.agentPermission.upsert({
      where: {
        agentId_permissionKey: {
          agentId,
          permissionKey,
        },
      },
      update: {
        permissionLevel,
        ...(constraints !== undefined ? { constraints: JSON.stringify(constraints) } : {}),
        enabled: true,
      },
      create: {
        agentId,
        permissionKey,
        permissionLevel,
        constraints: constraints ? JSON.stringify(constraints) : null,
        enabled: true,
      },
    });

    await eventBus.emit(EventTypes.AGENT_PERMISSION_UPDATED, {
      agentId,
      permissionKey,
      permissionLevel,
      enabled: permission.enabled,
      timestamp: Date.now(),
      source: 'agent-permission-service',
    });

    return {
      ...permission,
      constraints: permission.constraints ? JSON.parse(permission.constraints) : null,
    };
  }

  /**
   * Check if an agent has sufficient permission level for a given action.
   * Permission hierarchy: none < read < write < admin
   */
  async canAgentUsePermission(
    agentId: string,
    permissionKey: string,
    requiredLevel: string
  ): Promise<boolean> {
    const permission = await db.agentPermission.findUnique({
      where: {
        agentId_permissionKey: {
          agentId,
          permissionKey,
        },
      },
    });

    if (!permission || !permission.enabled) return false;

    const currentRank = PERMISSION_HIERARCHY[permission.permissionLevel] ?? 0;
    const requiredRank = PERMISSION_HIERARCHY[requiredLevel] ?? 0;

    return currentRank >= requiredRank;
  }

  /**
   * Seed default permissions for an agent based on its role
   */
  async seedPermissionsForAgent(agentId: string, role: string): Promise<{ created: number; skipped: number }> {
    // Build merged permissions: common baseline + role overrides
    const overrides = ROLE_OVERRIDES[role] ?? [];
    const overrideMap = new Map(overrides.map((o) => [o.permissionKey, o.permissionLevel]));

    const mergedPermissions = COMMON_PERMISSIONS.map((base) => ({
      permissionKey: base.permissionKey,
      permissionLevel: overrideMap.get(base.permissionKey) ?? base.permissionLevel,
    }));

    let created = 0;
    let skipped = 0;

    for (const perm of mergedPermissions) {
      const existing = await db.agentPermission.findUnique({
        where: {
          agentId_permissionKey: {
            agentId,
            permissionKey: perm.permissionKey,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.agentPermission.create({
        data: {
          agentId,
          permissionKey: perm.permissionKey,
          permissionLevel: perm.permissionLevel,
          enabled: true,
        },
      });
      created++;
    }

    return { created, skipped };
  }

  /**
   * Ensure all permanent agents in workspace have default permissions
   */
  async ensureDefaultPermissions(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        type: 'permanent',
      },
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const result = await this.seedPermissionsForAgent(agent.id, agent.role);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    return { created: totalCreated, skipped: totalSkipped };
  }

  /**
   * Get default permissions for a role (merged common + overrides)
   */
  getDefaultPermissions(role: string): RolePermission[] {
    const overrides = ROLE_OVERRIDES[role] ?? [];
    const overrideMap = new Map(overrides.map((o) => [o.permissionKey, o.permissionLevel]));

    return COMMON_PERMISSIONS.map((base) => ({
      permissionKey: base.permissionKey,
      permissionLevel: overrideMap.get(base.permissionKey) ?? base.permissionLevel,
    }));
  }
}

export const agentPermissionService = AgentPermissionService.getInstance();
