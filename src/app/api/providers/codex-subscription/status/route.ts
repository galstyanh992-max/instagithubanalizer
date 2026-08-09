import { NextResponse } from 'next/server';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  try {
    const availability = await codexSubscriptionProvider.getAvailability();
    const capabilities = await codexSubscriptionProvider.getCapabilities();
    return NextResponse.json({ ok: true, ...availability, capabilities });
  } catch (error) {
    return codexApiError(error);
  }
}
