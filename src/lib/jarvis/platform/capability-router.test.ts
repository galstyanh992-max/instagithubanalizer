import { describe, expect, it } from 'vitest';
import { createCapabilityRecord } from './capability-registry';
import { CapabilityRouter, rankCapabilities } from './capability-router';

function capability(id: string, options: Parameters<typeof createCapabilityRecord>[0] extends infer T ? Partial<T> : never = {}) {
  return createCapabilityRecord({
    id,
    name: id,
    kind: 'browser',
    category: 'BROWSERS',
    description: id,
    installed: true,
    enabled: true,
    health: 'HEALTHY',
    capabilities: ['research'],
    ...options,
  });
}

describe('CapabilityRouter', () => {
  it('не выбирает отключённые и нездоровые возможности', () => {
    const ranked = rankCapabilities([
      capability('disabled', { enabled: false }),
      capability('broken', { health: 'UNHEALTHY' }),
      capability('healthy', { success_rate: 90 }),
    ], { required: ['research'] });
    expect(ranked.map((item) => item.capability.id)).toEqual(['healthy']);
  });

  it('переходит к fallback после ошибки первого кандидата', async () => {
    const router = new CapabilityRouter(async () => [
      capability('primary', { priority: 100, success_rate: 99 }),
      capability('fallback', { priority: 50, success_rate: 80 }),
    ]);
    const result = await router.executeWithFallback({
      request: { required: ['research'] },
      execute: async (selected) => {
        if (selected.id === 'primary') throw new Error('primary failed');
        return 'ok';
      },
    });
    expect(result.result).toBe('ok');
    expect(result.selected).toBe('fallback');
    expect(result.attempts).toHaveLength(2);
  });
});
