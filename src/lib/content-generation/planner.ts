import type { ContentGenerationInput, ContentGenerationPlan, ContentGenerationMode } from "./types";
import { classifyContentMode, isUnsafeContentRequest } from "./content-intent";
import { listApis } from "@/lib/api-hub/api-registry-service";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

const PROVIDER_CATEGORY: Partial<Record<ContentGenerationMode, string>> = {
  image: "content_generation", video: "content_generation", voice: "content_generation",
};

/** Never calls a generation API. Never publishes. */
export async function planContentGeneration(input: ContentGenerationInput): Promise<ContentGenerationPlan> {
  const mode = classifyContentMode(input.text);
  const unsafe = isUnsafeContentRequest(input.text);

  if (unsafe.unsafe) {
    void recordBrainEntry({ type: "safety_decision", title: "content request denied", content: input.text, importance: "high", metadata: { reason: unsafe.reason } });
    return { mode, allowed: false, requiresApproval: false, suggestedApiRefs: [], productionSteps: [], publishingSteps: [], blockedReasons: [unsafe.reason ?? "unsafe"], nextAction: "deny" };
  }

  if (mode === "unknown") {
    return { mode, allowed: false, requiresApproval: false, suggestedApiRefs: [], productionSteps: [], publishingSteps: [], blockedReasons: [], nextAction: "clarify" };
  }

  if (mode === "publish") {
    void recordBrainEntry({ type: "action_result", title: "publish requested", content: input.text, importance: "high", metadata: { requiresApproval: true } });
    return { mode, allowed: false, requiresApproval: true, suggestedApiRefs: [], productionSteps: [], publishingSteps: ["Публикация требует подтверждения владельца."], blockedReasons: [], nextAction: "request_approval" };
  }

  const category = PROVIDER_CATEGORY[mode];
  const suggestedApiRefs = category ? listApis({ category: category as never }).map((a) => a.id) : [];

  const productionSteps = [`Составить промпт для режима '${mode}'.`, "Использовать только metadata API Hub (без реального вызова)."];
  const publishingSteps = ["Публикация в соцсети требует подтверждения владельца (approval)."];
  const promptDraft = ["image", "video", "voice", "caption", "social_post"].includes(mode)
    ? `Draft prompt for ${mode}: ${input.text}`.slice(0, 300) : undefined;

  const requiresApproval = mode === "video" || mode === "voice";

  void recordBrainEntry({
    type: "action_result", title: `content plan: ${mode}`, content: input.text,
    actorId: input.actorId, importance: requiresApproval ? "high" : "medium",
    metadata: { mode, requiresApproval, suggestedApiRefs },
  });

  return {
    mode, allowed: !requiresApproval, requiresApproval, providerCategory: category,
    suggestedApiRefs, promptDraft, productionSteps, publishingSteps, blockedReasons: [],
    nextAction: requiresApproval ? "request_approval" : (promptDraft ? "show_draft" : "show_plan"),
  };
}
