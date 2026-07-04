import type { BrainAdapter, BrainEntry, BrainEntryInput, BrainEntryPublic } from "./types";
import { PrismaBrainAdapter } from "./prisma-adapter";
import { memorySafetyService } from "@/services/memory/memory-safety.service";
import { recordAuditEvent } from "@/lib/safety/audit-logger";

let adapter: BrainAdapter = new PrismaBrainAdapter();

/** Swap adapter (tests use InMemoryBrainAdapter). */
export function setBrainAdapter(a: BrainAdapter) {
  adapter = a;
}

/** Public projection: sensitive entries never expose content. */
export function toPublic(e: BrainEntry): BrainEntryPublic {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    content: e.sensitive ? "[SENSITIVE — HIDDEN]" : e.content,
    tags: e.tags,
    sensitive: e.sensitive,
    createdAt: e.createdAt,
  };
}

function jsonSafe(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch {
    return {};
  }
}

/**
 * Record an entry. Never throws to callers — failure is logged and returns null,
 * so memory failures cannot break safe command execution.
 */
export async function recordBrainEntry(input: BrainEntryInput): Promise<BrainEntry | null> {
  // Auto-flag sensitive if content looks like a secret.
  const check = memorySafetyService.checkMemory(input.content);
  const sensitive = input.sensitive || !check.safe;
  const safeInput: BrainEntryInput = {
    ...input,
    sensitive,
    metadata: jsonSafe(input.metadata),
  };
  try {
    return await adapter.save(safeInput);
  } catch (e) {
    recordAuditEvent({
      type: "safety.validation",
      message: `Brain record failed (non-fatal): ${input.type}`,
      metadata: { error: e instanceof Error ? e.message : String(e), title: input.title },
    });
    return null;
  }
}

export async function recordUserCommand(text: string, actor: { id: string; role: string; source: string }, source: string) {
  return recordBrainEntry({
    type: "user_command", title: `cmd: ${text.slice(0, 60)}`, content: text,
    actorId: actor.id, actorRole: actor.role, actorSource: actor.source,
    metadata: { source },
  });
}

export async function recordRouterDecision(text: string, decision: Record<string, unknown>) {
  return recordBrainEntry({
    type: "router_decision", title: `route: ${String(decision.intent)}`, content: text,
    metadata: decision,
  });
}

export async function recordSafetyDecision(title: string, content: string, metadata?: Record<string, unknown>) {
  return recordBrainEntry({ type: "safety_decision", title, content, importance: "high", metadata });
}

export async function recordProjectDecision(title: string, content: string, metadata?: Record<string, unknown>) {
  return recordBrainEntry({ type: "project_decision", title, content, importance: "high", metadata });
}

export async function recordUserPreference(title: string, content: string, metadata?: Record<string, unknown>) {
  return recordBrainEntry({ type: "user_preference", title, content, metadata });
}

/** Search — sensitive entries returned as public projection (content hidden). */
export async function searchBrainEntries(query: string, limit = 20): Promise<BrainEntryPublic[]> {
  const rows = await adapter.search(query, limit);
  return rows.map(toPublic);
}

export async function listRecentBrainEntries(limit = 20): Promise<BrainEntryPublic[]> {
  const rows = await adapter.list(limit);
  return rows.map(toPublic);
}
