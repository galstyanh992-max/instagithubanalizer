import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../../auth';
import { updateTaskState, redactPayload } from '../../helper';
import { db } from '@/lib/db';

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

  // If the event is TASK_STARTED, update the state from claimed to running
  if (eventType === 'TASK_STARTED') {
    await updateTaskState(id, authResult, ['claimed'], 'running');
  }

  return NextResponse.json({ status: 'ok' });
}
