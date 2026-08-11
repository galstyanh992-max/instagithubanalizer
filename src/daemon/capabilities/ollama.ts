// Real ollama capability — reuses src/local-runtime/platform/ollama-adapter.ts
// (the real implementation, HTTP to 127.0.0.1:11434) directly, not the
// src/lib/jarvis/platform/ollama-adapter.ts web proxy, which exists purely
// to keep the Vercel bundle clean of local-only network calls and has no
// logic of its own worth reusing here. No new Ollama client code is written
// — this file only validates the operation and shapes the result.
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';

export const ollamaExecutor: DaemonCapabilityExecutor = {
  id: 'ollama',
  canHandle: (capability) => capability === 'ollama',
  validate: (envelope) => {
    if (!['health', 'models'].includes(envelope.operation)) {
      return { ok: false, reason: `Неподдерживаемая операция ollama: ${envelope.operation}` };
    }
    return { ok: true };
  },
  async execute(envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');
      const { ollamaAdapter } = await import('@/local-runtime/platform/ollama-adapter');

      if (envelope.operation === 'health') {
        const health = await ollamaAdapter.health();
        return ok(health);
      }
      if (envelope.operation === 'models') {
        const models = await ollamaAdapter.models();
        return ok({ count: models.length, models });
      }
      return fail(`Неподдерживаемая операция ollama: ${envelope.operation}`);
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
