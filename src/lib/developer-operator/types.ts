import type { SafetyActor } from "@/lib/safety/actor";
import type { RiskLevel } from "@/lib/safety/permission-checker";

export type DeveloperAction =
  | "inspect_project"
  | "run_typecheck"
  | "run_lint"
  | "run_tests"
  | "run_build"
  | "open_preview"
  | "prepare_prompt_implementation"
  | "prepare_git_commit"
  | "prepare_github_push"
  | "prepare_vercel_deploy"
  | "read_errors"
  | "unknown";

export interface DeveloperOperatorInput {
  text: string;
  actor: SafetyActor;
  workspaceId?: string;
  projectId?: string;
}

export interface PlannedCommand {
  command: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  reason: string;
}

export type DeveloperNextAction =
  | "respond"
  | "request_approval"
  | "run_safe_command"
  | "show_plan"
  | "deny"
  | "clarify";

export interface DeveloperOperatorResult {
  action: DeveloperAction;
  allowed: boolean;
  requiresApproval: boolean;
  message: string;
  plan?: string[];
  commands?: PlannedCommand[];
  nextAction: DeveloperNextAction;
}
