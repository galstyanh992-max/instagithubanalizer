export type DailyReportSectionType =
  | "summary" | "commands" | "approvals" | "github" | "developer"
  | "api_topics" | "agents" | "risks" | "recommendations" | "unknown";

export interface DailyReportSection {
  type: DailyReportSectionType;
  title: string;
  items: string[];
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

export interface DailyReportInput {
  actorId?: string;
  workspaceId?: string;
  projectId?: string;
  date?: string;
  includeGithub?: boolean;
  githubSourceText?: string;
  includeApiTopics?: boolean;
  includeDeveloperSummary?: boolean;
  includeAgentSummary?: boolean;
}

export interface DailyReport {
  id: string;
  date: string;
  title: string;
  summary: string;
  sections: DailyReportSection[];
  nextActions: string[];
  requiresAttention: boolean;
}
