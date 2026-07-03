// ─── Agent OS — AI Provider Layer Types ────────────────────────
// Core interfaces for the provider/adapter architecture.
// Designed for extensibility: new providers, streaming, tools — all
// without modifying existing code.

// ─── Message Types ───────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  /** For tool-role messages: the tool call ID */
  toolCallId?: string;
  /** For assistant messages: tool calls requested */
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ─── Completion Request ──────────────────────────────────────

export interface CompletionRequest {
  /** Model identifier (provider-specific, e.g. "openai/gpt-4o") */
  model: string;
  /** Conversation messages */
  messages: ChatMessage[];
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0.0–2.0) */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stop sequences */
  stop?: string[];
  /**
   * Extension point for future: tool definitions.
   * Not implemented in this stage — reserved for skills/tools.
   */
  tools?: ToolDefinition[];
  /**
   * Extension point for future: tool choice strategy.
   * Not implemented in this stage.
   */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  /**
   * Extra provider-specific options.
   * Isolated here to avoid polluting the main interface.
   */
  providerOptions?: Record<string, unknown>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ─── Completion Response ─────────────────────────────────────

export interface CompletionResponse {
  /** Generated text content */
  content: string | null;
  /** Model that actually handled the request */
  model: string;
  /** Finish reason: "stop", "length", "tool_calls", etc. */
  finishReason: string | null;
  /** Token usage stats */
  usage: TokenUsage;
  /** Tool calls if model requested them (reserved for future) */
  toolCalls?: ToolCall[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── Provider Interface ──────────────────────────────────────

export interface AIProvider {
  /** Unique provider identifier (e.g. "openrouter", "openai") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Check if the provider is configured and available */
  isAvailable(): Promise<boolean>;
  /** Execute a completion request */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  /** List supported model IDs (optional — for UI display) */
  listModels?(): Promise<ModelInfo[]>;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  capabilities?: string[];
}

// ─── Provider Error Types ────────────────────────────────────

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly code: ProviderErrorCode,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export type ProviderErrorCode =
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'UNKNOWN';

// ─── Resolved Model ──────────────────────────────────────────
// Result of model resolution for an agent (from AgentModelConfigService)

export interface ResolvedModel {
  provider: string;
  model: string;
  preferenceType: string;
  maxCostPerTask?: number | null;
  maxTokens?: number | null;
}

// ─── Agent Execution Result ──────────────────────────────────

export interface AgentExecutionResult {
  agentId: string;
  response: CompletionResponse;
  resolvedModel: ResolvedModel;
  durationMs: number;
}
