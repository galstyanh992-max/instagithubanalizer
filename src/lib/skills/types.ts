// ─── Agent OS — Stage 3: Skills System Types ────────────────────
// Skills are the capability/orchestration layer.
// They modify HOW an agent executes — they are NOT directly called by the model.
// Instead, they wrap the execution lifecycle: beforeRun, afterRun, onError.
//
// Key distinction from Tools:
//   Skills = "what the agent CAN do" (capabilities, behavioral modifications)
//   Tools  = "what the agent CAN CALL" (executable functions, integrations)
//
// Skills can:
//   - Inject tool definitions (so the model gets access to tools related to this skill)
//   - Append to the system prompt (add skill-specific instructions)
//   - Post-process results (validate, summarize, restructure)
//   - Handle errors (retry, fallback, notify)

import type { ChatMessage, ToolDefinition } from '../ai-provider/types';
import type { AgentConfig, AgentResult } from '../agent-core/types';

// ─── Skill Lifecycle Context ─────────────────────────────────

/**
 * Context passed through skill lifecycle hooks.
 * Extends the agent execution context with skill-specific capabilities.
 */
export interface SkillContext {
  /** The agent's configuration */
  agentConfig: AgentConfig;
  /** The messages being sent to the model */
  messages: ChatMessage[];
  /** Arbitrary data that skills can pass between them */
  data: Record<string, unknown>;
  /** Tool definitions injected by skills (will be merged into the completion request) */
  injectedToolDefinitions: ToolDefinition[];
  /** Appended to the system prompt by skills */
  systemPromptAppendix: string;
}

// ─── Skill Interface ─────────────────────────────────────────

/**
 * ISkill — the core skill contract.
 *
 * A skill is a named, independently-configurable capability that wraps
 * around agent execution. Skills don't execute directly — they modify
 * the execution context and results.
 *
 * New skills can be added without modifying the runtime core.
 * Just implement ISkill and register it in the SkillRegistry.
 */
export interface ISkill {
  /** Unique skill identifier (e.g. "planning", "summarization") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** What this skill does */
  readonly description: string;
  /** Skill version for compatibility tracking */
  readonly version?: string;

  /**
   * Called before the agent execution starts.
   * Can modify context: inject tools, append to system prompt, modify messages.
   * Must return the (possibly modified) context.
   */
  beforeRun(context: SkillContext): Promise<SkillContext>;

  /**
   * Called after the agent execution completes.
   * Can post-process results: validate, summarize, restructure.
   * Must return the (possibly modified) result.
   */
  afterRun(context: SkillContext, result: AgentResult): Promise<AgentResult>;

  /**
   * Called when an error occurs during execution.
   * Can handle the error (retry, fallback) or return null to propagate.
   * Return a modified Error to replace the original, or null to continue propagation.
   */
  onError(context: SkillContext, error: Error): Promise<Error | null>;
}

// ─── Skill Registration ──────────────────────────────────────

/**
 * Describes a skill registration entry in the registry.
 */
export interface SkillRegistration {
  /** The skill implementation */
  skill: ISkill;
  /** When the skill was registered */
  registeredAt: number;
  /** Source of registration (for debugging) */
  source: string;
}

// ─── Skill Stats ─────────────────────────────────────────────

export interface SkillRegistryStats {
  totalSkills: number;
  skillIds: string[];
  registrations: Array<{
    id: string;
    name: string;
    version?: string;
    source: string;
  }>;
}
