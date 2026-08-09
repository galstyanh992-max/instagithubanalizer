import { NextResponse } from 'next/server';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const after = Math.max(0, Number.parseInt(url.searchParams.get('after') ?? '0', 10) || 0);
  const threadId = url.searchParams.get('threadId') ?? undefined;
  return NextResponse.json({ ok: true, events: codexSubscriptionProvider.getEvents(after, threadId) });
}
