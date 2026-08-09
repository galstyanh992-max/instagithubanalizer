import { NextResponse } from 'next/server';
import { z } from 'zod';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    cwd: z.string().trim().min(3).max(1_000),
    model: z.string().trim().min(1).max(200).optional(),
    reasoningEffort: z.string().trim().min(1).max(50).optional(),
    sandbox: z.enum(['read-only', 'workspace-write']).optional(),
  }),
  z.object({
    action: z.literal('resume'),
    threadId: z.string().trim().min(1).max(200),
    cwd: z.string().trim().min(3).max(1_000).optional(),
    model: z.string().trim().min(1).max(200).optional(),
    reasoningEffort: z.string().trim().min(1).max(50).optional(),
    sandbox: z.enum(['read-only', 'workspace-write']).optional(),
  }),
]);

export async function POST(request: Request) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: 'BLOCKED', code: 'INVALID_THREAD_REQUEST', message: 'Invalid Codex thread request.' }, { status: 400 });
  }
  try {
    const thread = parsed.data.action === 'start'
      ? await codexSubscriptionProvider.startThread(parsed.data)
      : await codexSubscriptionProvider.resumeThread(parsed.data.threadId, parsed.data);
    return NextResponse.json({ ok: true, providerId: codexSubscriptionProvider.id, thread });
  } catch (error) {
    return codexApiError(error);
  }
}
