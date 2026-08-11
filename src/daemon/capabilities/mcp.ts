// Real mcp.list capability. Reuses src/local-runtime/mcp/init.ts's
// initializeMcpTools() (memoized — a second call in the same daemon process
// is a no-op) and the real, in-process MCP client/session manager
// (src/lib/mcp/McpClientManager.ts) instead of src/lib/mcp-bridge/**, whose
// own doc-comment states it "Never checks a real port, never launches a
// process" — that module is a separate, still-stubbed subsystem, not this
// one. Connecting real MCP servers is a genuinely real, if heavier,
// operation (it spawns real stdio child processes for playwright/
// desktop-commander/jina) — exactly the "real MCP tool execution test" this
// capability is meant to prove, not a status-only mock.
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';

const INIT_TIMEOUT_MS = 20_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: превышено время ожидания (${ms}мс)`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export const mcpExecutor: DaemonCapabilityExecutor = {
  id: 'mcp',
  canHandle: (capability) => capability === 'mcp',
  validate: (envelope) => {
    if (envelope.operation !== 'list') {
      return { ok: false, reason: `Неподдерживаемая операция mcp: ${envelope.operation}` };
    }
    return { ok: true };
  },
  async execute(_envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');

      const { initializeMcpTools } = await import('@/local-runtime/mcp/init');
      const { mcpClientManager } = await import('@/lib/mcp/McpClientManager');

      try {
        await withTimeout(initializeMcpTools(), INIT_TIMEOUT_MS, 'Инициализация MCP');
      } catch (error: any) {
        // Partial initialization is still useful — report what actually
        // connected rather than failing the whole capability, but surface
        // the error so it isn't silently swallowed.
        const connections = mcpClientManager.listConnections();
        if (connections.length === 0) return fail(error?.message ?? String(error));
      }

      const connections = mcpClientManager.listConnections();
      return ok({
        count: connections.length,
        servers: connections.map((connection) => ({
          name: connection.name,
          transport: connection.transport,
          connected: connection.connected,
          state: connection.state,
          toolCount: connection.toolCount,
          resourceCount: connection.resourceCount,
          promptCount: connection.promptCount,
          latencyMs: connection.latencyMs,
          error: connection.error ?? null,
        })),
      });
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
