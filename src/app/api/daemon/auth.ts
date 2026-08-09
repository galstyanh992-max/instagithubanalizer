import { NextRequest, NextResponse } from 'next/server';

export function requireDaemonAuth(request: NextRequest): string | NextResponse {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const expectedToken = process.env.JARVIS_DAEMON_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: 'Server misconfiguration: missing JARVIS_DAEMON_TOKEN' }, { status: 500 });
  }

  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized daemon token' }, { status: 403 });
  }

  const installationId = request.headers.get('X-Installation-Id');
  if (!installationId) {
    return NextResponse.json({ error: 'Missing X-Installation-Id header' }, { status: 400 });
  }

  return installationId;
}

export const OWNER_ID = process.env.JARVIS_OWNER_ID || 'missing-owner-id';
