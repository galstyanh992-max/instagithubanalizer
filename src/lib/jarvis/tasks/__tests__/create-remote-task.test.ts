import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { createRemoteTask } from '../create-remote-task';

// These tests exercise createRemoteTask against the REAL database (same
// DATABASE_URL used by the app — there is no separate test DB for this
// project). Every row created here is tagged with a unique per-test
// idempotencyKey prefix so it can never collide with real data, and is
// deleted in afterEach via the OrchestrationRun -> AgentTask cascade.
const createdRunIds: string[] = [];

afterEach(async () => {
  if (createdRunIds.length === 0) return;
  // onDelete: Cascade on AgentTask.OrchestrationRun removes the paired
  // AgentTask row automatically.
  await db.orchestrationRun.deleteMany({ where: { id: { in: createdRunIds.splice(0) } } });
});

function testInput(idempotencyKey: string) {
  return {
    ownerUserId: 'test-idempotency-owner',
    targetDeviceId: 'test-idempotency-device',
    title: `idempotency test task ${idempotencyKey}`,
    idempotencyKey,
  };
}

describe('createRemoteTask (creation-layer idempotency)', () => {
  it('a fresh idempotencyKey creates exactly one new task', async () => {
    const key = `test-idempotency:fresh:${randomUUID()}`;
    const result = await createRemoteTask(testInput(key));
    createdRunIds.push(result.task.runId);

    expect(result.created).toBe(true);
    const rows = await db.agentTask.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
  });

  it('sequential double submission (double-click / naive retry) returns the same task and creates no duplicate row', async () => {
    const key = `test-idempotency:sequential:${randomUUID()}`;
    const first = await createRemoteTask(testInput(key));
    createdRunIds.push(first.task.runId);
    const second = await createRemoteTask(testInput(key));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.task.id).toBe(first.task.id);

    const rows = await db.agentTask.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
  });

  it('an HTTP-retry-style third submission of the same key still returns the original task', async () => {
    const key = `test-idempotency:retry:${randomUUID()}`;
    const first = await createRemoteTask(testInput(key));
    createdRunIds.push(first.task.runId);
    const second = await createRemoteTask(testInput(key));
    const third = await createRemoteTask(testInput(key));

    expect([second.task.id, third.task.id]).toEqual([first.task.id, first.task.id]);
    const rows = await db.agentTask.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
  });

  it('concurrent duplicate submissions with the same key produce exactly one row (true DB-level atomicity, not just sequential-retry safety)', async () => {
    const key = `test-idempotency:concurrent:${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createRemoteTask(testInput(key))),
    );

    // Every result must point at the same task id.
    const taskIds = new Set(results.map((r) => r.task.id));
    expect(taskIds.size).toBe(1);

    // Exactly one of the 8 concurrent callers should have actually created
    // the row; the other 7 must have lost the race and fetched the winner.
    const createdCount = results.filter((r) => r.created).length;
    expect(createdCount).toBe(1);

    // Track the winning run for cleanup (only one run was actually created).
    const winner = results.find((r) => r.created);
    if (winner) createdRunIds.push(winner.task.runId);

    const rows = await db.agentTask.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
  });

  it('different idempotencyKeys always create distinct tasks', async () => {
    const keyA = `test-idempotency:distinct-a:${randomUUID()}`;
    const keyB = `test-idempotency:distinct-b:${randomUUID()}`;
    const a = await createRemoteTask(testInput(keyA));
    const b = await createRemoteTask(testInput(keyB));
    createdRunIds.push(a.task.runId, b.task.runId);

    expect(a.created).toBe(true);
    expect(b.created).toBe(true);
    expect(a.task.id).not.toBe(b.task.id);
  });
});
