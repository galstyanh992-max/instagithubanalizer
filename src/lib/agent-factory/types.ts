import type { SafetyActor } from "@/lib/safety/actor";
import type { RiskLevel } from "@/lib/safety/permission-checker";

export type AgentPurpose =
  | "github_watcher" | "finance_news_monitor" | "competitor_monitor"
  | "developer_helper" | "database_reviewer" | "api_connector"
  | "content_creator" | "researcher" | "personal_assistant" | "custom";

export type AgentExecutionMode = "manual" | "approval_required" | "scheduled_later" | "disabled";

export interface AgentFactoryRequest {
  text: string;
  actor: SafetyActor;
  workspaceId?: string;
  projectId?: string;
}

export interface AgentDraftProfile {
  id: string;
  name: string;
  purpose: AgentPurpose;
  goal: string;
  description: string;
  executionMode: AgentExecutionMode;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  suggestedTools: string[];
  suggestedApis: string[];
  permissions: string[];
  schedule?: string;
  memoryScope: "none" | "project" | "workspace" | "user";
  status: "draft" | "pending_approval" | "disabled";
  reason: string;
}

export type AgentFactoryNextAction = "show_plan" | "request_approval" | "deny" | "clarify";

export interface AgentFactoryResult {
  draft: AgentDraftProfile | null;
  allowed: boolean;
  requiresApproval: boolean;
  nextAction: AgentFactoryNextAction;
  message: string;
}
