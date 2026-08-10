// Codex ChatGPT Subscription → AIProvider bridge.
// Translates the synchronous OpenAI-style CompletionRequest contract into
// Codex thread/turn lifecycle so that Codex models can be used in the chat
// (and any other path that resolves a provider through `providerRegistry`).
//
// Safety posture for the chat bridge: sandbox is locked to `read-only`, so
// Codex answers questions but cannot modify files or run commands. Repository
// write workflows remain the responsibility of `runCodexRepositoryWorkflow`.

import 'server-only';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { ProviderError, type AIProvider, type CompletionRequest, type CompletionResponse, type ModelInfo } from '@/lib/ai-provider/types';
import { codexSubscriptionProvider } from './index';
import { CodexProviderError, type CodexNormalizedEvent } from './types';

const CODEX_ADAPTER_ID = 'codex-chatgpt-subscription';
const CODEX_ADAPTER_NAME = 'Codex (ChatGPT Subscription)';

// Codex turn polling cadence. The app-server streams events asynchronously;
// there is no synchronous "wait for turn" RPC, so we poll the in-process event buffer.
const POLL_INTERVAL_MS = 250;
const DEFAULT_TURN_TIMEOUT_MS = 120_000;

const TERMINAL_STATUSES = new Set<CodexNormalizedEvent['type']>([
  'TURN_COMPLETED',
  'TURN_FAILED',
  'TURN_INTERRUPTED',
  'PROCESS_TERMINATED',
]);

function isEnvEnabled(value: string | undefined, defaultValue = true): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value !== 'false' && value !== '0' && value !== 'no';
}

export class CodexChatAdapter implements AIProvider {
  readonly id = CODEX_ADAPTER_ID;
  readonly name = CODEX_ADAPTER_NAME;

  async isAvailable(): Promise<boolean> {
    if (!isEnvEnabled(env.JARVIS_CODEX_CHAT_ENABLED, true)) return false;
    try {
      const status = await codexSubscriptionProvider.getAvailability();
      return status.installed && status.authenticated;
    } catch (error) {
      logger.warn({ err: error }, '[Codex Adapter] availability check failed.');
      return false;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!isEnvEnabled(env.JARVIS_CODEX_CHAT_ENABLED, true)) {
      throw new ProviderError('Codex chat bridge is disabled.', this.id, 'PROVIDER_UNAVAILABLE', undefined, false);
    }

    // Falls back to the running process's own working directory (the JARVIS
    // project root on the local runtime) rather than a hardcoded drive path.
    const cwd = env.JARVIS_CODEX_CHAT_CWD || process.cwd();
    const prompt = buildPrompt(request);
    if (!prompt.trim()) {
      throw new ProviderError('Codex turn prompt is empty.', this.id, 'INVALID_REQUEST');
    }

    let threadId = '';
    let turnId = '';
    let model = request.model || '';
    try {
      // Capture the event cursor BEFORE the turn starts so we only observe
      // events belonging to this turn (provider.getEvents is append-only).
      const beforeSequence = lastSequence();
      const thread = await codexSubscriptionProvider.startThread({
        cwd,
        sandbox: 'read-only',
        model: request.model || undefined,
      });
      threadId = thread.threadId;
      model = model || thread.model;

      const turn = await codexSubscriptionProvider.startTurn(threadId, prompt, {
        model: request.model || undefined,
      });
      turnId = turn.turnId;

      const result = await this.waitForTurn(threadId, beforeSequence, request);
      return {
        content: result.content,
        model: model || 'codex-subscription',
        finishReason: result.finishReason,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        metadata: { provider: this.id, threadId, turnId, source: 'chatgpt-subscription' },
      };
    } catch (error) {
      throw wrapError(error, this.id);
    } finally {
      // Codex threads are cheap under the subscription; for the chat bridge we
      // use one fresh thread per message to keep context isolated. The thread
      // record stays in `codex_provider_sessions` for audit but the live
      // app-server thread is left to expire server-side.
      if (threadId) logger.debug(`[Codex Adapter] chat turn complete (thread=${threadId}, turn=${turnId})`);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await codexSubscriptionProvider.listModels();
      return models.map((item) => ({
        id: item.id,
        name: item.displayName || item.model,
        provider: this.id,
        capabilities: item.inputModalities,
      }));
    } catch (error) {
      throw wrapError(error, this.id);
    }
  }

  private async waitForTurn(
    threadId: string,
    beforeSequence: number,
    request: CompletionRequest,
  ): Promise<{ content: string; finishReason: string | null }> {
    const timeoutMs = Math.max(5_000, request.maxTokens && request.maxTokens > 8000 ? 240_000 : DEFAULT_TURN_TIMEOUT_MS);
    const deadline = Date.now() + timeoutMs;
    let lastSeenSequence = beforeSequence;
    let chunks: string[] = [];
    let finishReason: string | null = null;
    let failure: string | undefined;

    while (Date.now() < deadline) {
      const events = codexSubscriptionProvider.getEvents(lastSeenSequence, threadId);
      for (const event of events) {
        if (event.sequence > lastSeenSequence) lastSeenSequence = event.sequence;
        if (event.textDelta) chunks.push(event.textDelta);
        if (event.type === 'TURN_COMPLETED') finishReason = 'stop';
        if (event.type === 'TURN_INTERRUPTED') finishReason = 'interrupted';
        if (event.type === 'TURN_FAILED') {
          finishReason = 'error';
          failure = event.message;
        }
        if (event.type === 'PROCESS_TERMINATED') {
          finishReason = 'error';
          failure = event.message ?? 'Codex app-server terminated unexpectedly.';
        }
      }
      if (finishReason) break;
      await sleep(POLL_INTERVAL_MS);
    }

    if (!finishReason) {
      throw new ProviderError('Codex turn timed out.', this.id, 'TIMEOUT', undefined, true);
    }
    if (finishReason === 'error') {
      throw new ProviderError(failure || 'Codex turn failed.', this.id, 'PROVIDER_UNAVAILABLE', undefined, true);
    }
    return { content: chunks.join('').trim(), finishReason };
  }
}

function buildPrompt(request: CompletionRequest): string {
  // Codex turn input is a single text payload; we fold the conversation into
  // a clearly delimited prompt so the model retains role context.
  const lines: string[] = [];
  for (const message of request.messages) {
    const role = message.role.toUpperCase();
    const content = typeof message.content === 'string' ? message.content : '';
    if (!content.trim()) continue;
    lines.push(`[${role}]\n${content.trim()}`);
  }
  // If there is no explicit user turn, append the raw model field as a hint
  // so Codex still has something concrete to act on.
  if (!lines.some((line) => line.startsWith('[USER]'))) {
    lines.push(`[USER]\nRespond to the request above. Model target: ${request.model || 'default'}.`);
  }
  return lines.join('\n\n---\n\n');
}

function lastSequence(): number {
  // Capture the highest observed sequence number so the subsequent
  // getEvents(afterSequence) slice only contains events emitted after now.
  // afterSequence=0 returns the full in-memory buffer.
  const events = codexSubscriptionProvider.getEvents(0);
  return events.reduce((max, event) => (event.sequence > max ? event.sequence : max), 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wrapError(error: unknown, providerId: string): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof CodexProviderError) {
    const code =
      error.code === 'AUTH_REQUIRED' ? 'AUTH_FAILED'
      : error.code === 'RATE_LIMITED' ? 'RATE_LIMITED'
      : error.code === 'MODEL_UNAVAILABLE' ? 'MODEL_NOT_FOUND'
      : error.code === 'PERMISSION_DENIED' ? 'PROVIDER_UNAVAILABLE'
      : 'PROVIDER_UNAVAILABLE';
    return new ProviderError(error.message, providerId, code, undefined, error.retryable);
  }
  const message = error instanceof Error ? error.message : 'Codex provider failed.';
  return new ProviderError(message, providerId, 'UNKNOWN', undefined, true);
}
