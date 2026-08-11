// Generic daemon capability dispatcher — the "governed daemon capability
// dispatcher" the repair pass called for: a single place that validates,
// checks policy, resolves the right executor, applies a capability-
// appropriate timeout with real cancellation (AbortSignal, unlike
// ProcessRunner.executeSafe which only has an internal timer — see
// docs/jarvis/remote-architecture.md), caps output size, and normalizes the
// result. New capabilities are added by writing one executor module and
// registering it in index.ts — this file has no capability-specific logic
// (no `switch (capability) { case "OLLAMA": ... }`).
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { CapabilityExecutionResult, DaemonCapabilityExecutor } from './types';
import { fail } from './types';
import { evaluateCapabilityPolicy } from './policy';

// Result payloads here are structured API responses (Ollama model lists,
// directory listings, MCP server status, etc.), not raw process/log output —
// 256 KB is generous headroom while still preventing an unbounded payload
// from being pushed into a task event/result row.
const MAX_RESULT_BYTES = 256 * 1024;

// Per-capability timeout. Deliberately more generous than the sub-operation
// timeouts already enforced inside each adapter (e.g. Ollama's own 8-120s
// per-call timeouts) so the daemon-level timeout is a genuine outer bound,
// not a race against the adapter's own logic.
const CAPABILITY_TIMEOUT_MS: Record<string, number> = {
  system: 10_000,
  ollama: 15_000,
  filesystem: 8_000,
  mcp: 25_000,
  browser: 20_000,
  n8n: 150_000, // docker compose up + workflow execution can genuinely take minutes
};
const DEFAULT_TIMEOUT_MS = 20_000;

// Exported (not just the singleton instance below) so tests can construct
// an isolated registry with fake executors instead of exercising the real,
// process-global one (which has real Ollama/filesystem/MCP/browser/n8n
// executors registered against it via src/daemon/capabilities/index.ts).
export class DaemonCapabilityRegistryImpl {
  private executors: DaemonCapabilityExecutor[] = [];

  register(executor: DaemonCapabilityExecutor): void {
    this.executors.push(executor);
  }

  resolve(capability: string): DaemonCapabilityExecutor | undefined {
    return this.executors.find((executor) => executor.canHandle(capability));
  }

  list(): string[] {
    return this.executors.map((executor) => executor.id);
  }

  /**
   * Full governed dispatch: policy -> validate -> execute-with-timeout ->
   * cap output. The only entry point src/daemon/poller/index.ts should call.
   */
  async dispatch(envelope: CapabilityCommandEnvelope): Promise<CapabilityExecutionResult> {
    const policy = evaluateCapabilityPolicy(envelope);
    if (!policy.allowed) {
      return fail(policy.requiresApproval
        ? `Требуется подтверждение владельца: ${policy.reason}`
        : `Запрещено политикой безопасности: ${policy.reason}`);
    }

    const executor = this.resolve(envelope.capability);
    if (!executor) {
      return fail(`Нет обработчика для возможности: ${envelope.capability}`);
    }

    const validation = executor.validate(envelope);
    if (!validation.ok) {
      return fail(validation.reason);
    }

    const timeoutMs = CAPABILITY_TIMEOUT_MS[envelope.capability] ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await executor.execute(envelope, controller.signal);
      return this.capOutput(result);
    } catch (error: any) {
      if (controller.signal.aborted) {
        return fail(`Превышено время ожидания выполнения (${timeoutMs}мс)`);
      }
      return fail(error?.message ?? String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private capOutput(result: CapabilityExecutionResult): CapabilityExecutionResult {
    if (!result.resultData) return result;
    const byteLength = Buffer.byteLength(result.resultData, 'utf8');
    if (byteLength <= MAX_RESULT_BYTES) return result;
    return {
      ...result,
      resultData: JSON.stringify({
        truncated: true,
        originalBytes: byteLength,
        note: `Результат превысил ${MAX_RESULT_BYTES} байт и был обрезан демоном.`,
        preview: result.resultData.slice(0, 2000),
      }),
    };
  }
}

export const DaemonCapabilityRegistry = new DaemonCapabilityRegistryImpl();
