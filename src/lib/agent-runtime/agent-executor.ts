// ─── Agent OS — AgentExecutor (back-compat adapter) ──────────
// Backward-compatible wrapper around the canonical AgentRuntime
// (src/lib/agent-core/runtime.ts).
//
// WHY THIS EXISTS:
//   /api/ai/chat imports agentExecutor and expects AgentExecutionResult
//   (shape: { agentId, response: CompletionResponse, resolvedModel, durationMs }).
//   AgentRuntime.execute() returns AgentResult (flat shape).
//   This adapter bridges the two shapes so /api/ai/chat needs zero changes.
//
// DO NOT add new business logic here.
// Real execution: agent-core/runtime.ts (skills, tools, hooks, tool-call loop).

import { agentRuntime } from '../agent-core/runtime';
import type { AgentExecutionResult, ChatMessage, ResolvedModel } from '../ai-provider/types';
import { loggers } from '@/lib/logger';

// ─── Public request type (unchanged — back-compat) ────────────

export interface AgentChatRequest {
  agentId: string;
  messages: ChatMessage[];
  /** Override model for this request (bypasses agent config) */
  modelOverride?: string;
  /** Override temperature */
  temperature?: number;
  /** Override max tokens */
  maxTokens?: number;
}

// ─── AgentExecutor (adapter) ──────────────────────────────────

class AgentExecutor {
  private static instance: AgentExecutor | null = null;

  private constructor() {}

  static getInstance(): AgentExecutor {
    if (!AgentExecutor.instance) AgentExecutor.instance = new AgentExecutor();
    return AgentExecutor.instance;
  }

  /**
   * Execute a chat completion for an agent.
   * Delegates to AgentRuntime.execute() — the canonical engine.
   *
   * Input:  AgentChatRequest  ({ agentId, messages[], modelOverride?, ... })
   * Output: AgentExecutionResult  ({ agentId, response, resolvedModel, durationMs })
   *
   * The last message in messages[] is treated as the user message.
   * All preceding messages become the history (minus any system messages,
   * which are managed by the agent's own systemPrompt config).
   */
  async execute(request: AgentChatRequest): Promise<AgentExecutionResult> {
    // Separate system messages (AgentRuntime injects its own) from history
    const nonSystem = request.messages.filter((m) => m.role !== 'system');
    const lastMsg = nonSystem.at(-1);

    if (!lastMsg) {
      throw new Error('AgentChatRequest.messages must contain at least one non-system message');
    }

    const history = nonSystem.slice(0, -1);
    const userMessage = lastMsg.content ?? '';

    loggers.agentRuntime.debug(
      `[AgentExecutor→AgentRuntime] agent=${request.agentId} history=${history.length} msg_len=${userMessage.length}`
    );

    // Delegate to the canonical runtime
    const result = await agentRuntime.execute(request.agentId, {
      message: userMessage,
      history,
      modelOverride: request.modelOverride,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    // Map AgentResult → AgentExecutionResult (back-compat shape for /api/ai/chat)
    const resolvedModel: ResolvedModel = {
      provider: result.resolvedModel.provider,
      model: result.resolvedModel.model,
      preferenceType: result.resolvedModel.preferenceType as ResolvedModel['preferenceType'],
      maxCostPerTask: result.resolvedModel.maxCostPerTask ?? null,
      maxTokens: result.resolvedModel.maxTokens ?? null,
    };

    const response = {
      content: result.content,
      model: result.model,
      finishReason: result.finishReason,
      usage: result.usage,
      toolCalls: result.toolCalls as AgentExecutionResult['response']['toolCalls'],
    };

    return {
      agentId: result.agentId,
      response,
      resolvedModel,
      durationMs: result.durationMs,
    };
  }
}

export const agentExecutor = AgentExecutor.getInstance();
