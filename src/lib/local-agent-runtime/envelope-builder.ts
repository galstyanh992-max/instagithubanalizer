import type { LocalAgentCapability, LocalAgentPlan, LocalAgentCommandEnvelope } from "./types";
import { getLocalAgentProfile } from "./handshake";
import { isUnknownActor, normalizeActor } from "@/lib/safety/actor";
import { planLocalOperatorAction } from "@/lib/local-operator/planner";
import { planMcpBridgeAction } from "@/lib/mcp-bridge/planner";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

let SEQ = 0;

export interface CommandEnvelopeInput {
  text: string;
  capability?: LocalAgentCapability;
  actorId?: string;
  actorRole?: string;
  actorSource?: "web" | "telegram" | "api" | "system" | "agent";
  workspaceId?: string;
}

function classifyCapability(text: string): LocalAgentCapability {
  if (/desktop commander/i.test(text)) return "desktop_commander";
  if (/mcp\s*(tool|server)/i.test(text)) return "mcp_bridge";
  if (/браузер|browser control/i.test(text)) return "browser_control";
  if (/приложение|app control/i.test(text)) return "app_control";
  if (/preview/i.test(text)) return "preview_open";
  if (/запиши|измени файл|write file/i.test(text)) return "workspace_write";
  if (/прочитай|read file|покажи файлы/i.test(text)) return "workspace_read";
  if (/запусти (тесты|команду|lint|build)/i.test(text)) return "safe_command";
  return "unknown";
}

/** Never executes. Builds an envelope + plan, delegating risk decisions to existing planners. */
export async function buildLocalAgentCommandEnvelope(input: CommandEnvelopeInput): Promise<LocalAgentPlan> {
  const actor = normalizeActor({ id: input.actorId, role: (input.actorRole as never) || "viewer", source: (input.actorSource as never) || "api" });
  const capability = input.capability ?? classifyCapability(input.text);
  const profile = getLocalAgentProfile();

  if (isUnknownActor(actor)) {
    return { allowed: false, status: profile.status, commandStatus: "blocked", requiresApproval: false, steps: [], blockedReasons: ["Неизвестный актор."], nextAction: "deny" };
  }

  if (capability === "unknown") {
    return { allowed: false, status: profile.status, commandStatus: "draft", requiresApproval: false, steps: [], blockedReasons: [], nextAction: "clarify" };
  }

  // Delegate to existing plan-only engines.
  let requiresApproval = false;
  let blocked = false;
  let steps: string[] = [];
  let blockedReasons: string[] = [];

  if (capability === "desktop_commander" || capability === "mcp_bridge") {
    const mcpPlan = await planMcpBridgeAction({
      text: input.text, bridgeKind: capability === "mcp_bridge" ? "mcp" : "desktop_commander",
      capability: capability === "mcp_bridge" ? "mcp_tool_call" : "app_control",
      actorId: actor.id, actorRole: actor.role, actorSource: actor.source, workspaceId: input.workspaceId,
    });
    requiresApproval = mcpPlan.requiresApproval;
    blocked = mcpPlan.nextAction === "deny";
    steps = mcpPlan.steps;
    blockedReasons = mcpPlan.blockedReasons;
  } else {
    const localPlan = await planLocalOperatorAction({ text: input.text, actorId: actor.id, actorRole: actor.role, actorSource: actor.source, workspaceId: input.workspaceId });
    requiresApproval = localPlan.requiresApproval;
    blocked = localPlan.nextAction === "deny";
    steps = localPlan.steps;
    blockedReasons = localPlan.blockedReasons;
  }

  // Telegram is always stricter for write/terminal/bridge-class capabilities.
  const strictForTelegram = new Set<LocalAgentCapability>(["workspace_write", "safe_command", "mcp_bridge", "desktop_commander", "app_control", "browser_control"]);
  if (actor.source === "telegram" && strictForTelegram.has(capability)) {
    blocked = true;
    blockedReasons = [...blockedReasons, "Telegram (remote): требуется более строгое подтверждение, действие заблокировано в этой спецификации."];
  }

  const commandStatus = blocked ? "blocked" : requiresApproval ? "approval_required" : "draft";
  const nextAction = blocked ? "deny"
    : profile.status !== "not_running" && profile.status !== "connected_mock" ? "configure_local_agent"
    : requiresApproval ? "request_approval" : "show_spec";

  const envelope: LocalAgentCommandEnvelope = {
    id: `envelope-${++SEQ}-${Date.now()}`,
    actorId: actor.id, actorSource: actor.source, workspaceId: input.workspaceId,
    requestedCapability: capability, commandText: input.text,
    riskLevel: requiresApproval ? "HIGH" : "LOW",
    requiresApproval, status: commandStatus, createdAt: new Date().toISOString(),
  };

  void recordBrainEntry({
    type: "action_result", title: `local agent envelope: ${capability}`, content: input.text,
    actorId: actor.id, importance: requiresApproval || blocked ? "high" : "medium",
    metadata: { capability, commandStatus, requiresApproval, runtimeStatus: profile.status },
  });

  return { allowed: nextAction === "show_spec", status: profile.status, commandStatus, requiresApproval, steps, blockedReasons, nextAction, envelope };
}
