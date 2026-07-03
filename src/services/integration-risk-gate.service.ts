// AI Jarwisyan — Integration Risk Gate
// Проверяет риски перед интеграцией repo в проект

import type { RepoMetadata } from "@/lib/types";
import { licenseService } from "./license.service";
import { securityService } from "./security.service";

export interface RiskGateResult {
  allowed: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  blockingIssues: string[];
  warnings: string[];
  manualChecks: string[];
  recommendation: string;
}

export const integrationRiskGate = {
  evaluate(repo: {
    license: string;
    gpuRequired: boolean;
    archived: boolean;
    disabled: boolean;
    commercialUseStatus: string;
    securityStatus: string;
    hasDocker: boolean;
    description: string;
    readmeText: string;
    openIssues: number;
    stars: number;
  }): RiskGateResult {
    const blocking: string[] = [];
    const warnings: string[] = [];
    const manualChecks: string[] = [];

    // License risk
    const licenseInfo = licenseService.classifyLicense(repo.license);
    if (licenseInfo.status === "HIGH_RISK") {
      blocking.push(`Лицензия ${repo.license} — HIGH_RISK для коммерческого использования`);
    } else if (licenseInfo.status === "WARNING") {
      warnings.push(`Лицензия ${repo.license} — copyleft, требует раскрытия исходников`);
    }

    // Commercial risk
    if (repo.commercialUseStatus === "HIGH_RISK") {
      blocking.push("Коммерческое использование запрещено или неясно");
    }

    // Security risk
    if (repo.securityStatus === "RISK") {
      blocking.push("Обнаружены security risks при сканировании");
    } else if (repo.securityStatus === "REVIEW") {
      warnings.push("Требуется ручная проверка безопасности");
    }

    // GPU/CUDA risk
    if (repo.gpuRequired) {
      warnings.push("Требует GPU — на вашем ПК (AMD RX 580, без CUDA) не запустится локально");
    }

    // Maintenance risk
    if (repo.archived) {
      blocking.push("Репозиторий архивирован — нет поддержки и обновлений");
    }
    if (repo.disabled) {
      blocking.push("Репозиторий отключён на GitHub");
    }

    // Dependency risk
    if (repo.openIssues > 500) {
      warnings.push(`Высокое количество открытых issues (${repo.openIssues}) — возможны проблемы`);
    }

    // Suspicious patterns
    const readme = (repo.description + " " + repo.readmeText.slice(0, 3000)).toLowerCase();
    if (/curl.*\|.*sh|curl.*\|.*bash|wget.*\|.*sh/i.test(readme)) {
      manualChecks.push("Проверить install скрипты (curl | bash pattern)");
    }
    if (/privileged\s*:\s*true/i.test(readme)) {
      manualChecks.push("Проверить Docker privileged mode");
    }
    if (/api[_-]?key|secret|password|token/i.test(readme) && /['"][A-Za-z0-9]{20,}['"]/.test(readme)) {
      manualChecks.push("Проверить хардкод секретов в README");
    }

    // Architecture mismatch
    if (!repo.hasDocker && /linux/i.test(readme) && !/windows|wsl|docker/i.test(readme)) {
      warnings.push("Linux-first репозиторий без Docker — может потребовать WSL2 на Windows");
    }

    const riskLevel: RiskGateResult["riskLevel"] = blocking.length > 0 ? "HIGH" : warnings.length > 1 ? "MEDIUM" : "LOW";
    const allowed = blocking.length === 0;

    return {
      allowed,
      riskLevel,
      blockingIssues: blocking,
      warnings,
      manualChecks,
      recommendation: blocking.length > 0
        ? "Интеграция заблокирована. Устраните blocking issues или рассмотрите альтернативы."
        : warnings.length > 1
          ? "Интеграция возможна с осторожностью. Проверьте warnings."
          : "Интеграция безопасна. Можно продолжать.",
    };
  },
};
