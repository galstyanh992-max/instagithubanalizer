import type { SafetyActor } from "@/lib/safety/actor";
import type { RiskLevel } from "@/lib/safety/permission-checker";

export type CommandIntent =
  | "conversation"
  | "open_page"
  | "github_analysis"
  | "developer_task"
  | "database_task"
  | "browser_task"
  | "memory_task"
  | "agent_task"
  | "terminal_task"
  | "settings_task"
  | "api_task"
  | "email_task"
  | "content_task"
  | "local_operator"
  | "unknown";

export type CommandSource = "web" | "voice" | "api" | "system" | "agent" | "telegram";

export interface CommandRouterInput {
  text: string;
  actor: SafetyActor;
  source: CommandSource;
  workspaceId?: string;
}

export type CommandNextAction =
  | "respond"
  | "request_approval"
  | "execute_safe_action"
  | "clarify"
  | "deny";

export interface CommandRouterResult {
  intent: CommandIntent;
  riskLevel: RiskLevel;
  allowed: boolean;
  requiresApproval: boolean;
  approvalId?: string;
  approvalPayload?: Record<string, unknown>;
  message: string;
  reason: string;
  nextAction: CommandNextAction;
  data?: Record<string, unknown>;
}
