export type ContentGenerationMode =
  | "image" | "video" | "voice" | "social_post" | "caption"
  | "content_calendar" | "campaign_plan" | "publish" | "unknown";

export interface ContentGenerationInput {
  text: string;
  actorId?: string;
  targetPlatform?: "instagram" | "youtube" | "tiktok" | "telegram" | "linkedin" | "custom";
  brandTone?: "neutral" | "friendly" | "professional" | "bold";
}

export interface ContentGenerationPlan {
  mode: ContentGenerationMode;
  allowed: boolean;
  requiresApproval: boolean;
  providerCategory?: string;
  suggestedApiRefs: string[];
  promptDraft?: string;
  productionSteps: string[];
  publishingSteps: string[];
  blockedReasons: string[];
  nextAction: "show_plan" | "show_draft" | "request_approval" | "deny" | "clarify";
}
