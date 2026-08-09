import { join } from 'node:path';
import { mcpClientManager, type McpServerConfig } from './McpClientManager';
import { McpToolWrapper } from './McpToolWrapper';
import { toolRegistry } from '../tools/registry';
import type { ToolPermission } from '../tools/types';
import { pino } from 'pino';

const logger = pino({ name: 'mcp-init' });
let initialization: Promise<void> | null = null;

function permissionFor(name: string): ToolPermission {
  if (/(delete|remove|write|edit|move|create|start_process|kill|terminate|install|navigate|click|type|fill|press|drag|upload)/i.test(name)) return 'write';
  return 'read';
}

function toolAllowed(serverName: string, toolName: string): boolean {
  if (serverName !== 'jina') return true;
  // Never expose the diagnostic token echo tool to JARVIS agents.
  if (toolName === 'show_api_key') return false;
  if (process.env.JINA_API_KEY) return true;
  // Verified no-key subset. read_url/search/classification currently return
  // HTTP 401 without a key and therefore are deliberately not registered.
  return toolName === 'primer' || toolName === 'guess_datetime_url';
}

function serverConfigs(): McpServerConfig[] {
  const configs: McpServerConfig[] = [
    {
      name: 'playwright',
      command: process.execPath,
      args: [join(process.cwd(), 'node_modules', '@playwright', 'mcp', 'cli.js'), '--headless', '--isolated'],
      timeoutMs: 30_000,
    },
    {
      name: 'desktop-commander',
      command: process.platform === 'win32' ? 'cmd.exe' : 'npx',
      args: process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npx --yes --registry https://registry.npmjs.org @wonderwhy-er/desktop-commander@0.2.43']
        : ['--yes', '--registry', 'https://registry.npmjs.org', '@wonderwhy-er/desktop-commander@0.2.43'],
      timeoutMs: 45_000,
    },
    {
      name: 'jina',
      transport: 'http',
      url: 'https://mcp.jina.ai/v1',
      headers: process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : undefined,
      timeoutMs: 30_000,
    },
  ];

  if (process.env.BRAVE_API_KEY) configs.push({
    name: 'brave-search',
    command: 'npx',
    args: ['--yes', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
  });
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) configs.push({
    name: 'github',
    command: 'npx',
    args: ['--yes', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN },
  });
  return configs;
}

async function initialize(): Promise<void> {
  logger.info('Initializing approved MCP servers');
  for (const config of serverConfigs()) {
    try {
      const client = await mcpClientManager.connect(config);
      const tools = await client.listTools();
      const enabledTools = tools.tools.filter((tool) => toolAllowed(config.name, tool.name));
      for (const tool of enabledTools) {
        const wrapper = new McpToolWrapper(client, config.name, tool, permissionFor(tool.name));
        toolRegistry.register(wrapper, `mcp:${config.name}`);
      }
      logger.info({ serverName: config.name, offeredToolCount: tools.tools.length, enabledToolCount: enabledTools.length }, 'MCP tools registered');
    } catch (error) {
      // One unavailable external connector must not hide healthy MCP servers.
      logger.warn({ serverName: config.name, err: error }, 'MCP server unavailable');
    }
  }
}

export function initializeMcpTools(): Promise<void> {
  return initialization ??= initialize().catch((error) => {
    initialization = null;
    throw error;
  });
}
