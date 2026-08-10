'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const TOPIC = 'jarvis:owner-events';

// Kept in sync by hand with src/lib/jarvis/realtime/broadcast.ts
// (JarvisRealtimeEvent) -- not imported directly because that module also
// pulls in '@/lib/db' (Prisma), which must never end up in a client bundle.
export type JarvisRealtimeEventName =
  | 'device.status'
  | 'task.created'
  | 'task.progress'
  | 'task.completed'
  | 'approval.created'
  | 'approval.decided';

export type JarvisRealtimeStatus = 'connecting' | 'live' | 'disconnected';

interface UseJarvisRealtimeOptions {
  events: JarvisRealtimeEventName[];
  // Fired whenever a subscribed event arrives. The broadcast payload itself
  // is intentionally not passed through -- consumers are expected to
  // refetch current state from the existing REST endpoints (this is what
  // keeps Realtime "transport only", per the Section 8 constraint: durable
  // Postgres rows, reached through those already-redacting endpoints,
  // remain the actual source of truth).
  onEvent: () => void;
  onStatusChange?: (status: JarvisRealtimeStatus) => void;
  // Set to false to skip subscribing entirely (e.g. while a parent E2E test
  // wants to prove the polling-only fallback path).
  enabled?: boolean;
}

// Thin wrapper around a single shared private Realtime broadcast channel.
// Every consumer is expected to keep its own REST polling loop running
// regardless of this hook's connection state -- see the module doc in
// src/lib/jarvis/realtime/broadcast.ts.
export function useJarvisRealtime({ events, onEvent, onStatusChange, enabled = true }: UseJarvisRealtimeOptions) {
  const onEventRef = useRef(onEvent);
  const onStatusChangeRef = useRef(onStatusChange);

  // Refs must only be written outside of render (react-hooks/refs) -- this
  // effect runs after every render (no dependency array) purely to keep the
  // refs current, so the subscription effect below can always call the
  // latest callback without needing to resubscribe the channel every time
  // the caller passes a new function identity.
  useEffect(() => {
    onEventRef.current = onEvent;
    onStatusChangeRef.current = onStatusChange;
  });

  const eventsKey = events.join(',');

  useEffect(() => {
    if (!enabled || events.length === 0) return;

    const supabase = createClient();
    const channel = supabase.channel(TOPIC, { config: { private: true } });

    for (const event of events) {
      channel.on('broadcast', { event }, () => onEventRef.current());
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatusChangeRef.current?.('live');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatusChangeRef.current?.('disconnected');
      else onStatusChangeRef.current?.('connecting');
    });

    return () => {
      void supabase.removeChannel(channel);
    };
    // eventsKey (not `events`) is the dependency: `events` is an array
    // literal from the caller and would otherwise resubscribe every render.
    // events.length is read above only to short-circuit; it's covered by
    // eventsKey (empty events -> empty eventsKey) so it's intentionally
    // omitted from the dependency list.
  }, [eventsKey, enabled]);
}
