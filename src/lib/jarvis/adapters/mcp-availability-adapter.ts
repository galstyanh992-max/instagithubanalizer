// ─── JARVIS Agent Network — MCP Availability Adapter ─────────
// Returns MCP server and tool availability without requiring credentials.
// Wraps the existing McpClientManager in a read-only contract.

import { mcpClientManager } from '@/lib/mcp/McpClientManager';

export interface McpServerStatus {
  name: string;
  connected: boolean;
  toolCount: number;
  error?: string;
}

export interface McpAvailabilityResult {
  servers: McpServerStatus[];
  summary: {
    connected: number;
    disconnected: number;
    totalTools: number;
  };
}

// ─── Adapter ─────────────────────────────────────────────────

export async function checkMcpAvailability(): Promise<McpAvailabilityResult> {
  const servers: McpServerStatus[] = [];

  for (const [name, client] of mcpClientManager['clients']?.entries() ?? []) {
    try {
      const response = await client.listTools();
      servers.push({
        name,
        connected: true,
        toolCount: response.tools?.length ?? 0,
      });
    } catch (err) {
      servers.push({
        name,
        connected: false,
        toolCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    servers,
    summary: {
      connected: servers.filter((s) => s.connected).length,
      disconnected: servers.filter((s) => !s.connected).length,
      totalTools: servers.reduce((acc, s) => acc + s.toolCount, 0),
    },
  };
}

/**
 * Returns tool names advertised by an MCP server without invoking them.
 */
export async function listMcpToolNames(serverName: string): Promise<string[]> {
  const client = mcpClientManager.getClient(serverName);
  if (!client) return [];

  try {
    const response = await client.listTools();
    return (response.tools ?? []).map((t) => t.name);
  } catch {
    return [];
  }
}
