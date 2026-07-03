// ─── Agent OS — Stage 3: Tool Executor ──────────────────────────
// Validates tool arguments, checks permissions, and executes tools.
// This is the bridge between the model's tool_calls and the actual
// tool implementations.
//
// Flow:
// 1. Model returns tool_calls in its response
// 2. Runtime passes tool_calls to ToolExecutor
// 3. For each tool call:
//    a. Resolve tool from registry
//    b. Check agent's permission level
//    c. Validate arguments against schema
//    d. Execute the tool
//    e. Return structured result

import type {
  ITool,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolPermission,
} from './types';
import { ToolValidationError, ToolPermissionError } from './types';
import { toolRegistry } from './registry';
import type { ToolCall } from '../ai-provider/types';
import type { AgentConfig } from '../agent-core/types';

// ─── Permission Hierarchy ────────────────────────────────────

const PERMISSION_HIERARCHY: Record<ToolPermission, number> = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
};

/**
 * Check if a granted permission level satisfies a required level.
 */
function hasPermission(granted: ToolPermission, required: ToolPermission): boolean {
  return PERMISSION_HIERARCHY[granted] >= PERMISSION_HIERARCHY[required];
}

// ─── Schema Validation ───────────────────────────────────────

/**
 * Validate arguments against a tool's input schema.
 * Basic validation — checks required fields and type hints.
 * For production, consider using Zod or AJV for full JSON Schema validation.
 */
function validateArguments(
  args: Record<string, unknown>,
  tool: ITool,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const schema = tool.inputSchema;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (args[field] === undefined || args[field] === null) {
        violations.push(`Missing required field: "${field}"`);
      }
    }
  }

  // Basic type checking against properties
  if (schema.properties) {
    for (const [key, value] of Object.entries(args)) {
      const propSchema = schema.properties[key] as Record<string, unknown> | undefined;
      if (propSchema && typeof propSchema === 'object' && propSchema.type) {
        const expectedType = propSchema.type as string;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType === 'number' && typeof value !== 'number') {
          violations.push(`Field "${key}" should be number, got ${actualType}`);
        } else if (expectedType === 'string' && typeof value !== 'string') {
          violations.push(`Field "${key}" should be string, got ${actualType}`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          violations.push(`Field "${key}" should be boolean, got ${actualType}`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          violations.push(`Field "${key}" should be array, got ${actualType}`);
        } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          violations.push(`Field "${key}" should be object, got ${actualType}`);
        }
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

// ─── Tool Executor ───────────────────────────────────────────

class ToolExecutor {
  private static instance: ToolExecutor | null = null;

  private constructor() {}

  static getInstance(): ToolExecutor {
    if (!ToolExecutor.instance) {
      ToolExecutor.instance = new ToolExecutor();
    }
    return ToolExecutor.instance;
  }

  /**
   * Execute a single tool call from the model.
   *
   * Steps:
   * 1. Resolve tool from registry
   * 2. Check agent's permission level against tool's requirement
   * 3. Validate arguments against schema
   * 4. Execute the tool
   * 5. Return structured result
   */
  async executeToolCall(
    toolCall: ToolCall,
    agentConfig: AgentConfig,
    correlationId?: string,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const functionName = toolCall.function.name;

    try {
      // 1. Resolve tool from registry
      const tool = this.resolveTool(functionName);

      // 2. Check agent's permission level
      this.checkPermission(tool, agentConfig);

      // 3. Parse and validate arguments
      const args = this.parseArguments(toolCall.function.arguments, tool);

      // Security Guardrail: Terminal Tool Approval Middleware
      if (functionName === 'terminal.exec' && typeof args.command === 'string') {
        const commandStr = args.command as string;
        const DANGEROUS_COMMANDS = ['rm', 'sudo', 'curl', 'wget', 'chmod', 'chown'];
        const isDangerous = DANGEROUS_COMMANDS.some(cmd => commandStr.includes(cmd));
        if (isDangerous) {
          return {
            success: false,
            toolCallId: toolCall.id,
            functionName,
            content: '{"status":"needs_approval","reason":"High-risk shell command detected. Action aborted."}',
            durationMs: Date.now() - startTime,
          };
        }
      }

      // 4. Execute
      const context: ToolExecutionContext = {
        agentId: agentConfig.id,
        agentRole: agentConfig.role,
        toolCallId: toolCall.id,
        functionName,
        args,
        correlationId,
      };

      const result = await tool.execute(context);

      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        toolCallId: toolCall.id,
        functionName,
        content: error instanceof Error ? error.message : 'Tool execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence.
   * Returns results for all calls, even if some fail.
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    agentConfig: AgentConfig,
    correlationId?: string,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeToolCall(toolCall, agentConfig, correlationId);
      results.push(result);
    }

    return results;
  }

  // ── Private Helpers ─────────────────────────────────────────

  private resolveTool(functionName: string): ITool {
    // Try exact match first
    if (toolRegistry.has(functionName)) {
      return toolRegistry.getOrThrow(functionName);
    }

    // Try matching by tool function name
    const allTools = toolRegistry.listAll();
    const tool = allTools.find((t) => t.functionDefinition.name === functionName);
    if (tool) return tool;

    throw new Error(
      `Tool function not found: "${functionName}". Available: [${toolRegistry.listIds().join(', ')}]`
    );
  }

  private checkPermission(tool: ITool, agentConfig: AgentConfig): void {
    // Find the agent's tool reference to get their permission level
    const toolRef = agentConfig.tools.find(
      (t) => t.toolId === tool.id || t.toolId === tool.functionDefinition.name
    );

    // If the agent doesn't have this tool in their config, deny access
    if (!toolRef) {
      throw new ToolPermissionError(
        `Agent "${agentConfig.id}" does not have access to tool "${tool.id}"`,
        tool.id,
        agentConfig.id,
        tool.requiredPermission,
        'none' as ToolPermission,
      );
    }

    // Check if the tool is enabled for this agent
    if (!toolRef.enabled) {
      throw new ToolPermissionError(
        `Tool "${tool.id}" is disabled for agent "${agentConfig.id}"`,
        tool.id,
        agentConfig.id,
        tool.requiredPermission,
        'none' as ToolPermission,
      );
    }

    // Check permission level
    const agentPermission = toolRef.requiredPermission;
    if (!hasPermission(agentPermission, tool.requiredPermission)) {
      throw new ToolPermissionError(
        `Agent "${agentConfig.id}" has ${agentPermission} permission for tool "${tool.id}", but ${tool.requiredPermission} is required`,
        tool.id,
        agentConfig.id,
        tool.requiredPermission,
        agentPermission,
      );
    }
  }

  private parseArguments(argsString: string, tool: ITool): Record<string, unknown> {
    let args: Record<string, unknown>;

    try {
      args = JSON.parse(argsString);
    } catch {
      throw new ToolValidationError(
        `Invalid JSON in tool arguments for "${tool.id}"`,
        tool.id,
        [`Failed to parse arguments: ${argsString}`],
      );
    }

    // Validate against schema
    const { valid, violations } = validateArguments(args, tool);
    if (!valid) {
      throw new ToolValidationError(
        `Invalid arguments for tool "${tool.id}": ${violations.join('; ')}`,
        tool.id,
        violations,
      );
    }

    return args;
  }
}

export const toolExecutor = ToolExecutor.getInstance();
