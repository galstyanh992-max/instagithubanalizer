import { validateActionSafety } from "./safety-validator";
import { checkPermission } from "./permission-checker";
import { recordAuditEvent } from "./audit-logger";
import { analyzeTerminalCommand } from "./terminal-guard";
import { normalizeActor, type SafetyActor } from "./actor";

export async function runSafeAction(input: {
  action: string;
  toolName?: string;
  command?: string;
  target?: string;
  payload?: unknown;
  actor?: Partial<SafetyActor> | string;
}): Promise<{
  ok: boolean;
  blocked: boolean;
  requiresApproval: boolean;
  approvalRequired?: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  reasons: string[];
}> {
  const actor = normalizeActor(input.actor);

  const safetyResult = validateActionSafety({
    action: input.action,
    toolName: input.toolName,
    command: input.command,
    target: input.target,
    payload: input.payload,
  });

  // Terminal commands get an extra dedicated guard pass.
  let terminalReasons: string[] = [];
  let effectiveRisk = safetyResult.riskLevel;
  let terminalBlocked = false;
  let terminalApproval = false;
  if (input.command || input.action === "terminal.exec" || input.toolName === "terminal.exec") {
    const g = analyzeTerminalCommand(input.command || "");
    terminalReasons = g.reasons;
    terminalBlocked = !g.allowed && !g.requiresApproval;
    terminalApproval = g.requiresApproval;
    if (rank(g.riskLevel) > rank(effectiveRisk)) effectiveRisk = g.riskLevel;
  }

  const permissionResult = checkPermission({
    action: input.action,
    toolName: input.toolName,
    riskLevel: effectiveRisk,
    actor,
  });

  const requiresApproval = safetyResult.requiresApproval || permissionResult.requiresApproval || terminalApproval;
  // Hard block only when permission is denied outright (not merely needing approval),
  // or the terminal guard hard-blocked the command.
  const hardBlocked = (!permissionResult.allowed && !permissionResult.requiresApproval) || terminalBlocked;

  const reasons = [
    ...safetyResult.reasons,
    ...(permissionResult.reason ? [permissionResult.reason] : []),
    ...terminalReasons,
  ];

  if (requiresApproval || hardBlocked) {
    recordAuditEvent({
      type: "tool.blocked",
      message: `Действие заблокировано или требует подтверждения. Риск: ${effectiveRisk}`,
      actor: `${actor.role}:${actor.id}@${actor.source}`,
      riskLevel: effectiveRisk,
      metadata: { input: { ...input, actor }, reasons },
    });
  }

  // Hard deny takes precedence over approval.
  if (hardBlocked && !requiresApproval) {
    return {
      ok: false,
      blocked: true,
      requiresApproval: false,
      riskLevel: effectiveRisk,
      message: "Действие категорически запрещено.",
      reasons,
    };
  }

  if (requiresApproval) {
    return {
      ok: false,
      blocked: true,
      requiresApproval: true,
      approvalRequired: true,
      riskLevel: effectiveRisk,
      message: "Действие требует ручного подтверждения из-за повышенного риска.",
      reasons,
    };
  }

  recordAuditEvent({
    type: "safety.validation",
    message: `Безопасное действие разрешено: ${input.action}`,
    actor: `${actor.role}:${actor.id}@${actor.source}`,
    riskLevel: effectiveRisk,
    metadata: { input: { ...input, actor } },
  });

  return {
    ok: true,
    blocked: false,
    requiresApproval: false,
    riskLevel: effectiveRisk,
    message: "Действие проверено и разрешено к выполнению.",
    reasons: [],
  };
}

function rank(r: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[r];
}
