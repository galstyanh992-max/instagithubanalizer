import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../../auth';
import { updateTaskState } from '../../helper';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { id } = await context.params;
  const body = await request.json();
  const { errorMessage } = body;

  return updateTaskState(id, authResult, ['running', 'claimed'], 'failed', {
    result: JSON.stringify({ error: errorMessage }),
    finishedAt: new Date()
  });
}
