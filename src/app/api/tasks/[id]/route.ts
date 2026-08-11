import { NextRequest, NextResponse } from 'next/server';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { db } from '@/lib/db';

// Read-only, owner-gated task status/result lookup. Added so the dashboard
// chat can poll a remote capability command it just created via
// POST /api/devices/[id]/commands through to completion (there was
// previously no browser-facing way to read a single AgentTask's current
// state — only the daemon-authenticated claim/complete/fail endpoints
// existed). Never touches a local resource; pure DB read.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;

  const { id } = await context.params;
  const task = await db.agentTask.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      result: true,
      targetDeviceId: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}
