import type { RiskLevel } from "@/lib/safety/permission-checker";

export type McpBridgeKind = "mcp" | "desktop_commander" | "custom_local_agent";

export type McpBridgeStatus =
  | "not_configured" | "configured" | "local_agent_required"
  | "connection_planned" | "connected_mock" | "blocked";

export type McpToolCapability =
  | "filesystem_read" | "filesystem_write" | "terminal_command" | "browser_control"
  | "app_control" | "clipboard" | "screenshot" | "window_management" | "mcp_tool_call" | "unknown";

export interface McpBridgeProfile {
  id: string;
  name: string;
  kind: McpBridgeKind;
  status: McpBridgeStatus;
  capabilities: McpToolCapability[];
  requiresInstall: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  notes: string[];
}

export interface McpActionRequest {
  text: string;
  bridgeKind?: McpBridgeKind;
  capability?: McpToolCapability;
  actorId?: string;
  actorRole?: string;
  actorSource?: "web" | "telegram" | "api" | "system" | "agent";
  workspaceId?: string;
  targetPath?: string;
  command?: string;
}

export type McpNextAction = "show_plan" | "request_approval" | "local_agent_required" | "deny" | "clarify";

export interface McpActionPlan {
  bridgeKind: McpBridgeKind;
  capability: McpToolCapability;
  allowed: boolean;
  requiresApproval: boolean;
  status: McpBridgeStatus;
  riskLevel: RiskLevel;
  steps: string[];
  blockedReasons: string[];
  nextAction: McpNextAction;
}
