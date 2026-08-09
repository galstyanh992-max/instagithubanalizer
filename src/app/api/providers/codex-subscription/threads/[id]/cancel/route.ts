import { NextResponse } from 'next/server';
import { z } from 'zod';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ turnId: z.string().trim().min(1).max(200) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: 'BLOCKED', code: 'INVALID_CANCEL_REQUEST', message: 'Invalid Codex cancellation request.' }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    await codexSubscriptionProvider.cancelTurn(id, parsed.data.turnId);
    return NextResponse.json({ ok: true, status: 'TURN_INTERRUPTED' });
  } catch (error) {
    return codexApiError(error);
  }
}
