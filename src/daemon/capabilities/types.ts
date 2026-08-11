import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';

export interface CapabilityExecutionResult {
  status: 'succeeded' | 'failed';
  // Always a JSON-stringified, size-capped payload (see registry.ts's
  // MAX_RESULT_BYTES) — never raw megabyte-scale output (Section 14 output
  // limits requirement).
  resultData?: string;
  errorMessage?: string;
}

export interface DaemonCapabilityExecutor {
  /** Matches CapabilityId from src/lib/jarvis/capabilities/envelope.ts */
  id: string;
  canHandle(capability: string): boolean;
  /** Cheap, synchronous shape/argument validation before any real work starts. */
  validate(envelope: CapabilityCommandEnvelope): { ok: true } | { ok: false; reason: string };
  /** Real work. Must honor `signal` for cancellation/timeout. */
  execute(envelope: CapabilityCommandEnvelope, signal: AbortSignal): Promise<CapabilityExecutionResult>;
}

export function ok(resultData: unknown): CapabilityExecutionResult {
  return { status: 'succeeded', resultData: JSON.stringify(resultData) };
}

export function fail(errorMessage: string): CapabilityExecutionResult {
  return { status: 'failed', errorMessage };
}
