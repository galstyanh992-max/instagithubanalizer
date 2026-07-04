import type { BrowserResearchInput, BrowserActionPlan } from "./types";
import { classifyResearchMode } from "./mode-classifier";
import { sourcePolicyFor, isUnsafeResearchRequest } from "./source-policy";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

const OUTPUT_MAP: Record<string, BrowserActionPlan["expectedOutput"]> = {
  deep_research: "research_report",
  movie_recommendation: "movie_recommendations",
  competitor_public_analysis: "summary",
  github_source_discovery: "source_list",
  site_check: "summary",
  quick_lookup: "summary",
  custom: "manual_review",
};

/** Never launches a browser, never fetches the network. */
export async function planBrowserResearch(input: BrowserResearchInput): Promise<BrowserActionPlan> {
  const unsafe = isUnsafeResearchRequest(input.text);
  const mode = input.mode ?? classifyResearchMode(input.text);
  const sourcePolicy = sourcePolicyFor(mode);

  if (unsafe.unsafe) {
    const plan: BrowserActionPlan = {
      mode, allowed: false, requiresApproval: false, riskLevel: "HIGH", sourcePolicy,
      steps: [], blockedReasons: [unsafe.reason ?? "unsafe"], expectedOutput: "manual_review",
    };
    void recordBrainEntry({ type: "safety_decision", title: "browser research denied", content: input.text, importance: "high", metadata: { reason: unsafe.reason } });
    return plan;
  }

  const steps: string[] = [
    `Классифицирован режим: ${mode}.`,
    `Политика источников: ${sourcePolicy.join(", ")}.`,
    "План формируется без запуска браузера и без сетевых вызовов.",
  ];
  if (mode === "github_source_discovery") {
    steps.push("При наличии github.com ссылок в тексте — использовать GitHub Watcher (уже реализован, без сети).");
  }
  if (mode === "deep_research") {
    steps.push("Требуется структурированный отчёт: факты/предположения/неизвестные + разделение на источники.");
  }

  const requiresApproval = mode === "deep_research" || sourcePolicy.includes("manual_approval_required");

  const plan: BrowserActionPlan = {
    mode, allowed: !requiresApproval, requiresApproval, riskLevel: requiresApproval ? "MEDIUM" : "LOW",
    sourcePolicy, steps, blockedReasons: [], expectedOutput: OUTPUT_MAP[mode],
  };

  void recordBrainEntry({
    type: "research_note", title: `browser research plan: ${mode}`, content: input.text,
    actorId: input.actorId, importance: requiresApproval ? "high" : "medium",
    metadata: { mode, sourcePolicy, requiresApproval },
  });

  return plan;
}
