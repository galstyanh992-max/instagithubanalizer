import { mcpClientManager } from './McpClientManager';
import { McpToolWrapper } from './McpToolWrapper';
import { toolRegistry } from '../tools/registry';
import { pino } from 'pino';

const logger = pino({ name: 'mcp-init' });

export async function initializeMcpTools(): Promise<void> {
  try {
    logger.info('Initializing MCP servers...');

    // Initialize Brave Search
    if (process.env.BRAVE_API_KEY) {
      const braveClient = await mcpClientManager.connect({
        name: 'brave-search',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY }
      });

      const braveTools = await braveClient.listTools();
      for (const t of braveTools.tools) {
        const wrapper = new McpToolWrapper(braveClient, 'brave-search', t, 'read');
        toolRegistry.register(wrapper, 'mcp:brave-search');
      }
      logger.info('Brave Search MCP tools registered.');
    } else {
      logger.warn('BRAVE_API_KEY is not set. Brave Search MCP will not be loaded.');
    }

    // Initialize GitHub
    if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
      const githubClient = await mcpClientManager.connect({
        name: 'github',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN }
      });

      const githubTools = await githubClient.listTools();
      for (const t of githubTools.tools) {
        const permission = t.name.includes('create') || t.name.includes('update') || t.name.includes('push') || t.name.includes('delete') ? 'write' : 'read';
        const wrapper = new McpToolWrapper(githubClient, 'github', t, permission);
        toolRegistry.register(wrapper, 'mcp:github');
      }
      logger.info('GitHub MCP tools registered.');
    } else {
      logger.warn('GITHUB_PERSONAL_ACCESS_TOKEN is not set. GitHub MCP will not be loaded.');
    }

  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize MCP tools');
  }
}
