import type { LocalOperatorInput, LocalOperatorPlan, LocalOperatorCapability } from "./types";
import { classifyLocalCapability } from "./capability-classifier";
import { getAllowedWorkspace, checkPathAllowed } from "./workspace-policy";
import { analyzeTerminalCommand } from "@/lib/safety/terminal-guard";
import { checkPermission } from "@/lib/safety/permission-checker";
import { isUnknownActor, normalizeActor } from "@/lib/safety/actor";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

const LOCAL_AGENT_CAPS = new Set<LocalOperatorCapability>(["mcp_tool_call", "desktop_commander_action"]);
const WRITE_CAPS = new Set<LocalOperatorCapability>(["prepare_file_change", "apply_file_change", "open_application"]);

const COMMAND_MAP: Partial<Record<LocalOperatorCapability, string>> = {
  run_safe_command: "npm test", open_preview: "npm run dev", list_workspace: "ls",
};

/** Never executes anything. Plan-only. */
export async function planLocalOperatorAction(input: LocalOperatorInput): Promise<LocalOperatorPlan> {
  const actor = normalizeActor({ id: input.actorId, role: (input.actorRole as never) || "viewer", source: (input.actorSource as never) || "api" });
  const capability = classifyLocalCapability(input.text);

  if (isUnknownActor(actor)) {
    return { capability, status: "blocked", allowed: false, requiresApproval: false, riskLevel: "HIGH", steps: [], blockedReasons: ["Неизвестный актор."], nextAction: "deny" };
  }

  if (capability === "unknown") {
    return { capability, status: "not_configured", allowed: false, requiresApproval: false, riskLevel: "LOW", steps: [], blockedReasons: [], nextAction: "clarify" };
  }

  if (LOCAL_AGENT_CAPS.has(capability)) {
    const { planMcpBridgeAction } = await import("@/lib/mcp-bridge/planner");
    const bridgeKind = capability === "mcp_tool_call" ? "mcp" : "desktop_commander";
    const mcpCapability = capability === "mcp_tool_call" ? "mcp_tool_call" : "app_control";
    const mcpPlan = await planMcpBridgeAction({ text: input.text, bridgeKind, capability: mcpCapability, actorId: actor.id, actorRole: actor.role, actorSource: actor.source, workspaceId: input.workspaceId });
    void recordBrainEntry({ type: "action_result", title: `local operator: ${capability}`, content: input.text, importance: "medium", metadata: { capability, bridge: bridgeKind } });
    return {
      capability, status: "local_agent_required", allowed: mcpPlan.allowed, requiresApproval: mcpPlan.requiresApproval, riskLevel: mcpPlan.riskLevel,
      steps: mcpPlan.steps, blockedReasons: mcpPlan.blockedReasons, nextAction: mcpPlan.nextAction === "request_approval" ? "request_approval" : "local_agent_required",
    };
  }

  const workspace = getAllowedWorkspace();
  const pathCheck = checkPathAllowed(input.requestedPath, workspace);
  if (!pathCheck.ok) {
    const status = workspace ? "blocked" : "local_agent_required";
    return {
      capability, status, allowed: false, requiresApproval: false, riskLevel: "CRITICAL",
      steps: [], blockedReasons: [pathCheck.reason ?? "denied"],
      nextAction: workspace ? "deny" : "local_agent_required",
    };
  }

  // Telegram-originated commands are stricter: no write-class actions at all.
  const isTelegram = input.actorSource === "telegram";
  if (isTelegram && WRITE_CAPS.has(capability)) {
    return {
      capability, status: "blocked", allowed: false, requiresApproval: false, riskLevel: "HIGH",
      steps: [], blockedReasons: ["Telegram (remote) не может напрямую изменять файлы — только через web/approval."],
      nextAction: "deny",
    };
  }

  let plannedCommand: string | undefined;
  let riskLevel: LocalOperatorPlan["riskLevel"] = "LOW";
  let requiresApproval = WRITE_CAPS.has(capability);

  const cmd = COMMAND_MAP[capability];
  if (cmd) {
    const guard = analyzeTerminalCommand(cmd, { workspaceRoot: workspace?.rootPath });
    plannedCommand = cmd;
    riskLevel = guard.riskLevel;
    requiresApproval = requiresApproval || guard.requiresApproval || !guard.allowed;
  } else if (WRITE_CAPS.has(capability)) {
    riskLevel = capability === "apply_file_change" ? "HIGH" : "MEDIUM";
  }

  const perm = checkPermission({ action: `local.${capability}`, riskLevel, actor });
  requiresApproval = requiresApproval || perm.requiresApproval;
  const allowed = perm.allowed && !requiresApproval;

  const steps = [
    `Capability: ${capability}.`,
    `Workspace: ${workspace?.rootPath ?? "не настроен"}.`,
    plannedCommand ? `Планируемая команда (не выполняется): ${plannedCommand}` : "Файловая операция — только план, без записи.",
  ];

  void recordBrainEntry({
    type: "action_result", title: `local operator plan: ${capability}`, content: input.text,
    actorId: actor.id, importance: requiresApproval ? "high" : "medium",
    metadata: { capability, requiresApproval, plannedCommand },
  });

  return {
    capability, status: "configured", allowed, requiresApproval, riskLevel,
    steps, plannedCommand, plannedPath: pathCheck.resolvedPath, blockedReasons: perm.allowed ? [] : [perm.reason],
    nextAction: !perm.allowed && !perm.requiresApproval ? "deny" : requiresApproval ? "request_approval" : "show_plan",
  };
}
