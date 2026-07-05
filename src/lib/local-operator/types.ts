import type { RiskLevel } from "@/lib/safety/permission-checker";

export type LocalOperatorCapability =
  | "read_project_files" | "list_workspace" | "open_preview" | "run_safe_command"
  | "prepare_file_change" | "apply_file_change" | "open_application"
  | "mcp_tool_call" | "desktop_commander_action" | "unknown";

export type LocalOperatorStatus =
  | "not_configured" | "configured" | "connected" | "disconnected" | "local_agent_required" | "blocked";

export interface AllowedWorkspace {
  id: string;
  name: string;
  rootPath: string;
  allowedOperations: LocalOperatorCapability[];
  requiresApprovalForWrite: boolean;
}

export interface LocalOperatorInput {
  text: string;
  actorId?: string;
  actorRole?: string;
  actorSource?: "web" | "telegram" | "api" | "system" | "agent";
  workspaceId?: string;
  requestedPath?: string;
}

export type LocalOperatorNextAction = "show_plan" | "request_approval" | "local_agent_required" | "deny" | "clarify";

export interface LocalOperatorPlan {
  capability: LocalOperatorCapability;
  status: LocalOperatorStatus;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  steps: string[];
  plannedCommand?: string;
  plannedPath?: string;
  blockedReasons: string[];
  nextAction: LocalOperatorNextAction;
}

export interface LocalToolBridge {
  kind: "mcp" | "desktop_commander" | "custom_local_agent";
  name: string;
  status: LocalOperatorStatus;
  capabilities: LocalOperatorCapability[];
  requiresUserInstall: boolean;
  connectionInstructions: string[];
}
