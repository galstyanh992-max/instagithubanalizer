// ─── JARVIS Agent Network — Capability Discovery Service ─────
// Discovers tools from the Tool Hub (DB config), runtime tool registry,
// and available MCP clients; returns a unified `ToolCapability` list.

import { toolRegistryService } from '@/lib/tool-hub/ToolRegistryService';
import { toolRegistry } from '@/lib/tools/registry';
import { mcpClientManager } from '@/lib/mcp/McpClientManager';
import type { ToolCapability } from './types';
import type { ToolConfig } from '@/lib/tool-hub/types';

// ─── Helpers ─────────────────────────────────────────────────

function dbToolToCapability(tool: ToolConfig & { id?: string; policies?: { permissionKey: string; requiredLevel: string }[] }): ToolCapability {
  const riskLevel = (tool.riskLevel ?? 'low') as ToolCapability['riskLevel'];
  const category = tool.category as ToolCapability['category'];

  return {
    key: tool.key,
    name: tool.name,
    source: 'default',
    category,
    description: tool.description ?? '',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: true,
    },
    requiredPermission: tool.policies && tool.policies.length > 0
      ? (tool.policies[0].requiredLevel as ToolCapability['requiredPermission'])
      : 'read',
    riskLevel,
    requiresApproval: tool.requiresApproval ?? (riskLevel === 'high' || riskLevel === 'critical'),
    available: tool.enabled ?? true,
    unavailableReason: tool.enabled ? undefined : 'Tool disabled in Tool Registry',
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 1, backoffMs: 500 },
  };
}

function runtimeToolToCapability(tool: ReturnType<typeof toolRegistry.listAll>[number]): ToolCapability {
  const riskLevel: ToolCapability['riskLevel'] =
    tool.requiredPermission === 'admin' ? 'critical' :
    tool.requiredPermission === 'write' ? 'high' :
    tool.requiredPermission === 'read' ? 'low' : 'low';

  return {
    key: tool.id,
    name: tool.name,
    source: 'default',
    category: 'internal',
    description: tool.description,
    inputSchema: tool.inputSchema,
    requiredPermission: tool.requiredPermission,
    riskLevel,
    requiresApproval: riskLevel === 'high' || riskLevel === 'critical',
    available: true,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 1, backoffMs: 500 },
  };
}

// ─── Capability Discovery ────────────────────────────────────

export interface CapabilityDiscoveryResult {
  capabilities: ToolCapability[];
  summary: {
    total: number;
    available: number;
    unavailable: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export async function discoverCapabilities(workspaceId?: string): Promise<CapabilityDiscoveryResult> {
  const capabilities: ToolCapability[] = [];
  const seenKeys = new Set<string>();

  // 1. Tool Hub default / DB tools
  try {
    const dbTools = await toolRegistryService.getTools(workspaceId);
    for (const tool of dbTools) {
      if (seenKeys.has(tool.key)) continue;
      seenKeys.add(tool.key);
      const mapped: ToolConfig & { id?: string; policies?: { permissionKey: string; requiredLevel: string }[] } = {
        name: tool.name,
        key: tool.key,
        category: tool.category,
        description: tool.description ?? '',
        enabled: tool.enabled,
        riskLevel: tool.riskLevel,
        requiresApproval: tool.requiresApproval,
        policies: tool.policies.map((p) => ({ permissionKey: p.permissionKey, requiredLevel: p.requiredLevel })),
      };
      capabilities.push(dbToolToCapability(mapped));
    }
  } catch (err) {
    // Tool Hub may not be seeded; degrade gracefully.
    capabilities.push({
      key: 'tool_hub',
      name: 'Tool Hub',
      source: 'default',
      category: 'internal',
      description: 'Tool Hub discovery unavailable: ' + String(err),
      inputSchema: { type: 'object', properties: {} },
      requiredPermission: 'read',
      riskLevel: 'low',
      requiresApproval: false,
      available: false,
      unavailableReason: 'Tool Hub lookup failed',
      timeoutMs: 0,
      retryPolicy: { maxRetries: 0, backoffMs: 0 },
    });
  }

  // 2. Runtime tool registry (in-memory tools)
  for (const tool of toolRegistry.listAll()) {
    if (seenKeys.has(tool.id)) continue;
    seenKeys.add(tool.id);
    capabilities.push(runtimeToolToCapability(tool));
  }

  // 3. MCP clients (best-effort, no credentials required to list)
  for (const { name: serverName } of mcpClientManager.listConnections()) {
    const client = mcpClientManager.getClient(serverName);
    if (!client) continue;
    try {
      const response = await client.listTools();
      const tools = response.tools ?? [];
      for (const mcpTool of tools) {
        const key = `${serverName}.${mcpTool.name}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        capabilities.push({
          key,
          name: mcpTool.name,
          source: 'mcp',
          category: 'internal',
          description: mcpTool.description ?? `MCP tool from ${serverName}`,
          inputSchema: (mcpTool.inputSchema as ToolCapability['inputSchema']) ?? { type: 'object', properties: {} },
          requiredPermission: 'read',
          riskLevel: 'medium',
          requiresApproval: false,
          available: true,
          timeoutMs: 60000,
          retryPolicy: { maxRetries: 1, backoffMs: 500 },
        });
      }
    } catch {
      // MCP server connected but tool listing failed; skip.
    }
  }

  const summary = {
    total: capabilities.length,
    available: capabilities.filter((c) => c.available).length,
    unavailable: capabilities.filter((c) => !c.available).length,
    bySource: capabilities.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byCategory: capabilities.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return { capabilities, summary };
}
