import type { RiskLevel } from "@/lib/safety/permission-checker";

export type GitHubWatcherSourceType =
  | "manual_text" | "manual_url" | "social_note" | "youtube_note"
  | "instagram_note" | "tiktok_note" | "github_search_note" | "custom";

export interface GitHubRepoCandidate {
  url: string;
  owner: string;
  repo: string;
  normalizedName: string;
  discoveredFrom: GitHubWatcherSourceType;
  discoveredAt: string;
  notes?: string;
}

export type GitHubRepoUsefulness = "high" | "medium" | "low" | "unknown";

export interface GitHubRepoEvaluation {
  candidate: GitHubRepoCandidate;
  usefulness: GitHubRepoUsefulness;
  compatibilityScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  possibleIntegrations: string[];
  recommendedNextAction: "watch" | "analyze_deeper" | "ignore" | "create_agent_draft" | "manual_review";
}

export interface GitHubWatchReport {
  summary: string;
  candidates: GitHubRepoEvaluation[];
  risks: string[];
  possibleIntegrations: string[];
  recommendedNextActions: string[];
}
