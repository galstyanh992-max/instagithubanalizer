export type PermissionCheckResult = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
};

export function checkPermission(input: {
  action: string;
  toolName?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}): PermissionCheckResult {
  if (input.riskLevel === "CRITICAL" || input.riskLevel === "HIGH") {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Действие требует подтверждения из-за уровня риска: ${input.riskLevel}.`
    };
  }

  if (input.action === "secret.read") {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "Чтение секретов строго требует подтверждения."
    };
  }

  if (input.action === "git.push") {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "Push в Git всегда требует ручного подтверждения."
    };
  }

  if (input.action === "terminal.exec" || input.toolName === "terminal.exec") {
    if (input.riskLevel === "MEDIUM") {
      return {
        allowed: false,
        requiresApproval: true,
        reason: "Выполнение команд в терминале с уровнем риска MEDIUM требует подтверждения."
      };
    }
  }

  if (input.riskLevel === "LOW") {
    return {
      allowed: true,
      requiresApproval: false,
      reason: "Действие разрешено (низкий риск)."
    };
  }

  // Fallback default
  return {
    allowed: false,
    requiresApproval: true,
    reason: "Неизвестное действие требует подтверждения."
  };
}
