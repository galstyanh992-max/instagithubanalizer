// ─── Agent OS — Event Bus ────────────────────────────────────
// Long-running Node/Bun target (standalone server).
//
// Durable delivery strategy: DB-poll worker
//   - emit() writes to EventLog (durable) AND dispatches to in-memory handlers
//   - DB write is non-blocking (fire-and-forget, logged on error)
//   - On cold start / restart, DurableEventWorker replays undelivered events
//     by polling EventLog for rows created after the last known cursor
//   - No Redis, no Postgres LISTEN — uses existing SQLite EventLog table
//   - onAny wildcard: subscribes to ALL EventTypes from the canonical registry

import { EventTypes } from '../types/events';
import type { EventType, EventMap, BaseEventPayload } from '../types/events';
import { db } from '../db';
import { loggers } from '@/lib/logger';

// ── Types ─────────────────────────────────────────────────────

type TypedHandler<T extends EventType> = (payload: EventMap[T]) => void | Promise<void>;
type WildcardHandler = (eventType: EventType, payload: EventMap[EventType]) => void | Promise<void>;

// Canonical list of all event types — derived from EventTypes registry,
// not duplicated inline. onAny always stays in sync with new event types.
const ALL_EVENT_TYPES = Object.values(EventTypes) as EventType[];

// ── EventBus ──────────────────────────────────────────────────

class EventBus {
  private handlers = new Map<EventType, Set<TypedHandler<EventType>>>();
  private wildcardHandlers = new Set<WildcardHandler>();
  private static instance: EventBus | null = null;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  // ── Subscribe ───────────────────────────────────────────────

  on<T extends EventType>(eventType: T, handler: TypedHandler<T>): () => void {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    const set = this.handlers.get(eventType)!;
    set.add(handler as TypedHandler<EventType>);
    return () => {
      set.delete(handler as TypedHandler<EventType>);
      if (set.size === 0) this.handlers.delete(eventType);
    };
  }

  /**
   * Subscribe to ALL event types (wildcard).
   * Backed by real subscriptions to every entry in EventTypes — stays in sync
   * automatically when new event types are added to the registry.
   */
  onAny(handler: WildcardHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  // ── Emit ────────────────────────────────────────────────────

  /**
   * Emit an event.
   *   1. Persist to EventLog (non-blocking — does NOT delay handler dispatch)
   *   2. Dispatch to typed handlers
   *   3. Dispatch to wildcard handlers
   */
  async emit<T extends EventType>(eventType: T, payload: EventMap[T]): Promise<void> {
    const payloadObj = payload as unknown as Record<string, unknown>;
    const workspaceId = typeof payloadObj.workspaceId === 'string' ? payloadObj.workspaceId : null;
    const p = payload as BaseEventPayload & { entityType?: string; entityId?: string };

    // Non-blocking DB write — fire and forget
    db.eventLog.create({
      data: {
        eventType,
        entityType: p.entityType ?? eventType.split('.')[0],
        entityId:   p.entityId ?? null,
        workspaceId,
        payload: JSON.stringify(payload),
      },
    }).catch((err: unknown) => {
      loggers.eventBus.error({ err: err }, '[EventBus] EventLog write failed:');
    });

    // Dispatch typed handlers
    const set = this.handlers.get(eventType);
    if (set) {
      for (const handler of set) {
        try { await handler(payload); }
        catch (err) { loggers.eventBus.error({ err: err }, `[EventBus] Handler error (${eventType}):`); }
      }
    }

    // Dispatch wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try { await handler(eventType, payload as EventMap[EventType]); }
      catch (err) { loggers.eventBus.error({ err: err }, `[EventBus] Wildcard handler error (${eventType}):`); }
    }
  }

  // ── Dispatch (used by DurableEventWorker for replayed events) ─

  async dispatch<T extends EventType>(eventType: T, payload: EventMap[T]): Promise<void> {
    const set = this.handlers.get(eventType);
    if (set) {
      for (const handler of set) {
        try { await handler(payload); }
        catch (err) { loggers.eventBus.error({ err: err }, `[EventBus] Replay handler error (${eventType}):`); }
      }
    }
    for (const handler of this.wildcardHandlers) {
      try { await handler(eventType, payload as EventMap[EventType]); }
      catch (err) { loggers.eventBus.error({ err: err }, `[EventBus] Replay wildcard error (${eventType}):`); }
    }
  }

  // ── Queries ──────────────────────────────────────────────────

  async getRecentEvents(limit = 50, offset = 0, workspaceId?: string) {
    const where = workspaceId
      ? { OR: [{ workspaceId }, { workspaceId: null }] }
      : undefined;
    return db.eventLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
  }

  async getEventsByEntity(entityType: string, entityId?: string, limit = 50, workspaceId?: string) {
    const where: Record<string, unknown> = { entityType, ...(entityId ? { entityId } : {}) };
    if (workspaceId) {
      where.OR = [{ workspaceId }, { workspaceId: null }];
      delete where.workspaceId;
    }
    return db.eventLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  }

  /** Expose ALL_EVENT_TYPES for the worker and tests */
  getAllEventTypes(): EventType[] { return ALL_EVENT_TYPES; }
}

export const eventBus = EventBus.getInstance();

export function emitEvent<T extends EventType>(eventType: T, payload: EventMap[T]) {
  return eventBus.emit(eventType, payload);
}

export function onEvent<T extends EventType>(eventType: T, handler: TypedHandler<T>) {
  return eventBus.on(eventType, handler);
}
