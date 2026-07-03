import { validateActionSafety } from "./safety-validator";
import { checkPermission } from "./permission-checker";
import { recordAuditEvent } from "./audit-logger";

export async function runSafeAction(input: {
  action: string;
  toolName?: string;
  command?: string;
  target?: string;
  payload?: unknown;
  actor?: string;
}): Promise<{
  ok: boolean;
  blocked: boolean;
  requiresApproval: boolean;
  approvalRequired?: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  reasons: string[];
}> {
  const actor = input.actor || "system";
  
  const safetyResult = validateActionSafety({
    action: input.action,
    toolName: input.toolName,
    command: input.command,
    target: input.target,
    payload: input.payload
  });

  const permissionResult = checkPermission({
    action: input.action,
    toolName: input.toolName,
    riskLevel: safetyResult.riskLevel
  });

  const requiresApproval = safetyResult.requiresApproval || permissionResult.requiresApproval;
  const isBlocked = !safetyResult.allowed || !permissionResult.allowed;

  const reasons = [
    ...safetyResult.reasons,
    ...(permissionResult.reason ? [permissionResult.reason] : [])
  ];

  if (requiresApproval || isBlocked) {
    recordAuditEvent({
      type: "tool.blocked",
      message: `Действие заблокировано или требует подтверждения. Риск: ${safetyResult.riskLevel}`,
      actor,
      riskLevel: safetyResult.riskLevel,
      metadata: { input, reasons }
    });
  }

  if (requiresApproval) {
    return {
      ok: false,
      blocked: true,
      requiresApproval: true,
      approvalRequired: true,
      riskLevel: safetyResult.riskLevel,
      message: "Действие требует ручного подтверждения из-за повышенного риска.",
      reasons
    };
  }

  if (isBlocked) {
    return {
      ok: false,
      blocked: true,
      requiresApproval: false,
      riskLevel: safetyResult.riskLevel,
      message: "Действие категорически запрещено.",
      reasons
    };
  }

  recordAuditEvent({
    type: "safety.validation",
    message: `Безопасное действие разрешено: ${input.action}`,
    actor,
    riskLevel: safetyResult.riskLevel,
    metadata: { input }
  });

  return {
    ok: true,
    blocked: false,
    requiresApproval: false,
    riskLevel: safetyResult.riskLevel,
    message: "Действие проверено и разрешено к выполнению.",
    reasons: []
  };
}
