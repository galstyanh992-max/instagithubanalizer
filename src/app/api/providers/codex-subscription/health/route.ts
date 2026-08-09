import { NextResponse } from 'next/server';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  try {
    const health = await codexSubscriptionProvider.getHealth();
    return NextResponse.json({ ok: health.status === 'READY', ...health }, { status: health.status === 'READY' ? 200 : 424 });
  } catch (error) {
    return codexApiError(error);
  }
}
