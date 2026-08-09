import { NextResponse } from 'next/server';
import { resumeOrchestrationRun, ResumeConflictError } from '@/lib/jarvis/resume-service';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;
  const { id } = await context.params;
  const ownedRun = await db.orchestrationRun.findFirst({ where: { id, ownerUserId: process.env.JARVIS_OWNER_ID } });
  if (!ownedRun) return NextResponse.json({ ok: false, code: 'RUN_NOT_FOUND', message: 'Run not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { dryRun?: boolean };
  try {
    const snapshot = await resumeOrchestrationRun(id, {
      dryRun: body.dryRun === true,
      signal: request.signal,
    });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    if (error instanceof ResumeConflictError) {
      return NextResponse.json({ ok: false, code: 'RESUME_CONFLICT', message: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Resume failed.';
    return NextResponse.json({ ok: false, code: 'RESUME_FAILED', message }, { status: 422 });
  }
}
