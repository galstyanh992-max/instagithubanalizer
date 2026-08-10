import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../auth';
import { db } from '@/lib/db';
import { broadcastJarvisEvent } from '@/lib/jarvis/realtime/broadcast';

// A claimed/running task whose lease is not renewed (via heartbeat or task
// events) within this window is assumed to belong to a dead worker and is
// safe to reclaim. See docs/jarvis/remote-architecture.md (Task lease).
const LEASE_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const installationId = authResult;

  try {
    // 1. Verify device is still valid
    const device = await db.device.findUnique({ where: { installationId } });
    if (!device || device.revokedAt) {
      return NextResponse.json({ error: 'Device invalid or revoked' }, { status: 403 });
    }

    const now = new Date();

    // 2. Atomic claim using optimistic concurrency.
    // Candidates are: fresh tasks (not_started), or tasks whose lease expired
    // (claimed/running but not renewed in time — the previous worker is
    // presumed dead and the task is safe to requeue). Tasks pinned to a
    // different device are excluded.
    const candidate = await db.agentTask.findFirst({
      where: {
        AND: [
          { OR: [{ targetDeviceId: null }, { targetDeviceId: device.id }] },
          {
            OR: [
              { status: 'not_started' },
              { status: { in: ['claimed', 'running'] }, leaseExpiresAt: { lt: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!candidate) {
      return NextResponse.json({ task: null });
    }

    const isReclaim = candidate.status !== 'not_started';

    try {
      const claimedTask = await db.agentTask.update({
        // Re-check the exact prior status at update time to keep the claim
        // atomic under concurrent pollers (mirrors the original not_started path).
        where: { id: candidate.id, status: candidate.status },
        data: {
          status: 'claimed',
          startedAt: candidate.startedAt ?? now,
          agentId: device.id, // We reuse agentId column to track which device claimed it
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
          retryCount: isReclaim ? { increment: 1 } : undefined,
        }
      });

      if (isReclaim) {
        await db.eventLog.create({
          data: {
            eventType: 'TASK_LEASE_RECLAIMED',
            entityType: 'AgentTask',
            entityId: claimedTask.id,
            payload: JSON.stringify({ previousStatus: candidate.status, reclaimedByDeviceId: device.id }),
          },
        });
      }

      // Fetch ExecutionPlan if it exists for this task
      const plan = await db.executionPlan.findFirst({
        where: { taskId: claimedTask.id },
        include: { steps: { orderBy: { sequence: 'asc' } } }
      });

      await broadcastJarvisEvent('task.progress', {
        id: claimedTask.id,
        status: claimedTask.status,
        at: new Date().toISOString(),
      });

      return NextResponse.json({ task: claimedTask, plan });
    } catch (e: any) {
      // If the record was not found (meaning it was updated by someone else between our findFirst and update)
      // we just return null this time, the daemon will poll again.
      if (e.code === 'P2025') {
         return NextResponse.json({ task: null });
      }
      throw e;
    }
  } catch (error: any) {
    console.error('Daemon Claim Task Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
