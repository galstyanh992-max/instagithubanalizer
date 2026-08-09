import type { HealthState } from './types';

export interface AdapterMetadata {
  id: string;
  name: string;
  kind: string;
  description: string;
  source: string;
}

export interface AdapterHealth {
  state: HealthState;
  message: string;
  checkedAt: string;
  latencyMs?: number;
}

export interface AdapterStatus {
  installed: boolean;
  enabled: boolean;
  running: boolean;
  state: string;
}

export interface AdapterExecutionRequest {
  action: string;
  input?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AdapterExecutionResult {
  ok: boolean;
  output?: unknown;
  error?: { code: string; message: string; retryable: boolean };
  durationMs: number;
}

export interface JarvisRuntimeAdapter {
  metadata(): AdapterMetadata | Promise<AdapterMetadata>;
  capabilities(): string[] | Promise<string[]>;
  health(): Promise<AdapterHealth>;
  version(): Promise<string | null>;
  configuration(): Record<string, unknown> | Promise<Record<string, unknown>>;
  execute(request: AdapterExecutionRequest): Promise<AdapterExecutionResult>;
  status(): Promise<AdapterStatus>;
  metrics(): Promise<Record<string, number | string | null>>;
  start?(): Promise<AdapterExecutionResult>;
  stop?(): Promise<AdapterExecutionResult>;
  restart?(): Promise<AdapterExecutionResult>;
  install?(): Promise<AdapterExecutionResult>;
  uninstall?(): Promise<AdapterExecutionResult>;
  update?(): Promise<AdapterExecutionResult>;
}

export async function runAdapterAction(
  adapter: JarvisRuntimeAdapter,
  request: AdapterExecutionRequest,
  timeoutMs = 30_000,
): Promise<AdapterExecutionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    return await adapter.execute({ ...request, signal: request.signal ?? controller.signal });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    return {
      ok: false,
      error: {
        code: timedOut ? 'ADAPTER_TIMEOUT' : 'ADAPTER_EXECUTION_FAILED',
        message: timedOut ? `Превышен лимит ${timeoutMs} мс` : error instanceof Error ? error.message : String(error),
        retryable: timedOut,
      },
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
