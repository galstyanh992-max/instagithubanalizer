import { NextResponse } from 'next/server';
import { z } from 'zod';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  prompt: z.string().trim().min(1).max(200_000),
  model: z.string().trim().min(1).max(200).optional(),
  reasoningEffort: z.string().trim().min(1).max(50).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: 'BLOCKED', code: 'INVALID_TURN_REQUEST', message: 'Invalid Codex turn request.' }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    const turn = await codexSubscriptionProvider.startTurn(id, parsed.data.prompt, parsed.data);
    return NextResponse.json({ ok: true, providerId: codexSubscriptionProvider.id, turn });
  } catch (error) {
    return codexApiError(error);
  }
}
