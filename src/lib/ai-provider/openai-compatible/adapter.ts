// Agent OS — OpenAI-compatible provider adapter
// Works with OpenAI, OpenRouter, Gemini, Groq, Cerebras, GLM, Ollama Cloud, etc.

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
import { logger } from '@/lib/logger';
import type { OpenAICompatibleConfig } from './config';

interface OpenAICompatibleChoice {
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

interface OpenAICompatibleUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAICompatibleResponse {
  id?: string;
  model: string;
  choices: OpenAICompatibleChoice[];
  usage?: OpenAICompatibleUsage;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly name: string;

  constructor(private config: OpenAICompatibleConfig) {
    this.id = config.id;
    this.name = config.name;
  }

  private chatCompletionsUrl(): string {
    return `${this.config.baseUrl}/chat/completions`;
  }

  private modelsUrl(): string {
    return `${this.config.baseUrl}/models`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    if (this.config.siteUrl) headers['HTTP-Referer'] = this.config.siteUrl;
    if (this.config.siteName) headers['X-Title'] = this.config.siteName;

    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders);
    }

    return headers;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        const res = await fetch(this.modelsUrl(), {
          method: 'GET',
          headers: this.buildHeaders(),
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
    const startTime = Date.now();
    const body = this.buildRequestBody(request);
    let lastError: ProviderError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const res = await fetch(this.chatCompletionsUrl(), {
          method: 'POST',
          headers: this.buildHeaders(),
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
          `[${this.name}] ${request.model} -> ${usage.totalTokens} tokens in ${elapsed}ms ` +
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
        const providerError = this.toProviderError(error, this.config.timeoutMs);
        lastError = providerError;

        if (!providerError.retryable || attempt >= this.config.maxRetries) {
          throw providerError;
        }

        await this.sleep(this.backoffMs(attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new ProviderError(`${this.name} request failed`, this.id, 'UNKNOWN', undefined, false);
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(this.modelsUrl(), {
      headers: this.buildHeaders(),
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
      provider: this.id,
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
      model: request.model || this.config.defaultModel,
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

  private async readCompletionResponse(res: Response): Promise<OpenAICompatibleResponse> {
    const data = await this.readJson(res);
    if (typeof data.model !== 'string' || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new ProviderError(
        'Malformed response',
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }

    const choice = data.choices[0] as Partial<OpenAICompatibleChoice>;
    if (!choice.message || typeof choice.message !== 'object') {
      throw new ProviderError(
        'Malformed message in response',
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }

    return data as unknown as OpenAICompatibleResponse;
  }

  private async readJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ProviderError(
        `Invalid JSON response: ${text.slice(0, 200)}`,
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
        true,
      );
    }
  }

  private async handleError(res: Response, model: string): Promise<never> {
    const text = await res.text();
    let message = `${this.name} API error: ${res.status}`;
    let code: ProviderErrorCode = 'UNKNOWN';
    let retryable = false;

    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const errorObj = (data.error ?? data) as Record<string, unknown>;
      const errorMessage = errorObj.message ?? errorObj.error ?? text;
      message = `${this.name} API error (${res.status}) for model ${model}: ${errorMessage}`;

      const errorType = String(errorObj.type ?? errorObj.code ?? '').toLowerCase();
      if (errorType.includes('auth') || errorType.includes('unauthorized') || res.status === 401) {
        code = 'AUTH_FAILED';
      } else if (errorType.includes('rate') || res.status === 429) {
        code = 'RATE_LIMITED';
        retryable = true;
      } else if (errorType.includes('model') || res.status === 404 || res.status === 400) {
        code = 'MODEL_NOT_FOUND';
      } else if (errorType.includes('context') || errorType.includes('too long') || res.status === 413) {
        code = 'CONTEXT_TOO_LONG';
      } else if (res.status >= 500 || res.status === 408 || res.status === 425) {
        code = 'PROVIDER_UNAVAILABLE';
        retryable = true;
      }
    } catch {
      message = `${this.name} API error (${res.status}): ${text.slice(0, 200)}`;
      if (res.status >= 500 || res.status === 408 || res.status === 425) {
        code = 'PROVIDER_UNAVAILABLE';
        retryable = true;
      }
    }

    throw new ProviderError(message, this.id, code, res.status, retryable);
  }

  private toProviderError(error: unknown, timeoutMs: number): ProviderError {
    if (error instanceof ProviderError) return error;

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('abort') || message.includes('timeout')) {
        return new ProviderError(
          `${this.name} request timed out after ${timeoutMs}ms`,
          this.id,
          'TIMEOUT',
          undefined,
          true,
        );
      }
      if (message.includes('fetch') || message.includes('network') || message.includes('enet')) {
        return new ProviderError(
          `${this.name} network error: ${error.message}`,
          this.id,
          'PROVIDER_UNAVAILABLE',
          undefined,
          true,
        );
      }
      return new ProviderError(`${this.name} error: ${error.message}`, this.id, 'UNKNOWN', undefined, false);
    }

    return new ProviderError(`${this.name} unknown error`, this.id, 'UNKNOWN', undefined, false);
  }

  private backoffMs(attempt: number): number {
    return Math.min(1000 * 2 ** attempt, 10_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

type ProviderErrorCode =
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'UNKNOWN';
