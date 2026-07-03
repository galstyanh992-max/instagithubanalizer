import 'server-only';

import type {
  AIProvider,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  TokenUsage,
  ToolCall,
} from '../types';
import { ProviderError } from '../types';
import { getOpenRouterConfig, isOpenRouterConfigured } from './config';
import type { OpenRouterConfig } from './config';
import { logger } from '@/lib/logger';
import { resolveOpenRouterModelAlias } from '../model-registry';

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: string | null;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id?: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

interface OpenRouterModelError {
  error?: {
    message: string;
    code?: number;
    type?: string;
  };
}

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';

  private config: OpenRouterConfig | null = null;

  private getConfig(): OpenRouterConfig {
    if (!this.config) {
      this.config = getOpenRouterConfig();
    }
    return this.config;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!isOpenRouterConfigured()) return false;
      const cfg = this.getConfig();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        // Smoke test with a real generation to ensure the key is active and has credits
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemma-7b-it', // Fast fallback model for testing
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 1
          }),
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
    const cfg = this.getConfig();
    const startTime = Date.now();
    const body = this.buildRequestBody(request);
    let lastError: ProviderError | null = null;

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

      try {
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
            ...(cfg.siteUrl ? { 'HTTP-Referer': cfg.siteUrl } : {}),
            ...(cfg.siteName ? { 'X-Title': cfg.siteName } : {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          await this.handleError(res, request.model);
        }

        const data = await this.readCompletionResponse(res);
        const choice = data.choices[0];

        const usage: TokenUsage = {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        };

        const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));

        const elapsed = Date.now() - startTime;
        logger.info(
          `[OpenRouter] ${request.model} -> ${usage.totalTokens} tokens in ${elapsed}ms ` +
          `(finish: ${choice.finish_reason}, attempt: ${attempt + 1})`,
        );

        return {
          content: choice.message.content,
          model: data.model,
          finishReason: choice.finish_reason,
          usage,
          toolCalls,
        };
      } catch (error) {
        const providerError = this.toProviderError(error, cfg.timeoutMs);
        lastError = providerError;

        if (!providerError.retryable || attempt >= cfg.maxRetries) {
          throw providerError;
        }

        await this.sleep(this.backoffMs(attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new ProviderError('OpenRouter request failed', this.id, 'UNKNOWN', undefined, false);
  }

  async listModels(): Promise<ModelInfo[]> {
    const cfg = this.getConfig();

    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });

    if (!res.ok) {
      throw new ProviderError(
        `Failed to list models: ${res.status}`,
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
      );
    }

    const data = await this.readJson(res);
    const models: ModelInfo[] = (Array.isArray(data.data) ? data.data : []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: (m.name || m.id) as string,
      provider: (m.id as string).split('/')[0] || 'unknown',
      contextLength: m.context_length as number | undefined,
    }));

    return models;
  }

  private buildRequestBody(request: CompletionRequest): Record<string, unknown> {
    const messages = request.messages.map((msg: ChatMessage) => {
      const m: Record<string, unknown> = { role: msg.role, content: msg.content };
      if (msg.toolCallId) m.tool_call_id = msg.toolCallId;
      if (msg.toolCalls) m.tool_calls = msg.toolCalls;
      return m;
    });

    const body: Record<string, unknown> = {
      model: resolveOpenRouterModelAlias(request.model),
      messages,
    };

    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stop !== undefined) body.stop = request.stop;

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }
    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }
    if (request.providerOptions) {
      Object.assign(body, request.providerOptions);
    }

    return body;
  }

  private async readCompletionResponse(res: Response): Promise<OpenRouterResponse> {
    const data = await this.readJson(res);
    if (
      typeof data.model !== 'string' ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0
    ) {
      throw new ProviderError(
        'Malformed response from OpenRouter',
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }

    const choice = data.choices[0] as Partial<OpenRouterChoice>;
    if (!choice.message || typeof choice.message !== 'object') {
      throw new ProviderError(
        'Malformed message in OpenRouter response',
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }

    return data as unknown as OpenRouterResponse;
  }

  private async readJson(res: Response): Promise<Record<string, any>> {
    try {
      return (await res.json()) as Record<string, any>;
    } catch {
      throw new ProviderError(
        'OpenRouter returned non-JSON response',
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }
  }

  private toProviderError(error: unknown, timeoutMs: number): ProviderError {
    if (error instanceof ProviderError) return error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      return new ProviderError(
        `Request timed out after ${timeoutMs}ms`,
        this.id,
        'TIMEOUT',
        undefined,
        true,
      );
    }

    return new ProviderError(
      error instanceof Error ? this.redact(error.message) : 'Unknown error',
      this.id,
      'UNKNOWN',
      undefined,
      false,
    );
  }

  private backoffMs(attempt: number): number {
    return Math.min(1_000 * 2 ** attempt, 4_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private redact(message: string): string {
    const apiKey = this.config?.apiKey;
    return apiKey ? message.replaceAll(apiKey, '[redacted]') : message;
  }

  private async handleError(res: Response, model: string): Promise<never> {
    let errorMessage = `OpenRouter API error (${res.status})`;
    let errorCode: import('../types').ProviderErrorCode = 'UNKNOWN';
    let retryable = false;

    try {
      const data = (await res.json()) as OpenRouterModelError;
      if (data.error) {
        errorMessage = this.redact(data.error.message || errorMessage);
      }
    } catch {
      // Keep default error message.
    }

    switch (res.status) {
      case 401:
        errorCode = 'AUTH_FAILED';
        break;
      case 429:
        errorCode = 'RATE_LIMITED';
        retryable = true;
        break;
      case 404:
        errorCode = 'MODEL_NOT_FOUND';
        errorMessage = `Model not found: ${model}. Check the model ID at openrouter.ai/models`;
        break;
      case 400:
        errorCode = 'INVALID_REQUEST';
        break;
      case 502:
      case 503:
      case 504:
        errorCode = 'PROVIDER_UNAVAILABLE';
        retryable = true;
        break;
      default:
        if (res.status >= 500) {
          errorCode = 'PROVIDER_UNAVAILABLE';
          retryable = true;
        }
        break;
    }

    throw new ProviderError(errorMessage, this.id, errorCode, res.status, retryable);
  }
}
