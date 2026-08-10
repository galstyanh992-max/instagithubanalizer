import { NextRequest, NextResponse } from 'next/server';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { db } from '@/lib/db';
import { createRemoteTask } from '@/lib/jarvis/tasks/create-remote-task';

// Vercel-safe: only reads/writes durable DB state, never touches a local
// resource directly. Submits a remote command as an AgentTask targeted at a
// specific device, for the daemon's existing claim/execute/complete
// pipeline to pick up. See src/lib/jarvis/tasks/create-remote-task.ts for
// the creation-layer idempotency guarantee (a retried/duplicate submission
// with the same idempotencyKey returns the existing task, not a new one).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;

  const { id: deviceId } = await context.params;
  const ownerUserId = process.env.JARVIS_OWNER_ID!.trim();

  const device = await db.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }
  if (device.revokedAt) {
    return NextResponse.json({ error: 'Device is revoked' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const description = typeof body?.description === 'string' ? body.description : undefined;

  // The client may supply its own idempotency key (e.g. generated once per
  // "send" button press, reused automatically by fetch-retry logic) — if it
  // doesn't, one is derived deterministically from the request contents so
  // that even a naive client double-submit of the identical payload within
  // this pattern still collapses to one task. A key SHOULD be supplied by
  // real clients (this fallback exists to keep the endpoint safe by
  // default, not as the primary mechanism).
  const idempotencyKey = typeof body?.idempotencyKey === 'string' && body.idempotencyKey.trim()
    ? body.idempotencyKey.trim()
    : `remote-cmd:${deviceId}:${title}:${description ?? ''}`;

  const result = await createRemoteTask({
    ownerUserId,
    targetDeviceId: deviceId,
    title,
    description,
    idempotencyKey,
  });

  return NextResponse.json({
    task: {
      id: result.task.id,
      status: result.task.status,
      targetDeviceId: result.task.targetDeviceId,
    },
    created: result.created,
  }, { status: result.created ? 201 : 200 });
}
