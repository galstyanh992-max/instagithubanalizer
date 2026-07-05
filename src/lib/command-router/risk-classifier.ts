import type { CommandIntent } from "./types";
import type { RiskLevel } from "@/lib/safety/permission-checker";
import { analyzeTerminalCommand } from "@/lib/safety/terminal-guard";

const BASE_RISK: Record<CommandIntent, RiskLevel> = {
  conversation: "LOW",
  open_page: "LOW",
  memory_task: "LOW",
  github_analysis: "LOW",
  browser_task: "MEDIUM",
  database_task: "HIGH",
  developer_task: "HIGH",
  terminal_task: "HIGH",
  settings_task: "HIGH",
  agent_task: "HIGH",
  api_task: "MEDIUM",
  email_task: "MEDIUM",
  content_task: "MEDIUM",
  local_operator: "MEDIUM",
  local_agent_runtime: "MEDIUM",
  unknown: "MEDIUM",
};

export interface RiskAssessment {
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  reasons: string[];
}

export function assessRisk(intent: CommandIntent, text: string): RiskAssessment {
  if (intent === "terminal_task") {
    const g = analyzeTerminalCommand(text, { workspaceRoot: process.env.AGENT_WORKSPACE_ROOT || "/tmp/agent-workspace" });
    return { riskLevel: g.riskLevel, requiresApproval: g.requiresApproval || !g.allowed, reasons: g.reasons };
  }
  const risk = BASE_RISK[intent];
  const requiresApproval = risk === "HIGH" || risk === "CRITICAL";
  return { riskLevel: risk, requiresApproval, reasons: [`intent=${intent} → risk=${risk}`] };
}
