/**
 * Phone Bridge command preview.
 *
 * Delegates to the safety-aware Command Router, which is PLAN/DRAFT/SPEC-only
 * and never executes. This module normalizes the router result into a UI-safe
 * preview for a phone client and applies two extra safety rules:
 *   1. Destructive commands are hard-blocked regardless of intent.
 *   2. Mobile web / Telegram sources are stricter than desktop web:
 *      any non-LOW-risk action requires approval before it could ever run.
 *
 * Guarantees: never executes, never auto-approves, never sends messages,
 * never calls external APIs, never reads secrets.
 */

import type {
  PhoneCommandPreview,
  PhoneCommandPreviewInput,
  PhoneCommandResultStatus,
  PhoneCommandNextAction,
} from "./types";
import { toCommandSource, isStrictSource } from "./types";
import { routeCommand } from "@/lib/command-router";
import type { CommandRouterResult } from "@/lib/command-router/types";
import type { ActorSource, ActorRole } from "@/lib/safety/actor";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

/**
 * Destructive/irreversible patterns that must never be planned for execution.
 * NOTE: `\b` does not work for Cyrillic in default JS regex (only ASCII \w), so
 * Cyrillic destructive verbs are matched without word boundaries.
 */
const DESTRUCTIVE_RE =
  /(rm\s+-rf|\bdrop\s+(database|table)|\bdelete\s+(from|folder|dir|directory)|format\s+[a-z]:|mkfs|удал(и|ить|яй)|снеси|уничтож|сотри\s+(папку|диск|файлы)|wipe\b|shred\b)/i;

function actorSourceOf(input: PhoneCommandPreviewInput): ActorSource {
  if (input.source === "telegram") return "telegram";
  if (input.source === "api") return "api";
  return "web"; // mobile_web / desktop_web
}

function recordPreviewEvent(metadata: Record<string, unknown>): void {
  try {
    void recordBrainEntry({
      type: "action_result",
      title: "phone-bridge.command.preview",
      content: "Phone bridge command preview (no execution).",
      actorSource: "api",
      importance: "low",
      metadata: { ...metadata, feature: "phone-bridge", executed: false },
    });
  } catch {
    /* never fatal */
  }
}

/** Extract UI-safe step list from a router data plan, if present. */
function extractSteps(routed: CommandRouterResult): string[] {
  const data = routed.data as Record<string, unknown> | undefined;
  const candidates = ["plan", "draft", "envelope", "report", "handshake"] as const;
  for (const key of candidates) {
    const node = data?.[key] as Record<string, unknown> | undefined;
    const steps = node?.["steps"];
    if (Array.isArray(steps) && steps.every((s) => typeof s === "string")) {
      return steps as string[];
    }
  }
  return [routed.message].filter(Boolean);
}

export async function previewPhoneCommand(input: PhoneCommandPreviewInput): Promise<PhoneCommandPreview> {
  const text = (input.text || "").trim();

  // 0. Empty input → clarify (never routed).
  if (!text) {
    recordPreviewEvent({ status: "not_implemented", reason: "empty" });
    return {
      status: "not_implemented",
      requiresApproval: false,
      summary: "Пустая команда. Уточните, что нужно сделать.",
      steps: [],
      blockedReasons: [],
      nextAction: "clarify",
    };
  }

  // 1. Hard destructive block — independent of router intent.
  if (DESTRUCTIVE_RE.test(text)) {
    recordPreviewEvent({ status: "blocked", reason: "destructive" });
    return {
      status: "blocked",
      riskLevel: "CRITICAL",
      requiresApproval: false,
      summary: "Команда заблокирована: обнаружено разрушительное/необратимое действие.",
      steps: [],
      blockedReasons: ["destructive_action_denied"],
      nextAction: "deny",
    };
  }

  // 2. Delegate to the plan-only Command Router (never executes).
  const routed = await routeCommand({
    text,
    actor: {
      id: input.actorId || "phone-user",
      role: "owner" as ActorRole,
      source: actorSourceOf(input),
      workspaceId: input.workspaceId,
    },
    source: toCommandSource(input.source),
    workspaceId: input.workspaceId,
  });

  // 3. Map router result → phone preview status.
  let status: PhoneCommandResultStatus;
  const data = routed.data as Record<string, unknown> | undefined;
  const envelope = data?.["envelope"] as Record<string, unknown> | undefined;
  const localAgentNotRunning =
    routed.intent === "local_agent_runtime" &&
    typeof envelope?.["status"] === "string" &&
    ["not_running", "not_configured", "handshake_required"].includes(envelope["status"] as string);

  if (routed.nextAction === "deny") {
    status = "blocked";
  } else if (localAgentNotRunning) {
    status = "local_agent_not_running";
  } else if (routed.requiresApproval || routed.nextAction === "request_approval") {
    status = "approval_required";
  } else if (routed.intent === "unknown" || routed.nextAction === "clarify") {
    status = "not_implemented";
  } else {
    status = "planned";
  }

  let requiresApproval = status === "approval_required";
  const blockedReasons = status === "blocked" && routed.reason ? [routed.reason] : [];

  // 4. Strict-source escalation: mobile/telegram require approval for any non-LOW risk plan.
  if (
    isStrictSource(input.source) &&
    status === "planned" &&
    routed.riskLevel !== "LOW"
  ) {
    status = "approval_required";
    requiresApproval = true;
  }

  // 5. Derive UI next action.
  const nextAction: PhoneCommandNextAction =
    status === "blocked"
      ? "deny"
      : status === "approval_required"
        ? "request_approval"
        : status === "local_agent_not_running"
          ? "configure_local_agent"
          : status === "not_implemented"
            ? "clarify"
            : "show_plan";

  recordPreviewEvent({ status, intent: routed.intent, riskLevel: routed.riskLevel, source: input.source });

  return {
    status,
    intent: routed.intent,
    riskLevel: routed.riskLevel,
    requiresApproval,
    summary: routed.message,
    steps: extractSteps(routed),
    blockedReasons,
    nextAction,
  };
}
