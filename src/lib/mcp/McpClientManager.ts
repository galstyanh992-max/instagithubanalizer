import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { pino } from 'pino';

const logger = pino({ name: 'mcp-manager' });

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class McpClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  private static instance: McpClientManager;

  public static getInstance(): McpClientManager {
    // Handling Next.js HMR
    if (!(global as any).__mcpClientManager) {
      (global as any).__mcpClientManager = new McpClientManager();
    }
    return (global as any).__mcpClientManager;
  }

  /**
   * Connects to an MCP server via stdio.
   */
  public async connect(config: McpServerConfig): Promise<Client> {
    if (this.clients.has(config.name)) {
      return this.clients.get(config.name)!;
    }

    logger.info({ serverName: config.name }, 'Starting MCP server');

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...process.env,
        ...(config.env || {}),
      } as any,
    });

    const client = new Client(
      {
        name: 'agent-os',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    
    this.clients.set(config.name, client);
    this.transports.set(config.name, transport);

    logger.info({ serverName: config.name }, 'MCP server connected successfully');

    return client;
  }

  /**
   * Returns an active client.
   */
  public getClient(name: string): Client | undefined {
    return this.clients.get(name);
  }

  /**
   * Disconnects a specific MCP server.
   */
  public async disconnect(name: string): Promise<void> {
    const transport = this.transports.get(name);
    if (transport) {
      await transport.close();
      this.transports.delete(name);
      this.clients.delete(name);
      logger.info({ serverName: name }, 'MCP server disconnected');
    }
  }

  /**
   * Disconnects all MCP servers.
   */
  public async disconnectAll(): Promise<void> {
    for (const name of this.clients.keys()) {
      await this.disconnect(name);
    }
  }
}

export const mcpClientManager = McpClientManager.getInstance();
