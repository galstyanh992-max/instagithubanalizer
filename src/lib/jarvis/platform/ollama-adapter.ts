// Lazy proxy for Ollama. The real implementation (network fetch to the
// local Ollama server, local benchmark file I/O) lives in
// src/local-runtime/platform/ollama-adapter.ts and is NEVER statically
// imported here — every method that would touch the network dynamically
// imports it, and only after confirming JARVIS_RUNTIME_ROLE isn't
// "web-control-plane". This file only exposes metadata/capabilities
// (static data, no side effects), so it's safe to keep at its historical
// path — every existing consumer (adapter-registry.ts, discovery.ts,
// ollama-local/adapter.ts, the /api/jarvis/ollama route) keeps working
// unchanged.

import { env } from '@/lib/env';
import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterHealth,
  AdapterStatus,
  JarvisRuntimeAdapter,
} from './adapter-contract';
import type { OllamaModelDetails } from './types';
import type {
  OllamaAdapter as RealOllamaAdapter,
  OllamaChatResponse,
} from '@/local-runtime/platform/ollama-adapter';

const FORBIDDEN_MESSAGE = 'LOCAL_EXECUTION_FORBIDDEN: Ollama runs on the local JARVIS runtime only.';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

function forbiddenHealth(): AdapterHealth {
  return { state: 'UNKNOWN', message: FORBIDDEN_MESSAGE, checkedAt: new Date().toISOString(), latencyMs: 0 };
}

function forbiddenExecutionResult(startedAt: number): AdapterExecutionResult {
  return {
    ok: false,
    error: { code: 'LOCAL_EXECUTION_FORBIDDEN', message: FORBIDDEN_MESSAGE, retryable: false },
    durationMs: Date.now() - startedAt,
  };
}

async function real(): Promise<RealOllamaAdapter> {
  const { ollamaAdapter } = await import('@/local-runtime/platform/ollama-adapter');
  return ollamaAdapter;
}

class OllamaAdapterProxy implements JarvisRuntimeAdapter {
  metadata() {
    return {
      id: 'ollama-local',
      name: 'Ollama Local',
      kind: 'provider',
      description: 'Официальный локальный runtime Ollama',
      source: 'ollama/ollama',
    };
  }

  capabilities() {
    return ['local_ai', 'chat', 'streaming', 'structured_output', 'classification', 'completion', 'embeddings', 'model_management', 'benchmark'];
  }

  async configuration(): Promise<Record<string, unknown>> {
    if (isForbidden()) {
      return { localOnly: true, available: false, reason: FORBIDDEN_MESSAGE };
    }
    return (await real()).configuration();
  }

  async health(): Promise<AdapterHealth> {
    if (isForbidden()) return forbiddenHealth();
    return (await real()).health();
  }

  async version(): Promise<string | null> {
    if (isForbidden()) return null;
    return (await real()).version();
  }

  async status(): Promise<AdapterStatus> {
    if (isForbidden()) return { installed: false, enabled: false, running: false, state: 'FORBIDDEN' };
    return (await real()).status();
  }

  async models(): Promise<OllamaModelDetails[]> {
    if (isForbidden()) return [];
    return (await real()).models();
  }

  async chat(input: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format?: Record<string, unknown> | 'json';
    options?: Record<string, unknown>;
    cold?: boolean;
    signal?: AbortSignal;
  }): Promise<OllamaChatResponse> {
    if (isForbidden()) throw new Error(FORBIDDEN_MESSAGE);
    return (await real()).chat(input);
  }

  async streamChat(input: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    options?: Record<string, unknown>;
    cold?: boolean;
    signal?: AbortSignal;
  }): Promise<{ chunks: string[]; response: string; timeToFirstTokenMs: number | null; durationMs: number }> {
    if (isForbidden()) throw new Error(FORBIDDEN_MESSAGE);
    return (await real()).streamChat(input);
  }

  async metrics(): Promise<Record<string, number | string | null>> {
    if (isForbidden()) return { installed_models: 0, loaded_models: 0, loaded_ram_bytes: 0, last_benchmark_ms: null, last_tokens_per_second: null, last_benchmark_model: null };
    return (await real()).metrics();
  }

  async execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
    const startedAt = Date.now();
    if (isForbidden()) return forbiddenExecutionResult(startedAt);
    return (await real()).execute(request);
  }
}

export const ollamaAdapter = new OllamaAdapterProxy();
