import type { CommandIntent, CommandSource } from "./types";
import type { SafetyActor } from "@/lib/safety/actor";
import type { RiskLevel } from "@/lib/safety/permission-checker";

export interface CommandApprovalPayload {
  actorId: string;
  actorRole: string;
  actorSource: string;
  source: CommandSource;
  commandText: string;
  intent: CommandIntent;
  reason: string;
  riskLevel: RiskLevel;
}

const RISK_MAP: Record<RiskLevel, "low" | "medium" | "high" | "critical"> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/** Pure builder — always safe, no DB. */
export function buildCommandApprovalPayload(input: {
  actor: SafetyActor;
  source: CommandSource;
  text: string;
  intent: CommandIntent;
  reason: string;
  riskLevel: RiskLevel;
}): CommandApprovalPayload {
  return {
    actorId: input.actor.id,
    actorRole: input.actor.role,
    actorSource: input.actor.source,
    source: input.source,
    commandText: input.text,
    intent: input.intent,
    reason: input.reason,
    riskLevel: input.riskLevel,
  };
}

/**
 * Persist an ApprovalRequest for a risky command, if DB is reachable.
 * Actor/source/intent/reason are carried inside `payload` (no schema migration required).
 * Returns approvalId or null if persistence unavailable.
 */
export async function createApprovalForCommand(input: {
  actor: SafetyActor;
  source: CommandSource;
  text: string;
  intent: CommandIntent;
  reason: string;
  riskLevel: RiskLevel;
  summary?: string;
}): Promise<{ approvalId: string | null; payload: CommandApprovalPayload }> {
  const payload = buildCommandApprovalPayload(input);
  try {
    const { approvalSystem } = await import("@/lib/approval");
    const req = await approvalSystem.requestApproval({
      agentId: input.actor.agentId || input.actor.id,
      workspaceId: input.actor.workspaceId,
      actionType: "execute",
      summary: input.summary || `Command (${input.intent}): ${input.text}`.slice(0, 200),
      risk: RISK_MAP[input.riskLevel],
      payload: payload as unknown as Record<string, unknown>,
    });
    return { approvalId: req.id, payload };
  } catch {
    // DB unavailable (e.g. no live DATABASE_URL) — return payload only.
    return { approvalId: null, payload };
  }
}
