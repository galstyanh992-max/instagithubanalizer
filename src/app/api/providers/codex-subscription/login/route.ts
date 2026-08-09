import { NextResponse } from 'next/server';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  try {
    return NextResponse.json({ ok: true, ...(await codexSubscriptionProvider.login()) });
  } catch (error) {
    return codexApiError(error);
  }
}
