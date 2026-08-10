import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../../auth';
import { updateTaskState, redactPayload } from '../../helper';
import { db } from '@/lib/db';
import { broadcastJarvisEvent } from '@/lib/jarvis/realtime/broadcast';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { id } = await context.params;
  const body = await request.json();
  const { eventType, payload } = body;

  const device = await db.device.findUnique({ where: { installationId: authResult } });
  if (!device || device.revokedAt) {
    return NextResponse.json({ error: 'Device invalid or revoked' }, { status: 403 });
  }

  // Create an event log
  await db.eventLog.create({
    data: {
      eventType,
      entityType: 'AgentTask',
      entityId: id,
      payload: JSON.stringify(redactPayload(payload)),
    }
  });

  // Any progress event proves the claiming worker is still alive: renew its
  // lease so the task isn't reclaimed by another poller mid-execution.
  await db.agentTask.updateMany({
    where: { id, agentId: device.id, status: { in: ['claimed', 'running'] } },
    data: { leaseExpiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  // Transport-only signal only — the event's own eventType/payload is never
  // broadcast (redactPayload above only protects the durable EventLog row,
  // not what goes out over Realtime; the broadcast payload here is
  // independently minimal by construction).
  await broadcastJarvisEvent('task.progress', { id, at: new Date().toISOString() });

  // If the event is TASK_STARTED, update the state from claimed to running
  if (eventType === 'TASK_STARTED') {
    await updateTaskState(id, authResult, ['claimed'], 'running');
  }

  return NextResponse.json({ status: 'ok' });
}
