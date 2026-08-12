// JARVIS — OpenCode Go provider adapter
//
// OpenCode Go fronts multiple upstream model families behind ONE API key,
// but three different wire protocols (see ./protocol-map.ts). This adapter
// is a single AIProvider ("opencode-go") that dispatches each complete()
// call to the right protocol handler based on request.model — it does NOT
// force every model through /chat/completions, per the master prompt's
// explicit instruction (Section 12).
//
// Registered into providerRegistry from server.ts alongside the other
// registerX() bootstrap functions — this is an ADDITIONAL provider inside
// the existing Provider Router, not a second router.

import 'server-only';

import type {
  AIProvider,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  TokenUsage,
} from '../types';
import { ProviderError } from '../types';
import { logger } from '@/lib/logger';
import { OpenAICompatibleProvider } from '../openai-compatible/adapter';
import type { OpenAICompatibleConfig } from '../openai-compatible/config';
import { getOpenCodeGoModelMeta, listAvailableOpenCodeGoModels } from './protocol-map';

export interface OpenCodeGoAdapterConfig {
  apiKey: string;
  baseUrl: string; // e.g. https://opencode.ai/zen/go/v1
  modelsUrl: string;
  chatUrl: string;
  messagesUrl: string;
  responsesUrl: string;
  defaultModel: string;
  timeoutMs: number;
  maxRetries: number;
}

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function buildOpenCodeGoConfig(): OpenCodeGoAdapterConfig {
  const baseUrl = (process.env.OPENCODE_GO_BASE_URL ?? 'https://opencode.ai/zen/go/v1').trim().replace(/\/+$/, '');
  return {
    apiKey: process.env.OPENCODE_GO_API_KEY?.trim() ?? '',
    baseUrl,
    modelsUrl: process.env.OPENCODE_GO_MODELS_URL?.trim() || `${baseUrl}/models`,
    chatUrl: process.env.OPENCODE_GO_CHAT_URL?.trim() || `${baseUrl}/chat/completions`,
    messagesUrl: process.env.OPENCODE_GO_MESSAGES_URL?.trim() || `${baseUrl}/messages`,
    responsesUrl: process.env.OPENCODE_GO_RESPONSES_URL?.trim() || `${baseUrl}/responses`,
    defaultModel: process.env.OPENCODE_GO_MODEL?.trim() || 'deepseek-v4-pro',
    timeoutMs: parseBoundedInt(process.env.OPENCODE_GO_TIMEOUT_MS, 60_000, 5_000, 180_000),
    maxRetries: parseBoundedInt(process.env.OPENCODE_GO_MAX_RETRIES, 1, 0, 3),
  };
}

export function isOpenCodeGoConfigured(config: OpenCodeGoAdapterConfig): boolean {
  return Boolean(config.apiKey);
}

export class OpenCodeGoProvider implements AIProvider {
  readonly id = 'opencode-go';
  readonly name = 'OpenCode Go';

  /** Lazily-built delegate for OPENAI_CHAT-protocol models. */
  private openAiChatDelegate: OpenAICompatibleProvider;

  constructor(private config: OpenCodeGoAdapterConfig) {
    const delegateConfig: OpenAICompatibleConfig = {
      id: 'opencode-go',
      name: 'OpenCode Go',
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
    };
    this.openAiChatDelegate = new OpenAICompatibleProvider(delegateConfig);
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch(this.config.modelsUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const modelId = request.model || this.config.defaultModel;
    const meta = getOpenCodeGoModelMeta(modelId);

    if (!meta) {
      throw new ProviderError(
        `OpenCode Go: model "${modelId}" is not in the protocol map (unclassified — add it to opencode-go/protocol-map.ts with a verified protocol before routing to it)`,
        this.id,
        'MODEL_NOT_FOUND',
        undefined,
        false,
      );
    }

    if (!meta.available) {
      throw new ProviderError(
        `OpenCode Go: model "${modelId}" is currently unavailable${meta.note ? ` — ${meta.note}` : ''}`,
        this.id,
        'MODEL_NOT_FOUND',
        undefined,
        false,
      );
    }

    switch (meta.protocol) {
      case 'OPENAI_CHAT':
        return this.openAiChatDelegate.complete(request);
      case 'OPENAI_RESPONSES':
        return this.completeViaResponses(request);
      case 'ANTHROPIC_MESSAGES':
        return this.completeViaMessages(request);
      default: {
        const exhaustive: never = meta.protocol;
        throw new ProviderError(`OpenCode Go: unhandled protocol ${exhaustive}`, this.id, 'UNKNOWN', undefined, false);
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return listAvailableOpenCodeGoModels().map((m) => ({
      id: m.id,
      name: m.id,
      provider: this.id,
      capabilities: [`protocol:${m.protocol}`],
    }));
  }

  // ─── OpenAI Responses API (gpt-5.6-luna) ─────────────────────────
  // POST /v1/responses — distinct schema from /chat/completions. Do not
  // call this model through chat/completions (master prompt Section 16).

  private async completeViaResponses(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const input = request.messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    const body: Record<string, unknown> = {
      model: request.model || this.config.defaultModel,
      input,
    };
    if (request.maxTokens !== undefined) body.max_output_tokens = request.maxTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(this.config.responsesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new ProviderError(`OpenCode Go Responses: invalid JSON (${text.slice(0, 200)})`, this.id, 'PROVIDER_UNAVAILABLE', res.status, true);
      }

      if (!res.ok) {
        throw this.toErrorFromBody(data, res.status, request.model);
      }

      // Real OpenAI Responses payloads expose a convenience `output_text`;
      // fall back to walking `output[].content[].text` if absent.
      let content: string | null = typeof data.output_text === 'string' ? data.output_text : null;
      if (content === null && Array.isArray(data.output)) {
        const parts: string[] = [];
        for (const item of data.output as Array<Record<string, unknown>>) {
          const itemContent = item.content;
          if (Array.isArray(itemContent)) {
            for (const c of itemContent as Array<Record<string, unknown>>) {
              if (typeof c.text === 'string') parts.push(c.text);
            }
          }
        }
        content = parts.length > 0 ? parts.join('') : null;
      }

      const usageRaw = (data.usage ?? {}) as Record<string, unknown>;
      const usage: TokenUsage = {
        promptTokens: (usageRaw.input_tokens as number) ?? 0,
        completionTokens: (usageRaw.output_tokens as number) ?? 0,
        totalTokens: (usageRaw.total_tokens as number) ?? 0,
      };

      const elapsed = Date.now() - startTime;
      logger.info(`[OpenCode Go/Responses] ${request.model} -> ${usage.totalTokens} tokens in ${elapsed}ms`);

      return {
        content,
        model: (data.model as string) ?? request.model,
        finishReason: (data.status as string) ?? null,
        usage,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw this.toNetworkError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Anthropic Messages API (MiniMax / Qwen family) ──────────────
  // POST /v1/messages — Anthropic-compatible: system prompt is a top-level
  // field, not a message with role "system"; requires max_tokens.

  private async completeViaMessages(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const systemParts: string[] = [];
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else if (msg.role === 'tool') {
        // Best-effort: Anthropic Messages does not share OpenAI's tool-role
        // shape. Fold tool output into a user turn rather than drop it.
        messages.push({ role: 'user', content: `[tool result] ${msg.content}` });
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const body: Record<string, unknown> = {
      model: request.model || this.config.defaultModel,
      messages,
      max_tokens: request.maxTokens ?? 1024,
    };
    if (systemParts.length > 0) body.system = systemParts.join('\n\n');
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stop !== undefined) body.stop_sequences = request.stop;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(this.config.messagesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new ProviderError(`OpenCode Go Messages: invalid JSON (${text.slice(0, 200)})`, this.id, 'PROVIDER_UNAVAILABLE', res.status, true);
      }

      if (!res.ok) {
        throw this.toErrorFromBody(data, res.status, request.model);
      }

      let content: string | null = null;
      if (Array.isArray(data.content)) {
        const parts = (data.content as Array<Record<string, unknown>>)
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text as string);
        content = parts.length > 0 ? parts.join('') : null;
      }

      const usageRaw = (data.usage ?? {}) as Record<string, unknown>;
      const usage: TokenUsage = {
        promptTokens: (usageRaw.input_tokens as number) ?? 0,
        completionTokens: (usageRaw.output_tokens as number) ?? 0,
        totalTokens: ((usageRaw.input_tokens as number) ?? 0) + ((usageRaw.output_tokens as number) ?? 0),
      };

      const elapsed = Date.now() - startTime;
      logger.info(`[OpenCode Go/Messages] ${request.model} -> ${usage.totalTokens} tokens in ${elapsed}ms`);

      return {
        content,
        model: (data.model as string) ?? request.model,
        finishReason: (data.stop_reason as string) ?? null,
        usage,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw this.toNetworkError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private toErrorFromBody(data: Record<string, unknown>, statusCode: number, model: string): ProviderError {
    const errorObj = (data.error ?? data) as Record<string, unknown>;
    const message = String(errorObj.message ?? errorObj.type ?? JSON.stringify(data).slice(0, 200));
    const type = String(errorObj.type ?? '').toLowerCase();

    let code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'MODEL_NOT_FOUND' | 'CONTEXT_TOO_LONG' | 'PROVIDER_UNAVAILABLE' | 'UNKNOWN' = 'UNKNOWN';
    let retryable = false;

    if (type.includes('region') || statusCode === 403) {
      // Real, observed case: deepseek-v4-flash on OpenCode Go returns a
      // RegionError requiring explicit opt-in. Not an auth failure, not
      // transient — do not retry, surface as model-unavailable.
      code = 'MODEL_NOT_FOUND';
    } else if (statusCode === 401 || type.includes('auth')) {
      code = 'AUTH_FAILED';
    } else if (statusCode === 429 || type.includes('rate')) {
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (statusCode === 404 || type.includes('model')) {
      code = 'MODEL_NOT_FOUND';
    } else if (statusCode === 413 || type.includes('context')) {
      code = 'CONTEXT_TOO_LONG';
    } else if (statusCode >= 500 || statusCode === 408) {
      code = 'PROVIDER_UNAVAILABLE';
      retryable = true;
    }

    return new ProviderError(
      `OpenCode Go API error (${statusCode}) for model ${model}: ${message}`,
      this.id,
      code,
      statusCode,
      retryable,
    );
  }

  private toNetworkError(error: unknown): ProviderError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('abort') || message.includes('timeout')) {
        return new ProviderError(`OpenCode Go request timed out after ${this.config.timeoutMs}ms`, this.id, 'TIMEOUT', undefined, true);
      }
      return new ProviderError(`OpenCode Go network error: ${error.message}`, this.id, 'PROVIDER_UNAVAILABLE', undefined, true);
    }
    return new ProviderError('OpenCode Go unknown error', this.id, 'UNKNOWN', undefined, false);
  }
}
