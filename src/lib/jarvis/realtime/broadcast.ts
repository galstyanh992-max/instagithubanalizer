import { db } from '@/lib/db';

// Single fixed topic: JARVIS is a single-owner system (see
// process.env.JARVIS_OWNER_ID / requireJarvisOwner()), so there is no need
// for a per-user topic namespace. Delivery is gated by the
// jarvis_owner_realtime_events RLS policy on realtime.messages, which only
// admits the one JARVIS owner as an authenticated subscriber.
const TOPIC = 'jarvis:owner-events';

export type JarvisRealtimeEvent =
  | 'device.status'
  | 'task.created'
  | 'task.progress'
  | 'task.completed'
  | 'approval.created'
  | 'approval.decided';

export interface BroadcastPayload {
  // The relevant entity id (deviceId / taskId / approvalId) — enough for a
  // listener to know *what* to refetch, never *what changed to*.
  id: string;
  at: string;
  [key: string]: unknown;
}

// Publishes a minimal, non-sensitive "something changed" signal over
// Supabase Realtime Broadcast. This is transport only: it intentionally
// carries no raw row data, secrets, local paths, or execution payloads.
// Listeners react to the signal by refetching current state from the
// existing, already-redacting REST endpoints (/api/devices/status,
// /api/approvals, the daemon task endpoints, etc.) — durable Postgres rows,
// reached through those endpoints, remain the actual source of truth. This
// also preserves existing server-side masking logic (e.g. the offline
// capability-snapshot masking in /api/devices/status) that a raw
// postgres_changes CDC feed would bypass.
//
// Implemented via realtime.send() ("Broadcast from Database") on the same
// Postgres connection Prisma already holds for the triggering mutation,
// rather than opening a websocket from a serverless function per request.
export async function broadcastJarvisEvent(event: JarvisRealtimeEvent, payload: BroadcastPayload): Promise<void> {
  try {
    await db.$executeRawUnsafe(
      `SELECT realtime.send($1::jsonb, $2::text, $3::text, true);`,
      JSON.stringify(payload),
      event,
      TOPIC,
    );
  } catch (error) {
    // Best-effort by design: a broadcast failure (transient connectivity,
    // Realtime service hiccup) must never fail or roll back the durable
    // mutation that triggered it. The polling fallback on every consumer
    // covers any event that fails to publish.
    console.error(`[jarvis-realtime] broadcast failed for event "${event}":`, error);
  }
}

export const JARVIS_REALTIME_TOPIC = TOPIC;
