// Thin shared-tree proxy for the Codex ChatGPT-subscription provider. The
// real implementation (CLI process discovery, app-server child process,
// local working-directory validation) lives at
// src/local-runtime/ai-provider/codex-subscription/ and is local-runtime
// only. This proxy implements the same CodexSubscriptionProviderContract so
// every existing consumer (API routes, ai-provider-router.service.ts,
// server.ts's provider registration) keeps importing this exact path with
// zero changes, while failing closed with LOCAL_EXECUTION_FORBIDDEN on
// web-control-plane instead of ever reaching a local process.
import { env } from '@/lib/env';
import {
  CODEX_SUBSCRIPTION_PROVIDER_ID,
  CodexProviderError,
  type CodexModel,
  type CodexNormalizedEvent,
  type CodexProviderAvailability,
  type CodexSubscriptionProviderContract,
  type CodexThread,
  type CodexThreadOptions,
  type CodexTurn,
} from './types';
import type { CodexSubscriptionProvider as RealCodexSubscriptionProvider } from '@/local-runtime/ai-provider/codex-subscription/provider';

const FORBIDDEN_MESSAGE = 'LOCAL_EXECUTION_FORBIDDEN: The official Codex CLI runs on the local JARVIS runtime only.';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

function forbiddenAvailability(failureCode = 'LOCAL_EXECUTION_FORBIDDEN'): CodexProviderAvailability {
  return {
    providerId: CODEX_SUBSCRIPTION_PROVIDER_ID,
    status: 'NOT_INSTALLED',
    installed: false,
    authenticated: false,
    appServerReady: false,
    failureCode,
    message: FORBIDDEN_MESSAGE,
  };
}

let cachedReal: RealCodexSubscriptionProvider | null = null;

async function real(): Promise<RealCodexSubscriptionProvider> {
  const { codexSubscriptionProvider: realProvider } = await import('@/local-runtime/ai-provider/codex-subscription');
  cachedReal = realProvider;
  return realProvider;
}

class CodexSubscriptionProviderProxy implements CodexSubscriptionProviderContract {
  readonly id = CODEX_SUBSCRIPTION_PROVIDER_ID;

  async getAvailability(): Promise<CodexProviderAvailability> {
    if (isForbidden()) return forbiddenAvailability();
    return (await real()).getAvailability();
  }

  getAuthStatus(): Promise<CodexProviderAvailability> {
    return this.getAvailability();
  }

  async login(): Promise<CodexProviderAvailability> {
    if (isForbidden()) return forbiddenAvailability();
    return (await real()).login();
  }

  async logout(): Promise<CodexProviderAvailability> {
    if (isForbidden()) return forbiddenAvailability();
    return (await real()).logout();
  }

  async listModels(): Promise<CodexModel[]> {
    if (isForbidden()) throw new CodexProviderError('NOT_INSTALLED', FORBIDDEN_MESSAGE);
    return (await real()).listModels();
  }

  async getCapabilities(): Promise<Record<string, boolean>> {
    if (isForbidden()) {
      return {
        officialCli: false,
        chatgptSubscriptionAuth: false,
        dynamicModels: false,
        threads: false,
        resumableThreads: false,
        streamingEvents: false,
        cancellation: false,
        approvals: false,
        localRepositoryCwd: false,
      };
    }
    return (await real()).getCapabilities();
  }

  async startThread(options: CodexThreadOptions): Promise<CodexThread> {
    if (isForbidden()) throw new CodexProviderError('PERMISSION_DENIED', FORBIDDEN_MESSAGE);
    return (await real()).startThread(options);
  }

  async resumeThread(threadId: string, options: Partial<CodexThreadOptions> = {}): Promise<CodexThread> {
    if (isForbidden()) throw new CodexProviderError('PERMISSION_DENIED', FORBIDDEN_MESSAGE);
    return (await real()).resumeThread(threadId, options);
  }

  async startTurn(
    threadId: string,
    prompt: string,
    options: { model?: string; reasoningEffort?: string } = {},
  ): Promise<CodexTurn> {
    if (isForbidden()) throw new CodexProviderError('PERMISSION_DENIED', FORBIDDEN_MESSAGE);
    return (await real()).startTurn(threadId, prompt, options);
  }

  async cancelTurn(threadId: string, turnId: string): Promise<void> {
    if (isForbidden()) return;
    return (await real()).cancelTurn(threadId, turnId);
  }

  async getHealth(): Promise<CodexProviderAvailability> {
    if (isForbidden()) return forbiddenAvailability();
    return (await real()).getHealth();
  }

  // Not part of CodexSubscriptionProviderContract (extra surface the concrete
  // class exposes). Synchronous by necessity — callers (adapter.ts's turn
  // poll loop) always call this after an already-awaited startThread/
  // startTurn, by which point `real()` has already resolved and cached the
  // live instance. On web-control-plane `real()` is never reached, so this
  // stays a safe, honest empty array forever.
  getEvents(afterSequence = 0, threadId?: string): CodexNormalizedEvent[] {
    if (!cachedReal) return [];
    return cachedReal.getEvents(afterSequence, threadId);
  }
}

export const codexSubscriptionProvider: CodexSubscriptionProviderContract & {
  getEvents(afterSequence?: number, threadId?: string): CodexNormalizedEvent[];
} = new CodexSubscriptionProviderProxy();

export * from './types';
export * from './redaction';
export * from './trusted-local';
