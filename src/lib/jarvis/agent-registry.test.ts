import { describe, it, expect } from 'vitest';
import { jarvisAgentRegistry, toAgentDefinition } from './agent-registry';
import { DEFAULT_AGENTS } from '@/lib/agent-registry/defaults';

describe('jarvisAgentRegistry', () => {
  it('lists all default agents', () => {
    const agents = jarvisAgentRegistry.list();
    expect(agents.length).toBe(DEFAULT_AGENTS.length);
  });

  it('maps a default agent to the JARVIS contract', () => {
    const orchestrator = DEFAULT_AGENTS[0];
    const def = toAgentDefinition(orchestrator);
    expect(def.role).toBe('orchestrator');
    expect(def.allowedTools.length).toBeGreaterThan(0);
    expect(def.forbiddenActions.length).toBeGreaterThan(0);
  });

  it('filters by capability', () => {
    const coders = jarvisAgentRegistry.filterByCapability('react');
    expect(coders.map((a) => a.role)).toContain('frontend_engineer');
  });
});
