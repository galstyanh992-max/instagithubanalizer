import type { GitHubRepoCandidate, GitHubRepoEvaluation, GitHubRepoUsefulness } from "./types";
import type { RiskLevel } from "@/lib/safety/permission-checker";

const USEFUL_KEYWORDS = ["agent","mcp","tool","api","github","browser","voice","workflow","automation","memory","prisma","nextjs","next.js","supabase","openrouter","ai","llm","claude","assistant","safety","approval"];
const RISK_KEYWORDS = ["malware","exploit","bypass","credential","phishing","keylogger","stealer","crack","spam","botnet","ransomware","ddos"];

export function evaluateGitHubCandidate(candidate: GitHubRepoCandidate, contextText = ""): GitHubRepoEvaluation {
  const hay = `${candidate.normalizedName} ${candidate.notes ?? ""} ${contextText}`.toLowerCase();
  const usefulHits = USEFUL_KEYWORDS.filter((k) => hay.includes(k));
  const riskHits = RISK_KEYWORDS.filter((k) => hay.includes(k));

  const reasons: string[] = [];
  let riskLevel: RiskLevel = "LOW";
  let usefulness: GitHubRepoUsefulness = "unknown";
  let recommendedNextAction: GitHubRepoEvaluation["recommendedNextAction"] = "watch";

  if (riskHits.length > 0) {
    riskLevel = "HIGH";
    reasons.push(`Обнаружены риск-ключевые слова: ${riskHits.join(", ")}`);
    recommendedNextAction = "manual_review";
    usefulness = "low";
  } else if (usefulHits.length >= 3) {
    usefulness = "high"; recommendedNextAction = "analyze_deeper";
    reasons.push(`Высокая релевантность JARVIS: ${usefulHits.join(", ")}`);
  } else if (usefulHits.length >= 1) {
    usefulness = "medium"; recommendedNextAction = "watch";
    reasons.push(`Частичная релевантность: ${usefulHits.join(", ")}`);
  } else {
    usefulness = "unknown"; recommendedNextAction = "manual_review";
    reasons.push("Недостаточно контекста для оценки — требуется ручная проверка.");
  }

  const compatibilityScore = Math.max(0, Math.min(100, usefulHits.length * 20 - riskHits.length * 40));

  return {
    candidate,
    usefulness,
    compatibilityScore,
    riskLevel,
    reasons,
    possibleIntegrations: usefulHits.slice(0, 5),
    recommendedNextAction,
  };
}
