/**
 * Phone Bridge approval inbox (safe DTO).
 *
 * Rules:
 *  - if live DB is not configured/reachable, return a safe empty inbox + warning;
 *  - does NOT require a live DB for tests;
 *  - never exposes secrets or raw payloads — UI-safe fields only;
 *  - normalizes nullable actor/source/intent columns and payload fallbacks;
 *  - NO approve/reject execution in this phase (read-only).
 */

import type { PhoneApprovalInbox, PhoneApprovalInboxItem } from "./types";
import { getDbConfigStatus } from "@/lib/db-config/config";

function normalizeStatus(s: unknown): PhoneApprovalInboxItem["status"] {
  if (s === "pending" || s === "approved" || s === "rejected") return s;
  return "unknown";
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Map a raw approval record (+ optional parsed payload) to a UI-safe item. */
function toItem(r: Record<string, unknown>): PhoneApprovalInboxItem {
  const payload = (r["payload"] && typeof r["payload"] === "object" ? r["payload"] : {}) as Record<string, unknown>;
  const intent = asString(r["intent"]) ?? asString(payload["intent"]);
  const riskLevel = asString(r["risk"]) ?? asString(payload["riskLevel"]);
  const actorId = asString(r["actorId"]) ?? asString(payload["actorId"]);
  const actorSource = asString(r["actorSource"]) ?? asString(payload["actorSource"]) ?? asString(payload["source"]);
  const summary = asString(r["summary"]) ?? "Запрос на подтверждение действия.";
  const createdAt =
    r["createdAt"] instanceof Date
      ? (r["createdAt"] as Date).toISOString()
      : asString(r["createdAt"]);

  return {
    id: String(r["id"] ?? "unknown"),
    title: summary.slice(0, 120),
    intent,
    riskLevel,
    actorId,
    actorSource,
    createdAt,
    status: normalizeStatus(r["status"]),
    // Summary is the human-readable action description; raw command text / payload are NOT exposed.
    summary,
  };
}

export async function buildPhoneApprovalInbox(workspaceId?: string, limit = 50): Promise<PhoneApprovalInbox> {
  const db = getDbConfigStatus();

  // No live DB → safe empty inbox (do not attempt a connection).
  if (!db.liveCheckPossible) {
    return {
      liveDb: false,
      items: [],
      warnings: ["Live DB не настроена (DATABASE_URL). Возвращён безопасный пустой inbox."],
    };
  }

  // DB configured → best-effort read. Any failure collapses to a safe empty inbox.
  try {
    const { approvalSystem } = await import("@/lib/approval");
    const pending = await approvalSystem.getPending(workspaceId, limit);
    const items = (pending as Array<Record<string, unknown>>).map(toItem);
    return { liveDb: true, items, warnings: [] };
  } catch (e) {
    return {
      liveDb: false,
      items: [],
      warnings: [
        `Approval inbox недоступен (non-fatal): ${e instanceof Error ? e.message : String(e)}. Возвращён безопасный пустой inbox.`,
      ],
    };
  }
}
