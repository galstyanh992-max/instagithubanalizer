import type { DeveloperAction, PlannedCommand } from "./types";
import type { RiskLevel } from "@/lib/safety/permission-checker";
import { analyzeTerminalCommand } from "@/lib/safety/terminal-guard";

const ROOT = process.env.AGENT_WORKSPACE_ROOT || "/tmp/agent-workspace";

function plannedFrom(command: string, fallbackRisk: RiskLevel, reason: string): PlannedCommand {
  const g = analyzeTerminalCommand(command, { workspaceRoot: ROOT });
  // If guard hard-denies, surface as CRITICAL non-approvable.
  if (!g.allowed && !g.requiresApproval) {
    return { command, riskLevel: "CRITICAL", requiresApproval: false, reason: g.reasons.join(" ") || "denied" };
  }
  const risk = rank(g.riskLevel) >= rank(fallbackRisk) ? g.riskLevel : fallbackRisk;
  const requiresApproval = g.requiresApproval || risk === "HIGH" || risk === "CRITICAL";
  return { command, riskLevel: risk, requiresApproval, reason: g.reasons.join(" ") || reason };
}

/** Build a non-executing command plan for a developer action. */
export function planDeveloperAction(action: DeveloperAction): { plan: string[]; commands: PlannedCommand[] } {
  switch (action) {
    case "inspect_project":
      return {
        plan: ["Собрать состояние проекта (dirs, git status, package scripts) — read only."],
        commands: [plannedFrom("git status", "MEDIUM", "read-only inspection")],
      };
    case "run_typecheck":
      return { plan: ["Запустить typecheck."], commands: [plannedFrom("npm run typecheck", "MEDIUM", "typecheck")] };
    case "run_lint":
      return { plan: ["Запустить lint."], commands: [plannedFrom("npm run lint", "MEDIUM", "lint")] };
    case "run_tests":
      return { plan: ["Запустить тесты."], commands: [plannedFrom("npm test", "MEDIUM", "tests")] };
    case "run_build":
      return { plan: ["Собрать build."], commands: [{ command: "npm run build", riskLevel: "HIGH", requiresApproval: true, reason: "build может изменять артефакты" }] };
    case "open_preview":
      return { plan: ["Запустить dev preview (long-running) — требует подтверждения."], commands: [{ command: "npm run dev", riskLevel: "HIGH", requiresApproval: true, reason: "long-running process" }] };
    case "read_errors":
      return { plan: ["Прочитать последние логи ошибок (stub — чтение логов ещё не подключено)."], commands: [] };
    case "prepare_prompt_implementation":
      return { plan: ["Составить план реализации по промптам.", "Требуется подтверждение перед любыми изменениями кода."], commands: [] };
    case "prepare_git_commit":
      return { plan: ["Подготовить git commit — требует подтверждения."], commands: [plannedFrom("git add -A", "HIGH", "staging"), plannedFrom("git commit -m <msg>", "HIGH", "commit")] };
    case "prepare_github_push":
      return { plan: ["Подготовить GitHub push — требует подтверждения."], commands: [plannedFrom("git push origin <branch>", "HIGH", "push")] };
    case "prepare_vercel_deploy":
      return { plan: ["Подготовить Vercel deploy — требует подтверждения владельца."], commands: [{ command: "vercel deploy --prod", riskLevel: "CRITICAL", requiresApproval: true, reason: "production deploy" }] };
    default:
      return { plan: [], commands: [] };
  }
}

function rank(r: RiskLevel): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[r];
}
