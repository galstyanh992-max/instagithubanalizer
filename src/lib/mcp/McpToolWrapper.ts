import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolPermission } from '../tools/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';

export class McpToolWrapper implements ITool {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly requiredPermission: ToolPermission;
  public readonly inputSchema: any;
  public readonly functionDefinition: any;

  constructor(
    private readonly client: Client,
    private readonly mcpServerName: string,
    private readonly mcpTool: McpTool,
    permission: ToolPermission = 'none'
  ) {
    this.id = `mcp.${this.mcpServerName}.${this.mcpTool.name}`;
    this.name = `${this.mcpServerName}: ${this.mcpTool.name}`;
    this.description = this.mcpTool.description || `MCP Tool from ${this.mcpServerName}`;
    this.requiredPermission = permission;
    
    // Map MCP JSON Schema to our inputSchema format
    this.inputSchema = this.mcpTool.inputSchema;
    
    this.functionDefinition = {
      name: this.mcpTool.name, // Keep the exact name for the MCP server
      description: this.description,
      parameters: this.mcpTool.inputSchema,
    };
  }

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      // Call the MCP server
      const result = await this.client.callTool({
        name: this.mcpTool.name,
        arguments: context.args,
      });

      // Extract text content from MCP result format
      let contentString = '';
      if (result.content && Array.isArray(result.content)) {
        contentString = result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
      }

      if (result.isError) {
        return {
          success: false,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: contentString || 'Unknown MCP error',
          error: contentString,
          durationMs: Date.now() - start,
        };
      }

      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: contentString || 'Success (no output)',
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  }
}
