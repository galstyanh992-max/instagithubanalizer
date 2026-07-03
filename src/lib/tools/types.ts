// ─── Agent OS — Stage 3: Tools System Types ─────────────────────
// Tools are executable functions that the model can CALL during execution.
// Unlike skills (which wrap the lifecycle), tools are direct integrations
// that the model invokes via function calling.
//
// Key distinction from Skills:
//   Skills = capability/orchestration layer (beforeRun/afterRun/onError)
//   Tools  = executable functions/integrations (called by the model)
//
// Tools have:
//   - Input schema (JSON Schema for validation)
//   - Permission levels (none, read, write, admin)
//   - Agent-scoped access control (which agents can use which tools)
//   - Structured output

// ─── Tool Permission Levels ──────────────────────────────────

export type ToolPermission = 'none' | 'read' | 'write' | 'admin';

// ─── Tool Input Schema ───────────────────────────────────────

/**
 * JSON Schema for tool input validation.
 * Follows the OpenAI function calling parameter schema format.
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

// ─── Tool Execution Context ──────────────────────────────────

/**
 * Context provided to a tool during execution.
 * Contains everything the tool needs to know about who's calling it.
 */
export interface ToolExecutionContext {
  /** The ID of the agent invoking the tool */
  agentId: string;
  /** The agent's role */
  agentRole: string;
  /** The tool call ID from the model (for response correlation) */
  toolCallId: string;
  /** The function name that was called */
  functionName: string;
  /** Parsed and validated arguments */
  args: Record<string, unknown>;
  /** Correlation ID for tracing */
  correlationId?: string;
}

// ─── Tool Execution Result ───────────────────────────────────

/**
 * Result of a tool execution.
 * This is what gets fed back to the model as a tool-role message.
 */
export interface ToolExecutionResult {
  /** Whether the tool executed successfully */
  success: boolean;
  /** The tool call ID this result corresponds to */
  toolCallId: string;
  /** The function name that was called */
  functionName: string;
  /** The result content (string for the model) */
  content: string;
  /** Error message if success is false */
  error?: string;
  /** Execution duration in ms */
  durationMs: number;
  /** Additional metadata for logging/auditing */
  metadata?: Record<string, unknown>;
}

// ─── Tool Interface ──────────────────────────────────────────

/**
 * ITool — the core tool contract.
 *
 * A tool is an executable function that the model can call during execution.
 * Tools define their input schema (for validation), permission requirements,
 * and execution logic.
 *
 * New tools can be added without modifying the runtime core.
 * Just implement ITool and register it in the ToolRegistry.
 */
export interface ITool {
  /** Unique tool identifier (e.g. "calculator", "http_request") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** What this tool does */
  readonly description: string;
  /** Tool version for compatibility tracking */
  readonly version?: string;
  /** Required permission level to use this tool */
  readonly requiredPermission: ToolPermission;
  /** Input schema for argument validation */
  readonly inputSchema: ToolInputSchema;
  /** The function definition to expose to the model */
  readonly functionDefinition: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };

  /**
   * Execute the tool with validated arguments.
   * This is the core execution logic.
   */
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

// ─── Tool Registration ───────────────────────────────────────

export interface ToolRegistration {
  /** The tool implementation */
  tool: ITool;
  /** When the tool was registered */
  registeredAt: number;
  /** Source of registration */
  source: string;
}

// ─── Tool Registry Stats ─────────────────────────────────────

export interface ToolRegistryStats {
  totalTools: number;
  toolIds: string[];
  toolsByPermission: Record<ToolPermission, number>;
  registrations: Array<{
    id: string;
    name: string;
    version?: string;
    permission: ToolPermission;
    source: string;
  }>;
}

// ─── Validation Error ────────────────────────────────────────

export class ToolValidationError extends Error {
  constructor(
    message: string,
    public readonly toolId: string,
    public readonly violations: string[],
  ) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

// ─── Permission Error ────────────────────────────────────────

export class ToolPermissionError extends Error {
  constructor(
    message: string,
    public readonly toolId: string,
    public readonly agentId: string,
    public readonly required: ToolPermission,
    public readonly granted: ToolPermission,
  ) {
    super(message);
    this.name = 'ToolPermissionError';
  }
}
