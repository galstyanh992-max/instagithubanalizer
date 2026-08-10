import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. Shares the session cookie set by
// src/lib/supabase/middleware.ts, so an authenticated user's JWT is
// available to supabase-js automatically -- required for Supabase Realtime
// private-channel authorization (see src/lib/jarvis/realtime/broadcast.ts
// and the jarvis_owner_realtime_events RLS policy on realtime.messages).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
