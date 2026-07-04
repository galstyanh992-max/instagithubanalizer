import { normalizeActor, isUnknownActor, type SafetyActor } from "./actor";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PermissionCheckResult = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  riskLevel: RiskLevel;
};

export type PermissionCheckInput = {
  action: string;
  toolName?: string;
  riskLevel?: RiskLevel;
  actor?: Partial<SafetyActor> | string | null;
};

function deny(riskLevel: RiskLevel, reason: string): PermissionCheckResult {
  return { allowed: false, requiresApproval: false, reason, riskLevel };
}
function approval(riskLevel: RiskLevel, reason: string): PermissionCheckResult {
  return { allowed: false, requiresApproval: true, reason, riskLevel };
}
function allow(riskLevel: RiskLevel, reason: string): PermissionCheckResult {
  return { allowed: true, requiresApproval: false, reason, riskLevel };
}

/**
 * Actor-aware permission decision.
 * Matrix (rows = risk, cols = role):
 *   LOW:      owner/admin allow | agent allow iff tool permission | viewer read-only | unknown deny
 *   MEDIUM:   owner/admin approval | agent approval | viewer deny | unknown deny
 *   HIGH:     owner/admin approval | agent approval | viewer deny | unknown deny
 *   CRITICAL: owner/admin explicit approval | agent deny | viewer deny | unknown deny
 * system actor: LOW allow, MEDIUM approval, HIGH/CRITICAL deny.
 */
export function checkPermission(input: PermissionCheckInput): PermissionCheckResult {
  const actor = normalizeActor(input.actor);
  const risk: RiskLevel = input.riskLevel ?? "LOW";

  if (isUnknownActor(actor)) {
    return deny(risk, "Неизвестный актор — доступ запрещён (fail closed).");
  }

  const readOnlyActions = new Set(["filesystem.read", "repo.read", "memory.read", "ls", "pwd", "cat"]);
  const isReadOnly = readOnlyActions.has(input.action);

  if (actor.role === "system") {
    if (risk === "LOW") return allow(risk, "Системное действие с низким риском разрешено.");
    if (risk === "MEDIUM") return approval(risk, "Системное действие среднего риска требует подтверждения.");
    return deny(risk, "Системный актор не может выполнять действия HIGH/CRITICAL.");
  }

  switch (risk) {
    case "LOW":
      if (actor.role === "owner" || actor.role === "admin") return allow(risk, "Разрешено (owner/admin, низкий риск).");
      if (actor.role === "agent") {
        return actor.hasToolPermission
          ? allow(risk, "Разрешено (agent имеет tool permission, низкий риск).")
          : deny(risk, "Агент без tool permission не может выполнить действие.");
      }
      return isReadOnly
        ? allow(risk, "Разрешено (viewer, read-only действие).")
        : deny(risk, "Viewer может выполнять только read-only действия.");

    case "MEDIUM":
      if (actor.role === "owner" || actor.role === "admin") return approval(risk, "Требуется подтверждение (средний риск).");
      if (actor.role === "agent") return approval(risk, "Агент: действие среднего риска требует подтверждения.");
      return deny(risk, "Viewer не может выполнять действия среднего риска.");

    case "HIGH":
      if (actor.role === "owner" || actor.role === "admin") return approval(risk, "Требуется подтверждение (высокий риск).");
      if (actor.role === "agent") return approval(risk, "Агент: действие высокого риска требует подтверждения владельца.");
      return deny(risk, "Viewer не может выполнять действия высокого риска.");

    case "CRITICAL":
      if (actor.role === "owner" || actor.role === "admin") return approval(risk, "Требуется явное подтверждение владельца (критический риск).");
      return deny(risk, "Только owner/admin могут инициировать критические действия (через подтверждение).");

    default:
      return approval(risk, "Неизвестный уровень риска — требуется подтверждение.");
  }
}
