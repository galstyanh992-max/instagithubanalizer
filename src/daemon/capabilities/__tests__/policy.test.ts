import { describe, it, expect } from 'vitest';
import { evaluateCapabilityPolicy } from '../policy';
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';

function envelope(capability: string, operation: string): CapabilityCommandEnvelope {
  return { protocolVersion: 1, capability: capability as any, operation };
}

describe('evaluateCapabilityPolicy', () => {
  it('allows every operation currently in the CAPABILITY_OPERATIONS catalog (all declared LOW risk)', () => {
    const pairs: Array<[string, string]> = [
      ['system', 'status'], ['ollama', 'health'], ['ollama', 'models'],
      ['filesystem', 'list'], ['mcp', 'list'],
      ['browser', 'open'], ['browser', 'status'], ['browser', 'stop'],
      ['n8n', 'health'], ['n8n', 'smoke'],
    ];
    for (const [capability, operation] of pairs) {
      const decision = evaluateCapabilityPolicy(envelope(capability, operation));
      expect(decision.allowed, `${capability}.${operation} should be allowed`).toBe(true);
    }
  });

  it('fails closed for a capability/operation pair outside the explicit catalog', () => {
    const decision = evaluateCapabilityPolicy(envelope('filesystem', 'write'));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/не входит в утверждённый каталог/i);
  });

  it('fails closed for a completely unknown capability', () => {
    const decision = evaluateCapabilityPolicy(envelope('shell', 'exec'));
    expect(decision.allowed).toBe(false);
  });
});
