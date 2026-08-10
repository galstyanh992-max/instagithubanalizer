import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  // A revoked device must not be able to attach artifacts, and a device may
  // only register artifacts for a task it actually claimed — mirrors the
  // checks already enforced in updateTaskState() for cancel/complete/fail.
  // Discovered missing during the /api/daemon/* auth inventory pass.
  const device = await db.device.findUnique({ where: { installationId: authResult } });
  if (!device || device.revokedAt) {
    return NextResponse.json({ error: 'Device invalid or revoked' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { taskId, metadata } = body;

    const task = await db.agentTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (task.agentId !== device.id) {
      return NextResponse.json({ error: 'Task not claimed by this device' }, { status: 403 });
    }

    const artifact = await db.artifact.create({
      data: {
        runId: task.runId,
        type: metadata.type || 'file',
        title: metadata.filename || 'Unknown Artifact',
        content: '', // content remains on local disk for now, or is uploaded via bucket later
        metadata: JSON.stringify(metadata)
      }
    });

    // Optionally attach to task artifacts list if needed
    const existingIds = JSON.parse(task.artifactIds || '[]');
    existingIds.push(artifact.id);
    await db.agentTask.update({
      where: { id: task.id },
      data: { artifactIds: JSON.stringify(existingIds) }
    });

    return NextResponse.json({ id: artifact.id });
  } catch (error: any) {
    console.error('Daemon Artifact Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
