import { describe, it, expect, vi } from 'vitest';
import { DaemonCapabilityRegistryImpl } from '../registry';
import type { DaemonCapabilityExecutor } from '../types';
import { ok } from '../types';
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';

function envelope(overrides: Partial<CapabilityCommandEnvelope> = {}): CapabilityCommandEnvelope {
  return { protocolVersion: 1, capability: 'system', operation: 'status', ...overrides };
}

describe('DaemonCapabilityRegistry.dispatch', () => {
  it('rejects an operation not in the CAPABILITY_OPERATIONS catalog (fail-closed)', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    const result = await registry.dispatch(envelope({ capability: 'filesystem', operation: 'delete' as any }));
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/не входит в утверждённый каталог/i);
  });

  it('reports a clear error when no executor is registered for an otherwise-valid capability', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    const result = await registry.dispatch(envelope({ capability: 'ollama', operation: 'health' }));
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/нет обработчика/i);
  });

  it('runs a registered executor and returns its result', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    const executor: DaemonCapabilityExecutor = {
      id: 'system',
      canHandle: (c) => c === 'system',
      validate: () => ({ ok: true }),
      execute: async () => ok({ hello: 'world' }),
    };
    registry.register(executor);
    const result = await registry.dispatch(envelope());
    expect(result.status).toBe('succeeded');
    expect(JSON.parse(result.resultData!)).toEqual({ hello: 'world' });
  });

  it('fails validation before ever calling execute()', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    const execute = vi.fn(async () => ok({}));
    const executor: DaemonCapabilityExecutor = {
      id: 'system',
      canHandle: (c) => c === 'system',
      validate: () => ({ ok: false, reason: 'bad args' }),
      execute,
    };
    registry.register(executor);
    const result = await registry.dispatch(envelope());
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('bad args');
    expect(execute).not.toHaveBeenCalled();
  });

  it('propagates the AbortSignal to the executor so it can react to cancellation', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    let sawSignal: AbortSignal | null = null;
    const executor: DaemonCapabilityExecutor = {
      id: 'system',
      canHandle: (c) => c === 'system',
      validate: () => ({ ok: true }),
      execute: async (_envelope, signal) => {
        sawSignal = signal;
        return ok({});
      },
    };
    registry.register(executor);
    await registry.dispatch(envelope());
    expect(sawSignal).toBeInstanceOf(AbortSignal);
    expect((sawSignal as unknown as AbortSignal).aborted).toBe(false);
  });

  it('truncates an oversized result instead of returning raw megabytes', async () => {
    const registry = new DaemonCapabilityRegistryImpl();
    const bigString = 'x'.repeat(300 * 1024);
    const executor: DaemonCapabilityExecutor = {
      id: 'system',
      canHandle: (c) => c === 'system',
      validate: () => ({ ok: true }),
      execute: async () => ok({ big: bigString }),
    };
    registry.register(executor);
    const result = await registry.dispatch(envelope());
    expect(result.status).toBe('succeeded');
    const parsed = JSON.parse(result.resultData!);
    expect(parsed.truncated).toBe(true);
  });
});
