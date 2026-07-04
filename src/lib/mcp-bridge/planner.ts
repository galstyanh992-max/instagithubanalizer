import type { McpActionRequest, McpActionPlan } from "./types";
import { classifyBridgeKind, classifyCapability } from "./capability-classifier";
import { riskForCapability } from "./risk-policy";
import { getBridgeProfile } from "./profiles";
import { getAllowedWorkspace, checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import { analyzeTerminalCommand } from "@/lib/safety/terminal-guard";
import { checkPermission } from "@/lib/safety/permission-checker";
import { isUnknownActor, normalizeActor } from "@/lib/safety/actor";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

export async function planMcpBridgeAction(input: McpActionRequest): Promise<McpActionPlan> {
  const actor = normalizeActor({ id: input.actorId, role: (input.actorRole as never) || "viewer", source: (input.actorSource as never) || "api" });
  const bridgeKind = input.bridgeKind ?? classifyBridgeKind(input.text);
  const capability = input.capability ?? classifyCapability(input.text);
  const profile = getBridgeProfile(bridgeKind);

  if (isUnknownActor(actor)) {
    return { bridgeKind, capability, allowed: false, requiresApproval: false, status: "blocked", riskLevel: "HIGH", steps: [], blockedReasons: ["Неизвестный актор."], nextAction: "deny" };
  }

  if (capability === "unknown") {
    return { bridgeKind, capability, allowed: false, requiresApproval: false, status: profile?.status ?? "not_configured", riskLevel: "HIGH", steps: [], blockedReasons: [], nextAction: "clarify" };
  }

  // Path / secrets check for filesystem capabilities.
  if (capability === "filesystem_read" || capability === "filesystem_write") {
    const workspace = getAllowedWorkspace();
    const pathCheck = checkPathAllowed(input.targetPath, workspace);
    if (!pathCheck.ok) {
      return {
        bridgeKind, capability, allowed: false, requiresApproval: false,
        status: workspace ? "blocked" : "local_agent_required", riskLevel: "CRITICAL",
        steps: [], blockedReasons: [pathCheck.reason ?? "denied"],
        nextAction: workspace ? "deny" : "local_agent_required",
      };
    }
  }

  let riskLevel = riskForCapability(capability);
  const reasons: string[] = [];
  if (capability === "terminal_command" && input.command) {
    const guard = analyzeTerminalCommand(input.command, { workspaceRoot: getAllowedWorkspace()?.rootPath });
    if (rank(guard.riskLevel) > rank(riskLevel)) riskLevel = guard.riskLevel;
    if (!guard.allowed && !guard.requiresApproval) {
      void recordBrainEntry({ type: "safety_decision", title: "mcp bridge terminal denied", content: input.text, importance: "high", metadata: { reasons: guard.reasons } });
      return { bridgeKind, capability, allowed: false, requiresApproval: false, status: "blocked", riskLevel: "CRITICAL", steps: [], blockedReasons: guard.reasons, nextAction: "deny" };
    }
    reasons.push(...guard.reasons);
  }

  // Telegram is stricter — any write/terminal/app-control/mcp_tool_call is denied outright.
  const isTelegram = actor.source === "telegram";
  const strictCaps = new Set(["filesystem_write", "terminal_command", "app_control", "mcp_tool_call", "window_management"]);
  if (isTelegram && strictCaps.has(capability)) {
    return { bridgeKind, capability, allowed: false, requiresApproval: false, status: "blocked", riskLevel: "HIGH", steps: [], blockedReasons: ["Telegram (remote) не может выполнять bridge-действия этого типа."], nextAction: "deny" };
  }

  const perm = checkPermission({ action: `mcp.${bridgeKind}.${capability}`, riskLevel, actor });
  const requiresApproval = perm.requiresApproval || riskLevel === "HIGH" || riskLevel === "CRITICAL";

  // Bridge is never actually connected in this phase.
  const status = profile?.status ?? "local_agent_required";
  const nextAction = !perm.allowed && !perm.requiresApproval ? "deny"
    : status === "local_agent_required" || status === "connection_planned" ? "local_agent_required"
    : requiresApproval ? "request_approval" : "show_plan";

  const steps = [
    `Bridge: ${bridgeKind} (status: ${status}).`,
    `Capability: ${capability}, risk: ${riskLevel}.`,
    "Реальное подключение/выполнение НЕ производится в этой фазе.",
    ...reasons,
  ];

  void recordBrainEntry({
    type: "action_result", title: `mcp bridge plan: ${bridgeKind}/${capability}`, content: input.text,
    actorId: actor.id, importance: requiresApproval ? "high" : "medium",
    metadata: { bridgeKind, capability, status, requiresApproval },
  });

  return {
    bridgeKind, capability, allowed: nextAction === "show_plan", requiresApproval,
    status, riskLevel, steps, blockedReasons: perm.allowed ? [] : [perm.reason], nextAction,
  };
}

function rank(r: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[r];
}
