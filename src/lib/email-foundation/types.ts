export type EmailIntent =
  | "draft_email" | "reply_email" | "summarize_email" | "classify_email"
  | "extract_action_items" | "prepare_followup" | "send_email" | "unknown";

export type EmailRiskLevel = "low" | "medium" | "high";

export interface EmailDraftInput {
  text: string;
  actorId?: string;
  recipientHint?: string;
  subjectHint?: string;
  tone?: "neutral" | "friendly" | "professional" | "short";
  source?: "web" | "telegram" | "api" | "system";
}

export interface EmailDraftResult {
  intent: EmailIntent;
  allowed: boolean;
  requiresApproval: boolean;
  subject?: string;
  body?: string;
  summary?: string;
  actionItems?: string[];
  blockedReasons: string[];
  nextAction: "show_draft" | "request_approval" | "clarify" | "deny";
}
