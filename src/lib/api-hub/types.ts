import type { RiskLevel } from "@/lib/safety/permission-checker";

export type ApiCategory =
  | "ai" | "finance" | "news" | "social" | "content_generation"
  | "search" | "email" | "music" | "deployment" | "github"
  | "database" | "browser_data" | "analytics" | "custom";

export type ApiConnectionStatus =
  | "not_configured" | "configured" | "test_planned"
  | "test_passed" | "test_failed" | "not_run";

export interface ApiCapability {
  id: string;
  label: string;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

export interface ApiRegistryItem {
  id: string;
  name: string;
  category: ApiCategory;
  provider: string;
  description?: string;
  secretRef?: string;
  baseUrl?: string;
  docsUrl?: string;
  capabilities: ApiCapability[];
  status: ApiConnectionStatus;
  enabled: boolean;
  costLevel?: "free" | "low" | "medium" | "high" | "unknown";
  notes?: string;
}

export interface ConnectionTestPlan {
  apiId: string;
  provider: string;
  status: "PLANNED" | "NOT_RUN";
  steps: string[];
  requiresSecretRef?: string;
  note: string;
}

export interface DailyTopicReportPlan {
  topic: string;
  apis: string[];
  steps: string[];
  status: "PLANNED";
}
