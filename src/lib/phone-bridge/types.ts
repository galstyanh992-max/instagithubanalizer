/**
 * Phone UI Bridge — UI-safe DTO types.
 *
 * FOUNDATION ONLY. These types describe read/preview DTOs surfaced to a phone
 * (mobile web / Telegram) client. Nothing here executes commands, sends
 * messages, or requires a live DB. All remote actions resolve to a plan,
 * an approval requirement, or a blocked/not-implemented state.
 */

import type { CommandSource } from "@/lib/command-router/types";

/** Overall readiness of the phone bridge surface. */
export type PhoneBridgeStatus = "ready" | "partial" | "not_configured" | "blocked";

/** Where a phone command originated. Mobile/Telegram are treated stricter than desktop web. */
export type PhoneCommandSource = "mobile_web" | "telegram" | "desktop_web" | "api";

/** Result classification for a previewed phone command. Never "executed". */
export type PhoneCommandResultStatus =
  | "planned"
  | "approval_required"
  | "blocked"
  | "not_implemented"
  | "local_agent_not_running";

/** UI-safe status dashboard aggregating foundation module statuses. */
export interface PhoneBridgeDashboard {
  status: PhoneBridgeStatus;
  generatedAt: string;
  modules: {
    commandRouter: string;
    telegram: string;
    dailyReports: string;
    localAgent: string;
    localOperator: string;
    mcpBridge: string;
    db: string;
    approvals: string;
  };
  warnings: string[];
  nextActions: string[];
}

/** Input for previewing a phone command. */
export interface PhoneCommandPreviewInput {
  text: string;
  actorId?: string;
  source: PhoneCommandSource;
  workspaceId?: string;
}

/** Next UI step after a command preview. */
export type PhoneCommandNextAction =
  | "show_plan"
  | "request_approval"
  | "configure_local_agent"
  | "open_approvals"
  | "deny"
  | "clarify";

/** UI-safe preview of a phone command. No execution, no auto-approval. */
export interface PhoneCommandPreview {
  status: PhoneCommandResultStatus;
  intent?: string;
  riskLevel?: string;
  requiresApproval: boolean;
  summary: string;
  steps: string[];
  blockedReasons: string[];
  nextAction: PhoneCommandNextAction;
}

/** UI-safe approval inbox item (no secrets, no raw payload). */
export interface PhoneApprovalInboxItem {
  id: string;
  title: string;
  intent?: string;
  riskLevel?: string;
  actorId?: string;
  actorSource?: string;
  createdAt?: string;
  status: "pending" | "approved" | "rejected" | "unknown";
  summary: string;
}

/** UI-safe approval inbox result. Safe empty fallback when no live DB. */
export interface PhoneApprovalInbox {
  liveDb: boolean;
  items: PhoneApprovalInboxItem[];
  warnings: string[];
}

/** Map a phone source to the command-router source vocabulary. */
export function toCommandSource(source: PhoneCommandSource): CommandSource {
  switch (source) {
    case "telegram":
      return "telegram";
    case "api":
      return "api";
    case "mobile_web":
    case "desktop_web":
    default:
      return "web";
  }
}

/** Mobile web and Telegram are treated with stricter approval rules than desktop web. */
export function isStrictSource(source: PhoneCommandSource): boolean {
  return source === "mobile_web" || source === "telegram";
}
