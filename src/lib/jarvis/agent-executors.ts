import { z } from 'zod';
import { isToolAllowedForAgent, validateRequestLimits } from './security';
import type { AgentDefinition, AgentRequest, AgentResult, TaskNode } from './types';

export interface AgentExecutionContext {
  agent: AgentDefinition;
  request: AgentRequest;
  task: TaskNode;
  signal?: AbortSignal;
}

export interface JarvisAgentExecutor {
  readonly kind: 'production' | 'dry-run' | 'test';
  execute(context: AgentExecutionContext): Promise<AgentResult>;
}

export interface CanonicalRuntimeResult {
  agentId: string;
  content: string | null;
  model: string;
  resolvedModel: { provider: string; model: string; preferenceType: string };
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason: string | null;
  durationMs: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

export interface ProductionRuntimeDependencies {
  initialize(): Promise<void>;
  hasAgent(agentId: string): boolean;
  resolveProvider(agentId: string): { provider: string; model: string };
  isProviderAvailable(providerId: string): Promise<boolean>;
  execute(agentId: string, input: {
    message: string;
    correlationId: string;
    maxTokens?: number;
  }): Promise<unknown>;
}

const runtimeResultSchema = z.object({
  agentId: z.string().min(1),
  content: z.string().nullable(),
  model: z.string().min(1),
  resolvedModel: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    preferenceType: z.string().min(1),
  }),
  usage: z.object({
    promptTokens: z.number().nonnegative(),
    completionTokens: z.number().nonnegative(),
    totalTokens: z.number().nonnegative(),
  }),
  finishReason: z.string().nullable(),
  durationMs: z.number().nonnegative(),
  status: z.enum(['success', 'error', 'timeout']),
  error: z.string().optional(),
});

function blockedResult(request: AgentRequest, reason: string, startedAt: number): AgentResult {
  return {
    status: 'blocked',
    summary: reason,
    completedTasks: [],
    artifacts: [],
    proposedChanges: [],
    changedFiles: [],
    commandsRun: [],
    verificationEvidence: [],
    confirmedFindings: [],
    assumptions: [],
    unknowns: [],
    blockers: [reason],
    recommendedNextAction: 'Configure and verify a non-mock provider, then resume the run.',
    durationMs: Date.now() - startedAt,
  };
}

export function normalizeCanonicalRuntimeResult(
  raw: unknown,
  context: AgentExecutionContext,
  startedAt: number,
): AgentResult {
  const parsed = runtimeResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Malformed canonical AgentResult: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}`);
  }
  const result = parsed.data;
  if (result.status !== 'success') {
    const reason = result.error || `Agent runtime returned ${result.status}`;
    return {
      ...blockedResult(context.request, reason, startedAt),
      status: result.status === 'timeout' ? 'failed' : 'blocked',
      recommendedNextAction: result.status === 'timeout' ? 'Retry within the configured limit.' : 'Resolve provider access and resume.',
    };
  }
  if (!result.content?.trim()) {
    throw new Error('Malformed canonical AgentResult: successful result has no content');
  }
  return {
    status: 'passed',
    summary: result.content,
    completedTasks: [context.task.title],
    artifacts: [],
    proposedChanges: [],
    changedFiles: [],
    commandsRun: [],
    verificationEvidence: [{
      type: 'canonical_agent_runtime',
      summary: `${result.resolvedModel.provider}/${result.model}`,
      data: { finishReason: result.finishReason, usage: result.usage },
    }],
    confirmedFindings: [],
    assumptions: [],
    unknowns: [],
    blockers: [],
    recommendedNextAction: 'Verify the produced artifact against the task acceptance criteria.',
    durationMs: result.durationMs || Date.now() - startedAt,
  };
}

async function defaultProductionDependencies(): Promise<ProductionRuntimeDependencies> {
  const [{ initProviders, providerRegistry }, { AGENT_CONFIGS }, loader, core] = await Promise.all([
    import('@/lib/ai-provider/server'),
    import('@/lib/agent-configs'),
    import('@/lib/agent-core/config-loader'),
    import('@/lib/agent-core'),
  ]);
  return {
    async initialize() {
      await initProviders();
      loader.loadAgentConfigs(AGENT_CONFIGS);
    },
    hasAgent: (agentId) => core.agentRegistry.has(agentId),
    resolveProvider: (agentId) => {
      const resolved = core.agentRegistry.resolveModel(agentId);
      return { provider: resolved.provider, model: resolved.model };
    },
    isProviderAvailable: async (providerId) => {
      const provider = providerRegistry.get(providerId);
      return provider ? provider.isAvailable() : false;
    },
    execute: (agentId, input) => core.agentRuntime.execute(agentId, input),
  };
}

function raceWithGuards<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Agent execution timed out')), timeoutMs);
    const abort = () => reject(new Error('Agent execution cancelled'));
    signal?.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    });
  });
}

export class ProductionAgentExecutor implements JarvisAgentExecutor {
  readonly kind = 'production' as const;

  constructor(private readonly dependencies?: ProductionRuntimeDependencies) {}

  async execute(context: AgentExecutionContext): Promise<AgentResult> {
    const startedAt = Date.now();
    const limits = validateRequestLimits(context.request);
    if (!limits.ok) return blockedResult(context.request, limits.violations.join('; '), startedAt);
    if (!context.agent.enabled) return blockedResult(context.request, 'Selected agent is disabled', startedAt);
    for (const toolKey of context.task.toolKeys) {
      const permission = isToolAllowedForAgent(toolKey, context.agent);
      if (!permission.allowed) return blockedResult(context.request, permission.reason ?? 'Tool permission denied', startedAt);
    }

    const dependencies = this.dependencies ?? await defaultProductionDependencies();
    await dependencies.initialize();
    if (!dependencies.hasAgent(context.request.agentId)) {
      return blockedResult(context.request, `Agent ${context.request.agentId} is not registered in the canonical runtime`, startedAt);
    }
    const resolved = dependencies.resolveProvider(context.request.agentId);
    if (resolved.provider === 'mock') {
      return blockedResult(context.request, 'AUTH_REQUIRED: production execution cannot use the mock provider', startedAt);
    }
    const available = await raceWithGuards(
      dependencies.isProviderAvailable(resolved.provider),
      Math.min(context.request.timeoutMs, 10_000),
      context.signal,
    ).catch(() => false);
    if (!available) {
      return blockedResult(context.request, `BLOCKED_BY_ACCESS: provider ${resolved.provider} is unavailable`, startedAt);
    }

    let lastError: unknown;
    const attempts = Math.max(1, context.request.maxRetries + 1);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const raw = await raceWithGuards(
          dependencies.execute(context.request.agentId, {
            message: context.request.mission,
            correlationId: `${context.request.runId}:${context.request.taskId}`,
          }),
          context.request.timeoutMs,
          context.signal,
        );
        return normalizeCanonicalRuntimeResult(raw, context, startedAt);
      } catch (error) {
        lastError = error;
        if (context.signal?.aborted) break;
      }
    }
    const message = lastError instanceof Error ? lastError.message : 'Agent runtime failed';
    return {
      ...blockedResult(context.request, message, startedAt),
      status: message.includes('cancelled') ? 'blocked' : 'failed',
      recommendedNextAction: message.includes('cancelled') ? 'Resume the cancelled task when allowed.' : 'Inspect the persisted finding and retry within policy.',
    };
  }
}

export class DryRunAgentExecutor implements JarvisAgentExecutor {
  readonly kind = 'dry-run' as const;

  async execute({ agent, request, task }: AgentExecutionContext): Promise<AgentResult> {
    return {
      status: 'passed',
      summary: `Dry-run simulation: ${agent.name} would execute ${request.mission}`,
      completedTasks: [task.title],
      artifacts: [],
      proposedChanges: [],
      changedFiles: [],
      commandsRun: [],
      verificationEvidence: [{ type: 'dry_run', summary: 'No provider or tools were invoked.' }],
      confirmedFindings: [],
      assumptions: ['Simulation only; not production evidence'],
      unknowns: [],
      blockers: [],
      recommendedNextAction: 'Run in production mode with a verified provider.',
      durationMs: 0,
    };
  }
}
