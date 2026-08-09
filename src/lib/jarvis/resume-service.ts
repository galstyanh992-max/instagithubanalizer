
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { ExecutionEngine, type ExecutionEngineOptions, type ExecutionSnapshot } from './execution-engine';
import type {
  AgentResult,
  Checkpoint,
  OrchestrationRun,
  OrchestrationRunStatus,
  RunContext,
  TaskGraph,
  TaskNode,
  TaskNodeStatus,
} from './types';
import type { Priority, RiskLevel } from '@/lib/types/domain';

const RESUMABLE = ['RUNNING', 'REPAIRING', 'BLOCKED'] as const;

export class ResumeConflictError extends Error {
  constructor(message = 'This run is already being resumed by another worker.') {
    super(message);
    this.name = 'ResumeConflictError';
  }
}

export interface ResumeLeaseStore {
  claim(input: {
    runId: string;
    expectedVersion: number;
    owner: string;
    now: Date;
    until: Date;
  }): Promise<boolean>;
}

export async function claimResumeLease(
  store: ResumeLeaseStore,
  input: { runId: string; expectedVersion: number; owner: string; now?: Date; leaseMs?: number },
): Promise<void> {
  const now = input.now ?? new Date();
  const claimed = await store.claim({
    runId: input.runId,
    expectedVersion: input.expectedVersion,
    owner: input.owner,
    now,
    until: new Date(now.getTime() + (input.leaseMs ?? 60_000)),
  });
  if (!claimed) throw new ResumeConflictError();
}

const prismaLeaseStore: ResumeLeaseStore = {
  async claim(input) {
    const result = await db.orchestrationRun.updateMany({
      where: {
        id: input.runId,
        version: input.expectedVersion,
        status: { in: [...RESUMABLE] },
        OR: [{ resumeLeaseUntil: null }, { resumeLeaseUntil: { lt: input.now } }],
      },
      data: {
        version: { increment: 1 },
        resumeLeaseOwner: input.owner,
        resumeLeaseUntil: input.until,
      },
    });
    return result.count === 1;
  },
};

export async function resumeOrchestrationRun(
  runId: string,
  options: Omit<ExecutionEngineOptions, 'runId' | 'goal' | 'constraints'> = {},
): Promise<ExecutionSnapshot> {
  const persisted = await db.orchestrationRun.findUnique({
    where: { id: runId },
    include: {
      tasks: true,
      checkpoints: {
        where: { verified: true, schemaVersion: 1 },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!persisted) throw new Error(`Run ${runId} was not found.`);
  if (!RESUMABLE.includes(persisted.status as (typeof RESUMABLE)[number])) {
    throw new Error(`Run ${runId} cannot be resumed from ${persisted.status}.`);
  }
  const checkpointRow = persisted.checkpoints[0];
  if (!checkpointRow) throw new Error(`Run ${runId} has no verified compatible checkpoint.`);

  const owner = randomUUID();
  await claimResumeLease(prismaLeaseStore, {
    runId,
    expectedVersion: persisted.version,
    owner,
  });

  try {
    const constraints = JSON.parse(persisted.constraints) as string[];
    const graph = mapPersistedGraph(runId, persisted.tasks);
    const run: OrchestrationRun = {
      id: persisted.id,
      workspaceId: persisted.workspaceId ?? undefined,
      projectId: persisted.projectId ?? undefined,
      ownerUserId: persisted.ownerUserId ?? undefined,
      goal: persisted.goal,
      constraints,
      status: persisted.status as OrchestrationRunStatus,
      mode: persisted.mode,
      maxAgents: persisted.maxAgents,
      maxTasks: persisted.maxTasks,
      maxRetries: persisted.maxRetries,
      timeoutMs: persisted.timeoutMs,
      context: JSON.parse(persisted.context) as RunContext,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    };
    const checkpoint: Checkpoint = {
      id: checkpointRow.id,
      runId,
      phase: checkpointRow.phase,
      taskStatuses: JSON.parse(checkpointRow.taskStatuses) as Record<string, TaskNodeStatus>,
      context: JSON.parse(checkpointRow.context) as RunContext,
      createdAt: checkpointRow.createdAt,
    };
    const engine = new ExecutionEngine({
      ...options,
      runId,
      workspaceId: persisted.workspaceId ?? undefined,
      goal: persisted.goal,
      constraints,
      mode: persisted.mode as ExecutionEngineOptions['mode'],
      maxRetries: persisted.maxRetries,
      timeoutMs: persisted.timeoutMs,
    });
    return await engine.resume(run, graph, checkpoint);
  } finally {
    await db.orchestrationRun.updateMany({
      where: { id: runId, resumeLeaseOwner: owner },
      data: { resumeLeaseOwner: null, resumeLeaseUntil: null },
    });
  }
}

type PersistedTask = {
  id: string;
  title: string;
  description: string | null;
  agentId: string | null;
  role: string;
  toolKeys: string;
  dependsOn: string;
  status: string;
  priority: string;
  riskLevel: string;
  retryCount: number;
  request: string | null;
  result: string | null;
  checkpointId: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function mapPersistedGraph(runId: string, rows: PersistedTask[]): TaskGraph {
  const tasks: TaskNode[] = rows.map((row) => ({
    id: row.id,
    runId,
    title: row.title,
    description: row.description ?? '',
    agentId: row.agentId ?? '',
    role: row.role,
    toolKeys: JSON.parse(row.toolKeys) as string[],
    dependsOn: JSON.parse(row.dependsOn) as string[],
    dependents: [],
    status: row.status as TaskNodeStatus,
    priority: row.priority as Priority,
    riskLevel: row.riskLevel as RiskLevel,
    artifactsIn: [],
    artifactsOut: [],
    findings: [],
    retryCount: row.retryCount,
    request: row.request ? JSON.parse(row.request) : undefined,
    result: row.result ? JSON.parse(row.result) as AgentResult : undefined,
    checkpointId: row.checkpointId ?? undefined,
    startedAt: row.startedAt ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
  }));
  return { runId, tasks, ready: [], blocked: [], passed: [], failed: [] };
}

