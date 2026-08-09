import { NextResponse } from 'next/server';
import { CodexProviderError } from '@/lib/ai-provider/codex-subscription/types';
import { isTrustedLocalCodexRequest } from '@/lib/ai-provider/codex-subscription/trusted-local';

export function rejectUntrustedCodexRequest(request: Request): NextResponse | null {
  if (isTrustedLocalCodexRequest(request)) return null;
  return NextResponse.json(
    {
      ok: false,
      status: 'PERMISSION_DENIED',
      code: 'TRUSTED_LOCAL_RUNTIME_REQUIRED',
      message: 'Codex subscription controls are available only on the trusted local JARVIS runtime.',
    },
    { status: 403 },
  );
}

export function codexApiError(error: unknown): NextResponse {
  if (error instanceof CodexProviderError) {
    const status =
      error.code === 'AUTH_REQUIRED' ? 401
      : error.code === 'PERMISSION_DENIED' || error.code === 'BLOCKED' ? 403
      : error.code === 'NOT_INSTALLED' ? 424
      : error.code === 'RATE_LIMITED' ? 429
      : 422;
    return NextResponse.json({ ok: false, status: error.code, code: error.code, message: error.message }, { status });
  }
  return NextResponse.json(
    { ok: false, status: 'PROCESS_FAILED', code: 'UNEXPECTED_PROVIDER_FAILURE', message: 'The local Codex provider failed.' },
    { status: 500 },
  );
}
