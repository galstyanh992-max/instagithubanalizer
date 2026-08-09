import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { pino } from 'pino';

const logger = pino({ name: 'mcp-manager' });

export interface McpStdioServerConfig {
  name: string;
  transport?: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface McpHttpServerConfig {
  name: string;
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export interface McpConnectionStatus {
  name: string;
  transport: 'stdio' | 'http';
  connected: boolean;
  state: 'READY' | 'DEGRADED' | 'OFFLINE';
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  connectedAt: string | null;
  latencyMs: number | null;
  error: string | null;
}

function timeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`MCP ${name} не ответил за ${timeoutMs} мс`)), timeoutMs);
    }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function inventory(client: Client): Promise<Pick<McpConnectionStatus, 'toolCount' | 'resourceCount' | 'promptCount'>> {
  const [tools, resources, prompts] = await Promise.all([
    client.listTools().then((result) => result.tools.length),
    client.listResources().then((result) => result.resources.length).catch(() => 0),
    client.listPrompts().then((result) => result.prompts.length).catch(() => 0),
  ]);
  return { toolCount: tools, resourceCount: resources, promptCount: prompts };
}

export class McpClientManager {
  private readonly clients = new Map<string, Client>();
  private readonly transports = new Map<string, Transport>();
  private readonly statuses = new Map<string, McpConnectionStatus>();

  public static getInstance(): McpClientManager {
    const shared = globalThis as typeof globalThis & { __mcpClientManager?: McpClientManager };
    return shared.__mcpClientManager ??= new McpClientManager();
  }

  public async connect(config: McpServerConfig): Promise<Client> {
    const existing = this.clients.get(config.name);
    if (existing) return existing;

    const startedAt = Date.now();
    const transportKind = config.transport === 'http' ? 'http' : 'stdio';
    this.statuses.set(config.name, {
      name: config.name,
      transport: transportKind,
      connected: false,
      state: 'OFFLINE',
      toolCount: 0,
      resourceCount: 0,
      promptCount: 0,
      connectedAt: null,
      latencyMs: null,
      error: null,
    });
    logger.info({ serverName: config.name, transport: transportKind }, 'Starting MCP server');

    const transport: Transport = config.transport === 'http'
      ? new StreamableHTTPClientTransport(new URL(config.url), {
          requestInit: { headers: config.headers },
        })
      : new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
          stderr: 'pipe',
        });
    const client = new Client({ name: 'jarvis-phase-a', version: '1.0.0' }, { capabilities: {} });

    try {
      await timeout(client.connect(transport), config.timeoutMs ?? 30_000, config.name);
      const counts = await timeout(inventory(client), config.timeoutMs ?? 30_000, config.name);
      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);
      this.statuses.set(config.name, {
        name: config.name,
        transport: transportKind,
        connected: true,
        state: counts.toolCount > 0 || counts.resourceCount > 0 || counts.promptCount > 0 ? 'READY' : 'DEGRADED',
        ...counts,
        connectedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        error: null,
      });
      logger.info({ serverName: config.name, ...counts }, 'MCP server connected successfully');
      return client;
    } catch (error) {
      await transport.close().catch(() => undefined);
      this.statuses.set(config.name, {
        name: config.name,
        transport: transportKind,
        connected: false,
        state: 'OFFLINE',
        toolCount: 0,
        resourceCount: 0,
        promptCount: 0,
        connectedAt: null,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getClient(name: string): Client | undefined { return this.clients.get(name); }

  public listConnections(): McpConnectionStatus[] {
    return Array.from(this.statuses.values()).map((status) => ({ ...status }));
  }

  public async disconnect(name: string): Promise<void> {
    const transport = this.transports.get(name);
    if (transport) await transport.close();
    this.transports.delete(name);
    this.clients.delete(name);
    const status = this.statuses.get(name);
    if (status) this.statuses.set(name, { ...status, connected: false, state: 'OFFLINE' });
  }

  public async disconnectAll(): Promise<void> {
    for (const name of Array.from(this.clients.keys())) await this.disconnect(name);
  }
}

export const mcpClientManager = McpClientManager.getInstance();
