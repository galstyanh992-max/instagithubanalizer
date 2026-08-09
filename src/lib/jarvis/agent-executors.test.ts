import { describe, expect, it, vi } from 'vitest';
import {
  DryRunAgentExecutor,
  ProductionAgentExecutor,
  normalizeCanonicalRuntimeResult,
  type AgentExecutionContext,
  type ProductionRuntimeDependencies,
} from './agent-executors';
import { jarvisAgentRegistry } from './agent-registry';
import type { TaskNode } from './types';

function context(): AgentExecutionContext {
  const agent = jarvisAgentRegistry.getById('frontend_engineer')!;
  const task: TaskNode = {
    id: 't1', runId: 'r1', title: 'Build UI', description: 'Build UI',
    agentId: agent.id, role: agent.role, toolKeys: [], dependsOn: [], dependents: [],
    status: 'ready', priority: 'medium', riskLevel: 'low', artifactsIn: [],
    artifactsOut: [], findings: [], retryCount: 0,
  };
  return {
    agent,
    task,
    request: {
      runId: 'r1', taskId: 't1', agentId: agent.id, role: agent.role,
      mission: task.title, confirmedContext: {}, inputArtifacts: [], availableTools: [],
      allowedScope: agent.allowedTools, forbiddenActions: agent.forbiddenActions,
      expectedOutput: {}, acceptanceCriteria: [], verificationMethod: 'self_check',
      exitCriteria: [], timeoutMs: 1000, maxRetries: 0,
    },
  };
}

describe('JARVIS agent executors', () => {
  it('keeps simulation explicit in dry-run mode', async () => {
    const result = await new DryRunAgentExecutor().execute(context());
    expect(result.status).toBe('passed');
    expect(result.verificationEvidence[0]?.type).toBe('dry_run');
  });

  it('blocks production mock providers without invoking runtime', async () => {
    const execute = vi.fn();
    const deps: ProductionRuntimeDependencies = {
      initialize: async () => undefined,
      hasAgent: () => true,
      resolveProvider: () => ({ provider: 'mock', model: 'mock' }),
      isProviderAvailable: async () => true,
      execute,
    };
    const result = await new ProductionAgentExecutor(deps).execute(context());
    expect(result.status).toBe('blocked');
    expect(result.summary).toMatch(/AUTH_REQUIRED/);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects malformed canonical runtime output', () => {
    expect(() => normalizeCanonicalRuntimeResult({ status: 'success' }, context(), Date.now())).toThrow(/Malformed/);
  });

  it('uses canonical runtime for a production success', async () => {
    const deps: ProductionRuntimeDependencies = {
      initialize: async () => undefined,
      hasAgent: () => true,
      resolveProvider: () => ({ provider: 'openrouter', model: 'model' }),
      isProviderAvailable: async () => true,
      execute: async () => ({
        agentId: 'frontend_engineer',
        content: 'Verified runtime output',
        model: 'model',
        resolvedModel: { provider: 'openrouter', model: 'model', preferenceType: 'preferred' },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
        durationMs: 5,
        status: 'success',
      }),
    };
    const result = await new ProductionAgentExecutor(deps).execute(context());
    expect(result.status).toBe('passed');
    expect(result.verificationEvidence[0]?.type).toBe('canonical_agent_runtime');
  });
});
