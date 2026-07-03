// ─── Agent OS — Tool Permission Service ──────────────────────
// Checks agent permissions against ToolPermissionPolicy.
// Bridges Tool Hub tools with AgentPermission system.

import { db } from '../db';
import { agentPermissionService } from '../agent-system/AgentPermissionService';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { ToolPolicyConfig } from './types';

// ─── Permission Level Hierarchy ──────────────────────────────

const PERMISSION_HIERARCHY: Record<string, number> = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
};

class ToolPermissionService {
  private static instance: ToolPermissionService | null = null;

  private constructor() {}

  static getInstance(): ToolPermissionService {
    if (!ToolPermissionService.instance) {
      ToolPermissionService.instance = new ToolPermissionService();
    }
    return ToolPermissionService.instance;
  }

  /**
   * Get all permission policies for a tool
   */
  async getToolPolicies(toolId: string) {
    return db.toolPermissionPolicy.findMany({
      where: { toolId },
      orderBy: { permissionKey: 'asc' },
    });
  }

  /**
   * Set (upsert) a permission policy for a tool
   */
  async setToolPolicy(toolId: string, permissionKey: string, requiredLevel: string, constraints?: Record<string, unknown>) {
    const policy = await db.toolPermissionPolicy.upsert({
      where: {
        toolId_permissionKey: { toolId, permissionKey },
      },
      update: {
        requiredLevel,
        ...(constraints !== undefined ? { constraints: JSON.stringify(constraints) } : {}),
      },
      create: {
        toolId,
        permissionKey,
        requiredLevel,
        constraints: constraints ? JSON.stringify(constraints) : null,
      },
    });

    await eventBus.emit(EventTypes.TOOL_POLICY_UPDATED, {
      toolId,
      permissionKey,
      requiredLevel,
      timestamp: Date.now(),
      source: 'tool-permission-service',
    });

    return {
      ...policy,
      constraints: policy.constraints ? JSON.parse(policy.constraints) : null,
    };
  }

  /**
   * Check if an agent has sufficient permissions to use a tool.
   * Returns { allowed: boolean, reason?: string, failedPolicies?: string[] }
   */
  async checkToolPermission(
    agentId: string,
    toolId: string
  ): Promise<{ allowed: boolean; reason?: string; failedPolicies?: string[] }> {
    // Get tool policies
    const policies = await db.toolPermissionPolicy.findMany({
      where: { toolId },
    });

    // If no policies, tool is accessible to all agents (e.g. internal tools)
    if (policies.length === 0) {
      return { allowed: true };
    }

    // Check each policy against agent permissions
    const failedPolicies: string[] = [];

    for (const policy of policies) {
      const hasPermission = await agentPermissionService.canAgentUsePermission(
        agentId,
        policy.permissionKey,
        policy.requiredLevel
      );

      if (!hasPermission) {
        failedPolicies.push(
          `${policy.permissionKey}:${policy.requiredLevel}`
        );
      }
    }

    if (failedPolicies.length > 0) {
      return {
        allowed: false,
        reason: `Insufficient permissions: ${failedPolicies.join(', ')}`,
        failedPolicies,
      };
    }

    return { allowed: true };
  }

  /**
   * Get required permission levels for a tool (for display/documentation)
   */
  async getRequiredPermissions(toolId: string): Promise<ToolPolicyConfig[]> {
    const policies = await db.toolPermissionPolicy.findMany({
      where: { toolId },
    });

    return policies.map((p) => ({
      permissionKey: p.permissionKey,
      requiredLevel: p.requiredLevel,
      constraints: p.constraints ? JSON.parse(p.constraints) : undefined,
    }));
  }

  /**
   * Compare permission levels — returns positive if a > b
   */
  compareLevels(a: string, b: string): number {
    return (PERMISSION_HIERARCHY[a] ?? 0) - (PERMISSION_HIERARCHY[b] ?? 0);
  }
}

export const toolPermissionService = ToolPermissionService.getInstance();
