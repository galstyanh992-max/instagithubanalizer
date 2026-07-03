// ─── Agent OS — Stage 2: Lifecycle Hooks ────────────────────
// Provides hook composition and execution utilities.
// Hooks are the plugin mechanism — they allow extending agent
// behavior without modifying the runtime itself.

import type { AgentHook, HookContext, AgentResult } from './types';
import { loggers } from '@/lib/logger';

// ─── Hook Composer ──────────────────────────────────────────

/**
 * Compose multiple hooks into a single pipeline.
 * Hooks are executed in order for beforeExecute,
 * and in reverse order for afterExecute (like middleware).
 */
export function composeHooks(hooks: AgentHook[]): AgentHook {
  if (hooks.length === 0) {
    return {
      name: 'noop',
      async beforeExecute(context: HookContext): Promise<HookContext> { return context; },
      async afterExecute(_context: HookContext, result: AgentResult): Promise<AgentResult> { return result; },
      async onError(_context: HookContext, error: Error): Promise<Error | null> { return error; },
    };
  }

  if (hooks.length === 1) {
    return hooks[0];
  }

  return {
    name: `composed:[${hooks.map((h) => h.name).join(',')}]`,

    async beforeExecute(context: HookContext): Promise<HookContext> {
      let ctx = context;
      for (const hook of hooks) {
        if (hook.beforeExecute) {
          ctx = await hook.beforeExecute(ctx);
        }
      }
      return ctx;
    },

    async afterExecute(context: HookContext, result: AgentResult): Promise<AgentResult> {
      let res = result;
      // Execute in reverse order (like unwinding middleware)
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i];
        if (hook.afterExecute) {
          res = await hook.afterExecute(context, res);
        }
      }
      return res;
    },

    async onError(context: HookContext, error: Error): Promise<Error | null> {
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i];
        if (hook.onError) {
          const result = await hook.onError(context, error);
          if (result !== null) {
            // Hook handled the error, return the new error
            return result;
          }
        }
      }
      return null;
    },
  };
}

// ─── Built-in Hooks ────────────────────────────────────────

/**
 * Logging hook — logs execution start/end to console.
 * Useful for debugging and development.
 */
export const loggingHook: AgentHook = {
  name: 'logging',

  async beforeExecute(context: HookContext): Promise<HookContext> {
    loggers.agentRuntime.info(
      `[AgentRuntime] ▶ Starting execution: ${context.agentConfig.name} ` +
      `(${context.agentConfig.id})`
    );
    return context;
  },

  async afterExecute(context: HookContext, result: AgentResult): Promise<AgentResult> {
    loggers.agentRuntime.info(
      `[AgentRuntime] ◀ Completed: ${context.agentConfig.name} ` +
      `→ ${result.status} in ${result.durationMs}ms ` +
      `(${result.usage.totalTokens} tokens)`
    );
    return result;
  },

  async onError(context: HookContext, error: Error): Promise<Error | null> {
    loggers.agentRuntime.error(
      `[AgentRuntime] ✗ Error in ${context.agentConfig.name}: ${error.message}`
    );
    return null; // Don't modify the error
  },
};

/**
 * Cost tracking hook — logs cost information after execution.
 * Uses rough per-model pricing estimates.
 */
export const costTrackingHook: AgentHook = {
  name: 'cost-tracking',

  async afterExecute(context: HookContext, result: AgentResult): Promise<AgentResult> {
    const costPerPromptToken = getCostPerPromptToken(result.model);
    const costPerCompletionToken = getCostPerCompletionToken(result.model);
    const cost =
      result.usage.promptTokens * costPerPromptToken +
      result.usage.completionTokens * costPerCompletionToken;

    // Attach cost info to result metadata via data
    context.data.estimatedCost = cost;

    if (cost > 0.01) {
      loggers.agentRuntime.warn(
        `[AgentRuntime] 💰 High cost: $${cost.toFixed(4)} for ${context.agentConfig.name}`
      );
    }

    return result;
  },
};

// ─── Cost Estimation Helpers ────────────────────────────────

function getCostPerPromptToken(model: string): number {
  if (model.includes('gpt-4o')) return 0.0000025;
  if (model.includes('gpt-4')) return 0.00003;
  if (model.includes('claude-sonnet-4.6')) return 0.000003;
  if (model.includes('claude-3-opus')) return 0.000015;
  if (model.includes('claude-3-haiku')) return 0.00000025;
  if (model.includes('gemini-2')) return 0.00000125;
  if (model.includes('llama') || model.includes('mistral')) return 0.0000002;
  return 0.0000005;
}

function getCostPerCompletionToken(model: string): number {
  if (model.includes('gpt-4o')) return 0.00001;
  if (model.includes('gpt-4')) return 0.00006;
  if (model.includes('claude-sonnet-4.6')) return 0.000015;
  if (model.includes('claude-3-opus')) return 0.000075;
  if (model.includes('claude-3-haiku')) return 0.00000125;
  if (model.includes('gemini-2')) return 0.000005;
  if (model.includes('llama') || model.includes('mistral')) return 0.0000005;
  return 0.000001;
}
