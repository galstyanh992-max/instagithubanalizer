import type { RiskLevel } from "@/lib/safety/permission-checker";

export type ResearchMode =
  | "quick_lookup" | "deep_research" | "movie_recommendation"
  | "competitor_public_analysis" | "github_source_discovery" | "site_check" | "custom";

export type SourcePolicy =
  | "public_only" | "user_provided_only" | "no_login" | "no_paywall_bypass"
  | "no_private_data" | "manual_approval_required";

export interface BrowserResearchInput {
  text: string;
  actorId?: string;
  workspaceId?: string;
  allowedSites?: string[];
  mode?: ResearchMode;
}

export interface BrowserActionPlan {
  mode: ResearchMode;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  sourcePolicy: SourcePolicy[];
  steps: string[];
  blockedReasons: string[];
  expectedOutput: "summary" | "source_list" | "recommendations" | "research_report" | "movie_recommendations" | "manual_review";
}

export interface ResearchReportDraft {
  title: string;
  mode: ResearchMode;
  summary: string;
  plannedSources: string[];
  questionsToAnswer: string[];
  evidenceRequirements: string[];
  risks: string[];
  nextActions: string[];
}
