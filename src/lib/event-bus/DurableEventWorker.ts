// ─── Agent OS — DurableEventWorker ───────────────────────────
// Background DB-poll worker for long-running Node/Bun server.
//
// Problem it solves:
//   When the server restarts, the in-memory handler Map is empty.
//   Any event emitted *after* import() but *before* handlers re-register
//   is lost. The worker replays missed events from EventLog on startup.
//
// How it works:
//   1. On start(), records the current time as the startup cursor
//   2. After REPLAY_DELAY_MS (allows handlers to re-register), queries
//      EventLog for rows with createdAt >= cursor and dispatches them
//   3. Optionally continues polling on POLL_INTERVAL_MS to catch events
//      emitted to a second instance (future multi-process scenario)
//
// What it does NOT do:
//   - Does not duplicate EventLog writes (emit() already writes)
//   - Does not re-run side effects of already-applied events (callers
//     should be idempotent — use the eventId to dedup if needed)
//   - Does not survive truly concurrent multi-process deploys (for that,
//     upgrade to Postgres LISTEN/NOTIFY or Redis pub/sub)

import { db } from '../db';
import { eventBus } from './index';
import type { EventType, EventMap } from '../types/events';
import { loggers } from '@/lib/logger';

// ── Config ─────────────────────────────────────────────────────

/** Wait this long after start() before replaying — gives handlers time to register */
const REPLAY_DELAY_MS = 2_000;

/** How often to poll for events from other processes (0 = disabled, single-process only) */
const POLL_INTERVAL_MS = 0; // Set to e.g. 5_000 for future multi-process support

/** Max events to replay in one batch (safety cap) */
const REPLAY_BATCH_SIZE = 200;

// ── Worker ─────────────────────────────────────────────────────

class DurableEventWorker {
  private static instance: DurableEventWorker | null = null;
  private started = false;
  private cursor: Date = new Date();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): DurableEventWorker {
    if (!DurableEventWorker.instance) DurableEventWorker.instance = new DurableEventWorker();
    return DurableEventWorker.instance;
  }

  /**
   * Start the worker. Call once at application startup, after importing
   * all modules that register event handlers.
   *
   * @param replaySince - Override cursor for replay (default: now)
   */
  start(replaySince?: Date): void {
    if (this.started) return;
    this.started = true;
    this.cursor = replaySince ?? new Date();

    loggers.eventBus.info({ cursor: this.cursor.toISOString() }, '[DurableEventWorker] Started. Replaying events after');

    // Delay replay to allow synchronous handler registration to complete
    setTimeout(() => {
      this.replay().catch(err => {
        loggers.eventBus.error({ err: err }, '[DurableEventWorker] Replay error:');
      });
    }, REPLAY_DELAY_MS);

    // Optional continuous poll (for multi-process / future use)
    if (POLL_INTERVAL_MS > 0) {
      this.pollTimer = setInterval(() => {
        this.poll().catch(err => {
          loggers.eventBus.error({ err: err }, '[DurableEventWorker] Poll error:');
        });
      }, POLL_INTERVAL_MS);
    }
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.started = false;
  }

  // ── Replay ──────────────────────────────────────────────────

  private async replay(): Promise<void> {
    const rows = await db.eventLog.findMany({
      where: { createdAt: { gte: this.cursor } },
      orderBy: { createdAt: 'asc' },
      take: REPLAY_BATCH_SIZE,
    });

    if (rows.length === 0) {
      loggers.eventBus.info('[DurableEventWorker] No missed events to replay.');
      return;
    }

    loggers.eventBus.info(`[DurableEventWorker] Replaying ${rows.length} missed event(s)…`);
    let dispatched = 0;

    for (const row of rows) {
      const parsed = this.parseRow(row);
      if (!parsed) continue;
      await eventBus.dispatch(parsed.eventType, parsed.payload);
      dispatched++;
      // Advance cursor to avoid re-replaying the same row
      if (row.createdAt > this.cursor) this.cursor = row.createdAt;
    }

    loggers.eventBus.info(`[DurableEventWorker] Replayed ${dispatched} event(s).`);
  }

  // ── Poll (multi-process / future) ────────────────────────────

  private async poll(): Promise<void> {
    const rows = await db.eventLog.findMany({
      where: { createdAt: { gt: this.cursor } },
      orderBy: { createdAt: 'asc' },
      take: REPLAY_BATCH_SIZE,
    });

    for (const row of rows) {
      const parsed = this.parseRow(row);
      if (parsed) await eventBus.dispatch(parsed.eventType, parsed.payload);
      if (row.createdAt > this.cursor) this.cursor = row.createdAt;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private parseRow(row: {
    eventType: string;
    payload: string | null;
  }): { eventType: EventType; payload: EventMap[EventType] } | null {
    try {
      const payload = row.payload ? (JSON.parse(row.payload) as EventMap[EventType]) : null;
      if (!payload) return null;
      return { eventType: row.eventType as EventType, payload };
    } catch {
      return null;
    }
  }
}

export const durableEventWorker = DurableEventWorker.getInstance();
