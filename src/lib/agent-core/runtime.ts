// ─── Agent OS — Stage 3: Agent Runtime (with Skills + Tools) ───
// Executes agents: resolves config → runs skills → resolves model →
// builds prompt → collects tools → calls provider → handles tool calls →
// runs skills → handles lifecycle → returns result.
//
// Key design decisions:
// - Runtime does NOT own agent configs (that's Registry)
// - Runtime does NOT own providers (that's ProviderRegistry)
// - Runtime does NOT own skills/tools (that's SkillRegistry/ToolRegistry)
// - Runtime does NOT own DB persistence (that's external)
// - Runtime OWNS the execution lifecycle, hook pipeline, and tool call loop
// - Runtime is small, focused, and testable
// - Skills run BEFORE hooks (prepare ground) and AFTER hooks (post-process)
// - Tools are resolved from both skill injections and agent config

import type {
  AgentConfig,
  AgentInput,
  AgentResult,
  AgentStateSnapshot,
  AgentStatus,
  HookContext,
} from './types';
import { agentRegistry } from './registry';
import { providerRegistry } from '../ai-provider/provider-registry';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { composeHooks } from './hooks';
import type { AgentHook } from './types';
import type {
  CompletionRequest,
  ChatMessage,
  ToolCall,
  ToolDefinition,
} from '../ai-provider/types';
import { ProviderError } from '../ai-provider/types';
import { skillRegistry } from '../skills/registry';
import type { SkillContext } from '../skills/types';
import { toolRegistry } from '../tools/registry';
import { toolExecutor } from '../tools/executor';
import { loggers } from '@/lib/logger';

// ─── Constants ───────────────────────────────────────────────

/** Maximum number of tool call rounds before breaking the loop */
const MAX_TOOL_CALL_ROUNDS = 5;

// ─── Agent Runtime ──────────────────────────────────────────

class AgentRuntime {
  private static instance: AgentRuntime | null = null;
  private executionCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, string | null> = new Map();
  private lastActivities: Map<string, number> = new Map();
  private activeTasks: Map<string, string | null> = new Map();

  private constructor() {}

  static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  // ── Execute ────────────────────────────────────────────────

  /**
   * Execute an agent — the main entry point.
   *
   * Flow:
   * 1. Resolve agent config from registry
   * 2. Resolve and run enabled skills (beforeRun)
   * 3. Collect tool definitions (from skills + agent config)
   * 4. Apply skill system prompt appendix
   * 5. Build hook pipeline
   * 6. Run beforeExecute hooks
   * 7. Resolve model
   * 8. Build completion request with tools
   * 9. Call provider (with tool call loop)
   * 10. Handle errors (with fallback model retry)
   * 11. Run afterExecute hooks
   * 12. Run skill afterRun hooks
   * 13. Update state
   * 14. Return result
   */
  async execute(agentId: string, input: AgentInput): Promise<AgentResult> {
    const startTime = Date.now();

    // 1. Resolve agent config
    const config = agentRegistry.getOrThrow(agentId);

    // 2. Resolve and run enabled skills (beforeRun)
    const skillContext = await this.runSkillBeforeRun(config, input);

    // 3. Collect tool definitions
    const toolDefinitions = this.collectToolDefinitions(config, skillContext);

    // 4. Build messages (with skill system prompt appendix)
    const messages = this.buildMessages(config, input, skillContext.systemPromptAppendix);

    // 5. Build hook pipeline
    const hookPipeline = this.buildHookPipeline(config);

    // 6. Create hook context (bridge from skill context)
    let context: HookContext = {
      agentConfig: config,
      messages,
      data: { ...skillContext.data },
    };

    // 7. Run beforeExecute hooks
    context = await (hookPipeline.beforeExecute?.(context) ?? context);

    // 8. Resolve model
    const resolvedModel = agentRegistry.resolveModel(agentId, input.modelOverride);
    context.resolvedModel = resolvedModel;

    // 9. Update status to "thinking"
    this.setStatus(agentId, 'thinking');

    // 10. Get provider
    const provider = providerRegistry.getOrThrow(resolvedModel.provider);

    // 11. Build completion request (with tool definitions if any)
    const executionConfig = config.execution;
    const completionRequest: CompletionRequest = {
      model: resolvedModel.model,
      messages: context.messages,
      temperature: input.temperature ?? executionConfig.temperature,
      maxTokens: input.maxTokens ?? resolvedModel.maxTokens ?? executionConfig.maxTokens,
      topP: executionConfig.topP,
      stop: executionConfig.stop,
      ...(toolDefinitions.length > 0
        ? {
            tools: toolDefinitions,
            toolChoice: 'auto',
          }
        : {}),
    };

    // 12. Execute with tool call loop
    let result: AgentResult;

    try {
      const response = await this.executeWithToolLoop(
        provider,
        completionRequest,
        config,
        input.correlationId,
      );

      this.setStatus(agentId, 'working');

      result = {
        agentId: config.id,
        content: response.content,
        model: response.model,
        resolvedModel,
        usage: response.usage,
        finishReason: response.finishReason,
        durationMs: Date.now() - startTime,
        status: 'success',
        toolCalls: response.toolCalls,
      };
    } catch (error) {
      // Try fallback model on retryable errors
      if (
        error instanceof ProviderError &&
        (error.retryable || error.code === 'MODEL_NOT_FOUND') &&
        resolvedModel.preferenceType === 'preferred' &&
        config.model.fallback
      ) {
        loggers.agentRuntime.info(
          `[AgentRuntime] Retrying with fallback model: ${config.model.fallback.provider}/${config.model.fallback.model}`
        );

        const fallbackModel: typeof resolvedModel = {
          provider: config.model.fallback.provider,
          model: config.model.fallback.model,
          preferenceType: 'fallback',
          maxCostPerTask: config.model.fallback.maxCostPerTask,
          maxTokens: config.model.fallback.maxTokens,
        };

        try {
          const fallbackProvider = providerRegistry.getOrThrow(fallbackModel.provider);
          const fallbackRequest: CompletionRequest = {
            ...completionRequest,
            model: fallbackModel.model,
            maxTokens: input.maxTokens ?? fallbackModel.maxTokens ?? executionConfig.maxTokens,
          };

          const response = await this.executeWithToolLoop(
            fallbackProvider,
            fallbackRequest,
            config,
            input.correlationId,
          );

          this.setStatus(agentId, 'working');

          result = {
            agentId: config.id,
            content: response.content,
            model: response.model,
            resolvedModel: fallbackModel,
            usage: response.usage,
            finishReason: response.finishReason,
            durationMs: Date.now() - startTime,
            status: 'success',
            toolCalls: response.toolCalls,
          };
        } catch (fallbackError) {
          result = this.handleError(agentId, fallbackError, resolvedModel, startTime);
        }
      } else {
        result = this.handleError(agentId, error, resolvedModel, startTime);
      }

      // Run onError hooks
      if (hookPipeline.onError && result.status === 'error') {
        const hookError = new Error(result.error ?? 'Unknown error');
        const modifiedError = await hookPipeline.onError(context, hookError);
        if (modifiedError) {
          result.error = modifiedError.message;
        }
      }

      // Run skill onError
      if (result.status === 'error') {
        await this.runSkillOnError(config, skillContext, new Error(result.error ?? 'Unknown error'));
      }
    }

    // 13. Run afterExecute hooks
    result = await (hookPipeline.afterExecute?.(context, result) ?? result);

    // 14. Run skill afterRun hooks
    result = await this.runSkillAfterRun(config, skillContext, result);

    // 15. Update state
    this.executionCounts.set(agentId, (this.executionCounts.get(agentId) ?? 0) + 1);
    this.lastActivities.set(agentId, Date.now());
    this.lastErrors.set(agentId, result.status === 'error' ? result.error ?? null : null);

    // 16. Set back to idle after delay
    setTimeout(() => {
      this.setStatus(agentId, 'idle');
    }, 1500);

    // 17. Emit cost event to DB
    if (result.status === 'success') {
      this.logCostToDb(agentId, result).catch(loggers.agentRuntime.error);
    }

    return result;
  }

  // ── State Queries ──────────────────────────────────────────

  /**
   * Get a snapshot of an agent's runtime state.
   */
  getState(agentId: string): AgentStateSnapshot {
    return {
      agentId,
      status: agentRegistry.getStatus(agentId),
      lastActivityAt: this.lastActivities.get(agentId) ?? 0,
      currentActivity: null,
      activeTaskId: this.activeTasks.get(agentId) ?? null,
      executionCount: this.executionCounts.get(agentId) ?? 0,
      lastError: this.lastErrors.get(agentId) ?? null,
    };
  }

  /**
   * Get all agent states.
   */
  getAllStates(): AgentStateSnapshot[] {
    return agentRegistry.listIds().map((id) => this.getState(id));
  }

  /**
   * Get execution count for an agent.
   */
  getExecutionCount(agentId: string): number {
    return this.executionCounts.get(agentId) ?? 0;
  }

  // ── Skill Integration ──────────────────────────────────────

  /**
   * Run beforeRun on all enabled skills for an agent.
   * Returns the skill context with injected tools and system prompt appendix.
   */
  private async runSkillBeforeRun(
    config: AgentConfig,
    input: AgentInput,
  ): Promise<SkillContext> {
    const context: SkillContext = {
      agentConfig: config,
      messages: [],
      data: {},
      injectedToolDefinitions: [],
      systemPromptAppendix: '',
    };

    // Resolve enabled skills and run beforeRun
    for (const skillRef of config.skills) {
      if (!skillRef.enabled) continue;

      try {
        const skill = skillRegistry.get(skillRef.skillId);
        if (!skill) {
          loggers.agentRuntime.warn(
            `[AgentRuntime] Skill "${skillRef.skillId}" not found in registry, skipping`
          );
          continue;
        }

        // Merge skill-specific config into context data
        if (skillRef.config) {
          context.data[`skill:${skillRef.skillId}:config`] = skillRef.config;
        }

        // Run beforeRun
        const updatedContext = await skill.beforeRun(context);

        // Merge back (skills return a new context object)
        context.injectedToolDefinitions = updatedContext.injectedToolDefinitions;
        context.systemPromptAppendix = updatedContext.systemPromptAppendix;
        context.data = updatedContext.data;
        context.messages = updatedContext.messages;

        loggers.agentRuntime.info(
          `[AgentRuntime] Skill "${skillRef.skillId}" beforeRun completed. ` +
          `Injected ${updatedContext.injectedToolDefinitions.length} tools, ` +
          `appendix length: ${updatedContext.systemPromptAppendix.length}`
        );
      } catch (error) {
        loggers.agentRuntime.error({ err: error }, `[AgentRuntime] Skill "${skillRef.skillId}" beforeRun failed:`);
        // Continue with other skills — don't fail the entire execution
      }
    }

    return context;
  }

  /**
   * Run afterRun on all enabled skills for an agent.
   * Skills post-process the result in reverse order.
   */
  private async runSkillAfterRun(
    config: AgentConfig,
    skillContext: SkillContext,
    result: AgentResult,
  ): Promise<AgentResult> {
    let currentResult = result;

    // Run in reverse order (like unwinding middleware)
    const enabledSkills = config.skills
      .filter((s) => s.enabled)
      .reverse();

    for (const skillRef of enabledSkills) {
      try {
        const skill = skillRegistry.get(skillRef.skillId);
        if (!skill) continue;

        currentResult = await skill.afterRun(skillContext, currentResult);
      } catch (error) {
        loggers.agentRuntime.error({ err: error }, `[AgentRuntime] Skill "${skillRef.skillId}" afterRun failed:`);
        // Continue with other skills — don't fail
      }
    }

    return currentResult;
  }

  /**
   * Run onError on all enabled skills for an agent.
   */
  private async runSkillOnError(
    config: AgentConfig,
    skillContext: SkillContext,
    error: Error,
  ): Promise<void> {
    for (const skillRef of config.skills) {
      if (!skillRef.enabled) continue;

      try {
        const skill = skillRegistry.get(skillRef.skillId);
        if (!skill) continue;

        const modifiedError = await skill.onError(skillContext, error);
        if (modifiedError !== null) {
          // Skill handled the error — update error message
          loggers.agentRuntime.info(
            `[AgentRuntime] Skill "${skillRef.skillId}" handled error: ${modifiedError.message}`
          );
        }
      } catch (skillError) {
        loggers.agentRuntime.error({ err: skillError }, `[AgentRuntime] Skill "${skillRef.skillId}" onError failed:`);
      }
    }
  }

  // ── Tool Integration ───────────────────────────────────────

  /**
   * Collect all tool definitions for an agent.
   * Sources:
   * 1. Tool definitions injected by skills (from skill beforeRun)
   * 2. Tool definitions from agent's enabled tools (from registry)
   */
  private collectToolDefinitions(
    config: AgentConfig,
    skillContext: SkillContext,
  ): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    // 1. From skills (already resolved during beforeRun)
    definitions.push(...skillContext.injectedToolDefinitions);

    // 2. From agent's enabled tools
    for (const toolRef of config.tools) {
      if (!toolRef.enabled) continue;

      const tool = toolRegistry.get(toolRef.toolId);
      if (!tool) {
        loggers.agentRuntime.warn(
          `[AgentRuntime] Tool "${toolRef.toolId}" not found in registry, skipping`
        );
        continue;
      }

      // Convert ITool to ToolDefinition format
      definitions.push({
        type: 'function',
        function: tool.functionDefinition,
      });
    }

    return definitions;
  }

  /**
   * Execute provider with tool call loop.
   * When the model returns tool_calls, execute them and feed results back.
   * Continues until the model stops requesting tool calls or max rounds reached.
   */
  private async executeWithToolLoop(
    provider: import('../ai-provider/types').AIProvider,
    request: CompletionRequest,
    config: AgentConfig,
    correlationId?: string,
  ): Promise<import('../ai-provider/types').CompletionResponse> {
    let currentMessages = [...request.messages];
    let round = 0;
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (round < MAX_TOOL_CALL_ROUNDS) {
      const currentRequest: CompletionRequest = {
        ...request,
        messages: currentMessages,
      };

      const response = await provider.complete(currentRequest);

      // Accumulate usage
      totalUsage.promptTokens += response.usage.promptTokens;
      totalUsage.completionTokens += response.usage.completionTokens;
      totalUsage.totalTokens += response.usage.totalTokens;

      // If no tool calls, return the final response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          ...response,
          usage: totalUsage,
        };
      }

      loggers.agentRuntime.info(
        `[AgentRuntime] Tool call round ${round + 1}: ${response.toolCalls.length} tool calls requested`
      );

      // Add assistant message with tool calls to conversation
      currentMessages.push({
        role: 'assistant',
        content: response.content || '',
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      const toolResults = await toolExecutor.executeToolCalls(
        response.toolCalls,
        config,
        correlationId,
      );

      // Add tool results to conversation
      for (const toolResult of toolResults) {
        currentMessages.push({
          role: 'tool',
          content: toolResult.content,
          toolCallId: toolResult.toolCallId,
        });

        loggers.agentRuntime.info(
          `[AgentRuntime] Tool ${toolResult.functionName} → ${toolResult.success ? 'success' : 'error'} ` +
          `(${toolResult.durationMs}ms)`
        );
      }

      round++;
    }

    // If we hit max rounds, return the last response content or a summary
    loggers.agentRuntime.warn(
      `[AgentRuntime] Max tool call rounds (${MAX_TOOL_CALL_ROUNDS}) reached for agent ${config.id}`
    );

    return {
      content: 'Maximum tool call iterations reached. Here is the current state of the work.',
      model: request.model,
      finishReason: 'stop',
      usage: totalUsage,
    };
  }

  // ── Private Helpers ────────────────────────────────────────

  private buildMessages(
    config: AgentConfig,
    input: AgentInput,
    systemPromptAppendix: string = '',
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System prompt + skill appendix
    const systemPrompt = config.systemPrompt + systemPromptAppendix;
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // History
    if (input.history && input.history.length > 0) {
      messages.push(...input.history);
    }

    // Current user message
    messages.push({ role: 'user', content: input.message });

    return messages;
  }

  private buildHookPipeline(config: AgentConfig): AgentHook {
    const allHooks: AgentHook[] = [...config.hooks];
    return composeHooks(allHooks);
  }

  private setStatus(agentId: string, status: AgentStatus): void {
    const previousStatus = agentRegistry.getStatus(agentId);
    agentRegistry.setStatus(agentId, status);

    // Emit status change event
    eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
      agentId,
      fromStatus: previousStatus,
      toStatus: status,
      timestamp: Date.now(),
      source: 'agent-runtime',
    }).catch(loggers.agentRuntime.error);
  }

  private handleError(
    agentId: string,
    error: unknown,
    resolvedModel: { provider: string; model: string },
    startTime: number,
  ): AgentResult {
    this.setStatus(agentId, 'error');

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown execution error';

    return {
      agentId,
      content: null,
      model: resolvedModel.model,
      resolvedModel: resolvedModel as import('../ai-provider/types').ResolvedModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'error',
      durationMs: Date.now() - startTime,
      status: 'error',
      error: errorMessage,
    };
  }

  private async logCostToDb(agentId: string, result: AgentResult): Promise<void> {
    try {
      const { db } = await import('../db');
      const agentExists = await db.agent.findUnique({
        where: { id: agentId },
        select: { id: true },
      });

      if (!agentExists) {
        loggers.agentRuntime.warn(
          `[AgentRuntime] Skipping cost log for non-persisted agent: ${agentId}`,
        );
        return;
      }

      const costPerPromptToken = this.getCostPerPromptToken(result.model);
      const costPerCompletionToken = this.getCostPerCompletionToken(result.model);
      const cost =
        result.usage.promptTokens * costPerPromptToken +
        result.usage.completionTokens * costPerCompletionToken;

      await db.costLog.create({
        data: {
          agentId,
          provider: result.resolvedModel.provider,
          model: result.model,
          tokensIn: result.usage.promptTokens,
          tokensOut: result.usage.completionTokens,
          cost,
        },
      });

      await eventBus.emit(EventTypes.COST_LOGGED, {
        costLogId: '',
        agentId,
        provider: result.resolvedModel.provider,
        model: result.model,
        cost,
        timestamp: Date.now(),
        source: 'agent-runtime',
      });
    } catch (error) {
      loggers.agentRuntime.error({ err: error }, '[AgentRuntime] Failed to log cost:');
    }
  }

  private getCostPerPromptToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.0000025;
    if (model.includes('gpt-4')) return 0.00003;
    if (model.includes('claude-sonnet-4.6')) return 0.000003;
    if (model.includes('gemini-2')) return 0.00000125;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000002;
    return 0.0000005;
  }

  private getCostPerCompletionToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.00001;
    if (model.includes('gpt-4')) return 0.00006;
    if (model.includes('claude-sonnet-4.6')) return 0.000015;
    if (model.includes('gemini-2')) return 0.000005;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000005;
    return 0.000001;
  }
}

export const agentRuntime = AgentRuntime.getInstance();
