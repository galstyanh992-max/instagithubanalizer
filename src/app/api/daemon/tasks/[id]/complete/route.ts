import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../../../auth';
import { updateTaskState } from '../../helper';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { id } = await context.params;
  const body = await request.json();
  const { result, artifacts } = body;

  return updateTaskState(id, authResult, ['running'], 'succeeded', {
    result,
    finishedAt: new Date()
  });
}
