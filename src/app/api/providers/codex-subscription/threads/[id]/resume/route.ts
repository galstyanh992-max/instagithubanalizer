import { NextResponse } from 'next/server';
import { z } from 'zod';
import { codexSubscriptionProvider } from '@/lib/ai-provider/codex-subscription';
import { codexApiError, rejectUntrustedCodexRequest } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  cwd: z.string().trim().min(3).max(1_000).optional(),
  model: z.string().trim().min(1).max(200).optional(),
  reasoningEffort: z.string().trim().min(1).max(50).optional(),
  sandbox: z.enum(['read-only', 'workspace-write']).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rejected = rejectUntrustedCodexRequest(request);
  if (rejected) return rejected;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: 'BLOCKED', code: 'INVALID_RESUME_REQUEST', message: 'Invalid Codex resume request.' }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    const thread = await codexSubscriptionProvider.resumeThread(id, parsed.data);
    return NextResponse.json({ ok: true, providerId: codexSubscriptionProvider.id, thread });
  } catch (error) {
    return codexApiError(error);
  }
}
