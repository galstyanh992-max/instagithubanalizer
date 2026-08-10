import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // api/daemon/** is excluded: the local daemon authenticates with its own
  // Bearer token (JARVIS_DAEMON_TOKEN, checked in requireDaemonAuth() inside
  // each route handler), not a browser Supabase session. Without this
  // exclusion, updateSession() redirected every daemon call (register,
  // heartbeat, task claim, registry-snapshot) to /login before the route
  // handler ever ran — silently breaking the entire remote daemon protocol.
  // Discovered 2026-08-10 during real-machine heartbeat/offline E2E testing.
  matcher: [
    '/((?!api/music/local|api/daemon|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|aac|flac|m4a|mp3|ogg|opus|wav|weba)$).*)',
  ],
}
