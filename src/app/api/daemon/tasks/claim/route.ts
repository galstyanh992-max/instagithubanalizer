import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../auth';
import { db } from '@/lib/db';

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

    // 2. Atomic claim using optimistic concurrency
    // Since we need to update exactly one that is still not_started
    // We fetch one first, then try to update it explicitly expecting its status to still be not_started.
    
    const candidate = await db.agentTask.findFirst({
      where: { status: 'not_started' },
      orderBy: { createdAt: 'asc' }
    });

    if (!candidate) {
      return NextResponse.json({ task: null });
    }

    try {
      const claimedTask = await db.agentTask.update({
        where: { id: candidate.id, status: 'not_started' },
        data: { 
          status: 'claimed',
          startedAt: new Date(),
          agentId: device.id // We reuse agentId column to track which device claimed it
        }
      });
      
      // Fetch ExecutionPlan if it exists for this task
      const plan = await db.executionPlan.findFirst({
        where: { taskId: claimedTask.id },
        include: { steps: { orderBy: { sequence: 'asc' } } }
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
