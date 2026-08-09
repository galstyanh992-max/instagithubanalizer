import { NextResponse } from 'next/server';
import { z } from 'zod';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, status: 'BLOCKED', code: 'LOGOUT_CONFIRMATION_REQUIRED', message: 'Explicit logout confirmation is required.' },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({ ok: true, ...(await codexSubscriptionProvider.logout()) });
  } catch (error) {
    return codexApiError(error);
  }
}
