// ─── Agent OS — Stage 2: Core Agent Types ─────────────────────
// Defines the complete type system for the agent architecture.
// AgentConfig is the central abstraction — it describes WHAT an agent is.
// AgentRegistry handles WHERE to find agents.
// AgentRuntime handles HOW to run them.

import type { ChatMessage, CompletionResponse, ResolvedModel } from '../ai-provider/types';
export type { ResolvedModel };

// ─── Agent Identity ──────────────────────────────────────────

export type AgentRole =
  | 'orchestrator'
  | 'analyst'
  | 'architect'
  | 'designer'
  | 'frontend_engineer'
  | 'backend_engineer'
  | 'data_engineer'
  | 'qa_engineer'
  | 'devops_engineer'
  | 'security_engineer'
  | 'researcher'
  | 'marketing_lead'
  | 'market_researcher'
  | 'content_strategist'
  | 'growth_manager'
  | 'marketing_analyst'
  | 'trend_analyst'
  | 'copywriter'
  | 'visual_designer'
  | 'video_editor'
  | 'publisher'
  | 'community_manager'
  | 'messenger_support'
  | 'sales_agent'
  | 'brand_guardian'
  | 'competitor_analyst'
  | 'seo_specialist'
  | 'ppc_specialist'
  | 'crm_marketer'
  | 'pr_manager'
  | 'influencer_manager'
  | 'affiliate_manager'
  | 'product_marketing_manager'
  | 'customer_research_specialist'
  | 'cro_specialist'
  | 'marketing_automation_engineer'
  | 'product_manager'
  | 'database_architect'
  | 'ai_architect'
  | 'rag_engineer'
  | 'prompt_engineer'
  | 'security_auditor'
  | 'technical_writer'
  | 'code_reviewer'
  | 'refactoring_specialist'
  | 'performance_optimizer'
  | 'cost_optimizer'
  | 'browser_operator_agent'
  | 'github_operator'
  | 'deployment_operator'
  | 'integration_engineer'
  | 'ai_evaluator'
  | 'self_healing_agent'
  | 'custom';

export type AgentType = 'permanent' | 'temporary';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'waiting_api'
  | 'reviewing'
  | 'waiting_approval'
  | 'done'
  | 'error'
  | 'offline';

// ─── Model Configuration ─────────────────────────────────────

export interface ModelAssignment {
  /** Provider ID (e.g. "openrouter") */
  provider: string;
  /** Model ID (e.g. "anthropic/claude-sonnet-4.6") */
  model: string;
  /** Maximum cost per task in USD */
  maxCostPerTask?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
}

export interface ModelConfig {
  /** Primary model to use */
  preferred: ModelAssignment;
  /** Fallback model if preferred fails */
  fallback?: ModelAssignment;
}

// ─── Execution Settings ──────────────────────────────────────

export interface ExecutionConfig {
  /** Sampling temperature (0.0–2.0), default 0.7 */
  temperature: number;
  /** Maximum tokens for response, default 2048 */
  maxTokens: number;
  /** Top-p sampling, default 1.0 */
  topP: number;
  /** Stop sequences */
  stop?: string[];
  /** Number of retries on retryable errors, default 1 */
  maxRetries: number;
  /** Timeout in ms, default 60000 */
  timeoutMs: number;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  maxRetries: 1,
  timeoutMs: 60000,
};

// ─── Extension Points (Stage 3 Preparation) ─────────────────

/**
 * Skill reference — points to a skill that an agent can use.
 * Skills are higher-level capabilities (e.g. "code_review", "web_search").
 * Full implementation in Stage 3.
 */
export interface SkillRef {
  /** Unique skill identifier */
  skillId: string;
  /** Skill is enabled for this agent */
  enabled: boolean;
  /** Agent-specific configuration for this skill */
  config?: Record<string, unknown>;
}

/**
 * Tool reference — points to a tool that an agent can invoke.
 * Tools are concrete actions (e.g. "filesystem.read", "terminal.exec").
 * Full implementation in Stage 3.
 */
export interface ToolRef {
  /** Unique tool identifier */
  toolId: string;
  /** Tool is enabled for this agent */
  enabled: boolean;
  /** Required permission level */
  requiredPermission: 'none' | 'read' | 'write' | 'admin';
  /** Agent-specific constraints for this tool */
  constraints?: Record<string, unknown>;
}

/**
 * Lifecycle hook — called at specific points during agent execution.
 * This is the plugin mechanism for Stage 3.
 */
export interface AgentHook {
  /** Hook name for debugging */
  name: string;
  /** Called before agent execution starts */
  beforeExecute?: (context: HookContext) => Promise<HookContext>;
  /** Called after agent execution completes (success or failure) */
  afterExecute?: (context: HookContext, result: AgentResult) => Promise<AgentResult>;
  /** Called when an error occurs during execution */
  onError?: (context: HookContext, error: Error) => Promise<Error | null>;
}

/**
 * Context passed through lifecycle hooks.
 * Can be modified by hooks to affect execution.
 */
export interface HookContext {
  /** The agent's configuration */
  agentConfig: AgentConfig;
  /** The input messages */
  messages: ChatMessage[];
  /** The resolved model (after model resolution) */
  resolvedModel?: ResolvedModel;
  /** Arbitrary data that hooks can pass between them */
  data: Record<string, unknown>;
}

// ─── Agent Config ────────────────────────────────────────────

/**
 * AgentConfig — the central abstraction.
 * Describes everything about an agent: who it is, what model it uses,
 * how it should behave, and what extensions it has.
 *
 * This is a pure data object — no behavior, no DB coupling.
 * The runtime uses this to know how to execute the agent.
 */
export interface AgentConfig {
  // ── Identity ─────────────────────────────────────────────
  /** Unique agent identifier (e.g. "orchestrator", "analyst") */
  id: string;
  /** Human-readable technical name */
  name: string;
  /** Human-friendly persona name (e.g. "Alice") */
  humanName: string;
  /** Agent role (determines capabilities and behavior) */
  role: AgentRole;
  /** Agent type (permanent or temporary) */
  type: AgentType;
  /** Description of the agent's purpose */
  description: string;

  // ── System Prompt ────────────────────────────────────────
  /** The system prompt that defines the agent's behavior */
  systemPrompt: string;

  // ── Model ────────────────────────────────────────────────
  /** Model configuration (preferred + fallback) */
  model: ModelConfig;

  // ── Execution ────────────────────────────────────────────
  /** Execution settings (temperature, maxTokens, etc.) */
  execution: ExecutionConfig;

  // ── Extension Points (Stage 3) ───────────────────────────
  /** Skills this agent can use */
  skills: SkillRef[];
  /** Tools this agent can invoke */
  tools: ToolRef[];
  /** Lifecycle hooks for this agent */
  hooks: AgentHook[];

  // ── Metadata ─────────────────────────────────────────────
  /** Visual profile for UI rendering */
  visualProfile: {
    color: string;
    icon: string;
    avatarEmoji: string;
  };
  /** Professional style for behavior */
  professionalStyle: {
    communicationStyle: string;
    decisionMaking: string;
    attentionToDetail: string;
    collaborationStyle: string;
  };
  /** Default office zone */
  defaultZone: string;

  // ── Browser Operator (optional, backward compatible) ──────
  /** How this agent communicates with AI providers. Default: "api" */
  aiProviderMode?: 'api' | 'browser_operator';
  /** Which browser provider to use when aiProviderMode="browser_operator" */
  browserProvider?: 'chatgpt' | 'claude' | 'gemini' | 'zai' | 'custom';
}

// ─── Runtime Types ───────────────────────────────────────────

/**
 * Input for agent execution.
 */
export interface AgentInput {
  /** The user's message */
  message: string;
  /** Conversation history */
  history?: ChatMessage[];
  /** Override model for this request */
  modelOverride?: string;
  /** Override temperature */
  temperature?: number;
  /** Override max tokens */
  maxTokens?: number;
  /** Correlation ID for tracing */
  correlationId?: string;
}

/**
 * Result of agent execution.
 */
export interface AgentResult {
  /** The agent's ID */
  agentId: string;
  /** The generated response content */
  content: string | null;
  /** The model that was actually used */
  model: string;
  /** The resolved model details */
  resolvedModel: ResolvedModel;
  /** Token usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason: string | null;
  /** Execution duration in ms */
  durationMs: number;
  /** Tool calls requested by the model (Stage 3) */
  toolCalls?: unknown[];
  /** Execution status */
  status: 'success' | 'error' | 'timeout';
  /** Error message if status is error */
  error?: string;
}

/**
 * Snapshot of an agent's runtime state.
 */
export interface AgentStateSnapshot {
  agentId: string;
  status: AgentStatus;
  lastActivityAt: number;
  currentActivity: string | null;
  activeTaskId: string | null;
  executionCount: number;
  lastError: string | null;
}

// ─── Registry Types ─────────────────────────────────────────

export interface RegistryStats {
  totalAgents: number;
  permanentAgents: number;
  temporaryAgents: number;
  agentsByRole: Record<string, number>;
  agentsByStatus: Record<string, number>;
}
