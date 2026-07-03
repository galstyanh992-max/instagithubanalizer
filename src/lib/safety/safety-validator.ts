export type SafetyRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SafetyValidationInput = {
  action: string;
  toolName?: string;
  command?: string;
  target?: string;
  payload?: unknown;
};

export type SafetyValidationResult = {
  allowed: boolean;
  riskLevel: SafetyRiskLevel;
  requiresApproval: boolean;
  reasons: string[];
  recommendation: string;
};

const DANGEROUS_ACTIONS = [
  "terminal.exec",
  "filesystem.write",
  "filesystem.delete",
  "git.push",
  "vercel.deploy",
  "database.migrate",
  "secret.read",
  "browser.login",
  "browser.purchase",
  "browser.submit",
  "network.exfiltrate"
];

const DANGEROUS_COMMANDS = [
  "rm -rf",
  "Remove-Item -Recurse",
  "del /s",
  "format",
  "git push",
  "vercel --prod",
  "prisma migrate deploy",
  "DROP TABLE",
  "curl",
  "bash",
  "Invoke-Expression",
  "iex"
];

export function validateActionSafety(input: SafetyValidationInput): SafetyValidationResult {
  const reasons: string[] = [];
  let riskLevel: SafetyRiskLevel = "LOW";
  let requiresApproval = false;

  if (input.action && DANGEROUS_ACTIONS.includes(input.action)) {
    riskLevel = "HIGH";
    requiresApproval = true;
    reasons.push(`Действие '${input.action}' относится к категории повышенного риска.`);
  }

  if (input.toolName && DANGEROUS_ACTIONS.includes(input.toolName)) {
    riskLevel = "HIGH";
    requiresApproval = true;
    reasons.push(`Инструмент '${input.toolName}' относится к категории повышенного риска.`);
  }

  if (input.command) {
    const cmd = input.command.toLowerCase();
    for (const dangerousCmd of DANGEROUS_COMMANDS) {
      if (cmd.includes(dangerousCmd.toLowerCase())) {
        riskLevel = "CRITICAL";
        requiresApproval = true;
        reasons.push(`Обнаружена опасная команда: '${dangerousCmd}'.`);
      }
    }
  }

  if (input.action === "secret.read") {
    riskLevel = "CRITICAL";
    requiresApproval = true;
    reasons.push(`Чтение секретов строго требует подтверждения.`);
  }

  return {
    allowed: !requiresApproval,
    riskLevel,
    requiresApproval,
    reasons,
    recommendation: requiresApproval ? "Требуется ручное подтверждение." : "Безопасно для выполнения.",
  };
}
