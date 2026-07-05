import type { RiskLevel } from "@/lib/safety/permission-checker";

export type LocalAgentRuntimeStatus =
  | "not_configured" | "configured" | "not_running" | "handshake_required" | "connected_mock" | "blocked";

export type LocalAgentCommandStatus =
  | "draft" | "queued" | "approval_required" | "approved" | "rejected" | "blocked" | "executed_mock" | "failed";

export type LocalAgentCapability =
  | "workspace_read" | "workspace_write" | "safe_command" | "preview_open"
  | "mcp_bridge" | "desktop_commander" | "browser_control" | "app_control" | "unknown";

export interface LocalAgentProfile {
  id: string;
  name: string;
  status: LocalAgentRuntimeStatus;
  workspaceRootConfigured: boolean;
  capabilities: LocalAgentCapability[];
  requiresInstall: boolean;
  requiresHandshake: boolean;
  notes: string[];
}

export interface LocalAgentCommandEnvelope {
  id: string;
  actorId?: string;
  actorSource?: "web" | "telegram" | "api" | "system" | "agent";
  workspaceId?: string;
  requestedCapability: LocalAgentCapability;
  commandText: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  status: LocalAgentCommandStatus;
  createdAt: string;
}

export type LocalAgentNextAction = "show_spec" | "request_approval" | "configure_local_agent" | "deny" | "clarify";

export interface LocalAgentPlan {
  allowed: boolean;
  status: LocalAgentRuntimeStatus;
  commandStatus: LocalAgentCommandStatus;
  requiresApproval: boolean;
  steps: string[];
  blockedReasons: string[];
  nextAction: LocalAgentNextAction;
  envelope?: LocalAgentCommandEnvelope;
}

export type ExecutionResultCode = "SPEC_ONLY" | "PLANNED" | "LOCAL_AGENT_NOT_RUNNING" | "APPROVAL_REQUIRED" | "BLOCKED";
