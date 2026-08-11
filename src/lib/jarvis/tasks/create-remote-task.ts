// Creation-layer idempotency for remote commands sent to a device.
//
// Claim-layer idempotency (a task, once created, is claimed and executed
// exactly once) was already proven correct — see src/app/api/daemon/tasks/
// claim/route.ts's atomic optimistic-concurrency update. This module closes
// the other half of the gap: a network retry, double-click, or duplicate
// submission from the *frontend* must not insert two logical AgentTask rows
// in the first place. AgentTask.idempotencyKey already existed in the schema
// but no call site used it — this is the first.
//
// Concurrency model: the actual guarantee comes from the database's UNIQUE
// constraint on AgentTask.idempotencyKey, not from any in-process locking.
// Two simultaneous requests with the same key both attempt the transactional
// insert; the database allows exactly one to commit, and the loser's insert
// throws a unique-constraint violation (Prisma P2002), which is caught here
// and turned into "fetch and return the winner's row" instead of an error.
import { db } from '@/lib/db';
import { broadcastJarvisEvent } from '@/lib/jarvis/realtime/broadcast';

export interface CreateRemoteTaskInput {
  ownerUserId: string;
  targetDeviceId: string;
  title: string;
  description?: string;
  idempotencyKey: string;
  role?: string;
  // JSON-stringified CapabilityCommandEnvelope (src/lib/jarvis/capabilities/
  // envelope.ts), stored verbatim in AgentTask.request. Optional/backward
  // compatible — existing NOOP/HEALTH_CHECK/etc. mock commands never set it.
  request?: string;
}

export interface CreateRemoteTaskResult {
  task: {
    id: string;
    runId: string;
    title: string;
    status: string;
    targetDeviceId: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
  };
  // false means an existing task for this idempotencyKey was returned
  // instead of a new one being created — the caller can use this to decide
  // whether to show "command sent" vs "command already in progress".
  created: boolean;
}

export async function createRemoteTask(input: CreateRemoteTaskInput): Promise<CreateRemoteTaskResult> {
  try {
    // A burst of near-simultaneous duplicate submissions (double-click,
    // client retry, plus a genuine second request) each open an
    // interactive transaction against the Supabase pooler, which has a
    // limited number of connections available for that mode. The Prisma
    // client defaults (maxWait 2s) are tuned for a single caller, not a
    // deliberate concurrent-duplicate burst — raise them here so a losing
    // request waits for a pool slot and a real unique-constraint decision,
    // instead of failing outright with a pool-timeout error that would look
    // like the request itself failed rather than "someone else already won".
    const task = await db.$transaction(async (tx) => {
      const run = await tx.orchestrationRun.create({
        data: {
          ownerUserId: input.ownerUserId,
          goal: input.title,
          status: 'RUNNING',
        },
      });
      return tx.agentTask.create({
        data: {
          runId: run.id,
          title: input.title,
          description: input.description,
          role: input.role ?? 'daemon-worker',
          status: 'not_started',
          targetDeviceId: input.targetDeviceId,
          idempotencyKey: input.idempotencyKey,
          request: input.request,
        },
      });
    }, { maxWait: 10000, timeout: 15000 });
    await broadcastJarvisEvent('task.created', { id: task.id, at: new Date().toISOString() });
    return { task, created: true };
  } catch (error: any) {
    const isIdempotencyKeyConflict = error?.code === 'P2002'
      && (Array.isArray(error?.meta?.target) ? error.meta.target.includes('idempotencyKey') : error?.meta?.target === 'idempotencyKey');
    if (!isIdempotencyKeyConflict) throw error;

    // Another concurrent request already won the race for this key (or this
    // is a genuine retry of an earlier successful submission). Either way,
    // the correct response is the existing task, not a second row.
    const existing = await db.agentTask.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (!existing) {
      // Extremely unlikely (the row that caused our conflict must exist),
      // but fail loudly rather than silently swallowing a real problem.
      throw new Error(`Idempotency conflict on key ${input.idempotencyKey} but no existing task found`);
    }
    return { task: existing, created: false };
  }
}
