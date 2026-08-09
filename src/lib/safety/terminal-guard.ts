import { resolve, isAbsolute, relative } from "path";
import type { RiskLevel } from "./permission-checker";

export type TerminalGuardResult = {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  cwd: string;
};

// Destructive / privilege-escalating patterns → CRITICAL, deny.
const DENY_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//i,
  /\bsudo\b/i,
  /chmod\s+-R\s+777/i,
  /chown\s+-R/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
  /git\s+push\s+.*--force|git\s+push\s+.*-f\b/i,
  /Remove-Item\s+-Recurse/i,
  /\bformat\b/i,
];

// Require approval (HIGH/CRITICAL) — secrets, deploy, migrate, push, deletion.
const APPROVAL_PATTERNS: { re: RegExp; risk: RiskLevel; reason: string }[] = [
  { re: /(^|\s)cat\s+.*\.env/i, risk: "CRITICAL", reason: "Чтение .env запрещено без подтверждения." },
  { re: /\.env/i, risk: "HIGH", reason: "Команда затрагивает .env / секреты." },
  { re: /git\s+push/i, risk: "HIGH", reason: "git push требует подтверждения." },
  { re: /vercel\s+.*--prod|vercel\s+deploy/i, risk: "CRITICAL", reason: "Production deploy требует подтверждения." },
  { re: /prisma\s+migrate\s+deploy|prisma\s+db\s+push/i, risk: "HIGH", reason: "Миграция БД требует подтверждения." },
  { re: /\brm\b|Remove-Item|del\s+\/s/i, risk: "HIGH", reason: "Удаление файлов требует подтверждения." },
  { re: /\bcurl\b|\bwget\b|Invoke-Expression|\biex\b/i, risk: "MEDIUM", reason: "Сетевое выполнение требует подтверждения." },
];

const SAFE_PREFIXES = ["ls", "pwd", "npm test", "npm run lint", "npm run typecheck", "echo", "node --version", "git status"];
const SHELL_CONTROL_SYNTAX = /[;&|><`\r\n]|\$\(|\$\{|\^/;

/**
 * Analyze a terminal command for safety before execution.
 * Enforces: workspace root required, no path traversal outside root,
 * denylist for destructive commands, approval list for risky ones.
 */
export function analyzeTerminalCommand(command: string, opts?: { workspaceRoot?: string }): TerminalGuardResult {
  const reasons: string[] = [];
  const workspaceRoot = opts?.workspaceRoot || process.env.AGENT_WORKSPACE_ROOT || "";
  const cmd = (command || "").trim();

  // Workspace root is mandatory — fail closed if unset.
  if (!workspaceRoot) {
    return {
      allowed: false,
      requiresApproval: false,
      riskLevel: "CRITICAL",
      reasons: ["AGENT_WORKSPACE_ROOT не задан — выполнение терминала запрещено (fail closed)."],
      cwd: "",
    };
  }

  const root = resolve(workspaceRoot);

  // Denylist → CRITICAL, hard deny.
  for (const re of DENY_PATTERNS) {
    if (re.test(cmd)) {
      return {
        allowed: false,
        requiresApproval: false,
        riskLevel: "CRITICAL",
        reasons: [`Обнаружена запрещённая команда (${re.source}).`],
        cwd: root,
      };
    }
  }

  // Path traversal: any absolute path or ".." that escapes root.
  const tokens = cmd.split(/\s+/);
  for (const t of tokens) {
    if (t.includes("..") || isAbsolute(t)) {
      const target = isAbsolute(t) ? resolve(t) : resolve(root, t);
      const rel = relative(root, target);
      if (rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(rel)) {
        return {
          allowed: false,
          requiresApproval: false,
          riskLevel: "CRITICAL",
          reasons: [`Path traversal за пределы workspace: '${t}'.`],
          cwd: root,
        };
      }
    }
  }

  // Approval patterns.
  let riskLevel: RiskLevel = "LOW";
  let requiresApproval = false;
  for (const { re, risk, reason } of APPROVAL_PATTERNS) {
    if (re.test(cmd)) {
      requiresApproval = true;
      reasons.push(reason);
      if (rank(risk) > rank(riskLevel)) riskLevel = risk;
    }
  }

  if (requiresApproval) {
    return { allowed: false, requiresApproval: true, riskLevel, reasons, cwd: root };
  }

  if (SHELL_CONTROL_SYNTAX.test(cmd)) {
    return {
      allowed: false,
      requiresApproval: false,
      riskLevel: "CRITICAL",
      reasons: ["Shell control syntax is forbidden in safe terminal commands."],
      cwd: root,
    };
  }

  // Known-safe prefixes → LOW allow.
  const lower = cmd.toLowerCase();
  if (SAFE_PREFIXES.some((p) => lower === p || lower.startsWith(`${p} `))) {
    return { allowed: true, requiresApproval: false, riskLevel: "LOW", reasons: ["Известная безопасная команда."], cwd: root };
  }

  // Unknown command → MEDIUM, require approval (fail safe).
  return {
    allowed: false,
    requiresApproval: true,
    riskLevel: "MEDIUM",
    reasons: ["Неизвестная команда — требуется подтверждение (fail safe)."],
    cwd: root,
  };
}

function rank(r: RiskLevel): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[r];
}
