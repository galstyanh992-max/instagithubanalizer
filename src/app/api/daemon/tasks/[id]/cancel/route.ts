import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../../auth';
import { updateTaskState } from '../../helper';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { id } = await context.params;
  return updateTaskState(id, authResult, ['cancel_requested', 'running', 'claimed'], 'cancelled', {
    finishedAt: new Date()
  });
}
