import { db } from '@/lib/db'
import { recomputeReady, buildTaskGraph } from './state';
import type { Checkpoint, RunContext, TaskGraph, TaskNode, TaskNodeStatus } from './types';

export interface SaveCheckpointInput {
  runId: string;
  phase: string;
  graph: TaskGraph;
  context: RunContext;
}

// ─── Checkpoint Service ──────────────────────────────────────

export async function saveCheckpoint(input: SaveCheckpointInput): Promise<Checkpoint> {
  const checkpoint = await db.checkpoint.create({
    data: {
      id: `chk-${input.runId}-${input.phase}-${Date.now()}`,
      runId: input.runId,
      phase: input.phase,
      taskStatuses: JSON.stringify(
        Object.fromEntries(input.graph.tasks.map((t) => [t.id, t.status]))
      ),
      context: JSON.stringify(input.context),
      verified: true,
      schemaVersion: 1,
    },
  });

  return mapDbCheckpoint(checkpoint);
}

export async function getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
  const checkpoint = await db.checkpoint.findUnique({
    where: { id: checkpointId },
  });
  if (!checkpoint) return null;
  return mapDbCheckpoint(checkpoint);
}

export async function listCheckpoints(runId: string): Promise<Checkpoint[]> {
  const checkpoints = await db.checkpoint.findMany({
    where: { runId, verified: true, schemaVersion: 1 },
    orderBy: { createdAt: 'desc' },
  });
  return checkpoints.map(mapDbCheckpoint);
}

export async function getLatestCheckpoint(runId: string): Promise<Checkpoint | null> {
  const checkpoints = await db.checkpoint.findMany({
    where: { runId, verified: true, schemaVersion: 1 },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (checkpoints.length === 0) return null;
  return mapDbCheckpoint(checkpoints[0]);
}

/**
 * Resume a TaskGraph from a checkpoint.
 * Preserves the task structure (id, title, deps, role, tools) but restores
 * statuses. Tasks that were in_progress are reset to ready.
 */
export function resumeGraphFromCheckpoint(
  graph: TaskGraph,
  checkpoint: Checkpoint
): TaskGraph {
  const restoredStatuses = new Map<string, TaskNodeStatus>(
    Object.entries(checkpoint.taskStatuses)
  );

  const restoredTasks: TaskNode[] = graph.tasks.map((t) => {
    const stored = restoredStatuses.get(t.id);
    const status: TaskNodeStatus =
      stored === 'in_progress'
        ? 'ready'
        : stored === 'verify'
          ? 'ready'
          : stored === 'failed' || stored === 'blocked'
            ? 'ready'
            : stored ?? t.status;

    return { ...t, status };
  });

  return recomputeReady(buildTaskGraph(restoredTasks));
}

// ─── Mapper ──────────────────────────────────────────────────

function mapDbCheckpoint(
  dbCheckpoint: Awaited<ReturnType<typeof db.checkpoint.create>>
): Checkpoint {
  return {
    id: dbCheckpoint.id,
    runId: dbCheckpoint.runId,
    phase: dbCheckpoint.phase,
    taskStatuses: JSON.parse(dbCheckpoint.taskStatuses) as Record<string, TaskNodeStatus>,
    context: JSON.parse(dbCheckpoint.context) as RunContext,
    createdAt: dbCheckpoint.createdAt,
  };
}
