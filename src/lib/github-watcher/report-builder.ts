import type { GitHubWatchReport, GitHubWatcherSourceType } from "./types";
import { extractGitHubCandidates } from "./url-extractor";
import { evaluateGitHubCandidate } from "./evaluator";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

export interface BuildWatchReportInput {
  text: string;
  source?: GitHubWatcherSourceType;
  actorId?: string;
  actorRole?: string;
  actorSource?: string;
}

/** Never calls network. Pure text extraction + heuristic evaluation. */
export async function buildGitHubWatchReport(input: BuildWatchReportInput): Promise<GitHubWatchReport> {
  const candidates = extractGitHubCandidates(input.text, input.source ?? "manual_text");
  const evaluations = candidates
    .map((c) => {
      // Use only the text local to this candidate's URL mention as context, not the whole blob,
      // so scoring doesn't get skewed by keywords that belong to a different candidate.
      const idx = input.text.indexOf(c.url.split("github.com/")[1]);
      const localCtx = idx >= 0 ? input.text.slice(Math.max(0, idx - 50), idx + 40) : "";
      return evaluateGitHubCandidate(c, localCtx);
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const risks = evaluations.filter((e) => e.riskLevel !== "LOW").flatMap((e) => e.reasons);
  const possibleIntegrations = [...new Set(evaluations.flatMap((e) => e.possibleIntegrations))];
  const recommendedNextActions = evaluations.map((e) => `${e.candidate.normalizedName}: ${e.recommendedNextAction} (никогда auto-install)`);

  const report: GitHubWatchReport = {
    summary: `Найдено ${candidates.length} репозиториев-кандидатов. Ничего не установлено автоматически.`,
    candidates: evaluations,
    risks,
    possibleIntegrations,
    recommendedNextActions,
  };

  void recordBrainEntry({
    type: "research_note",
    title: `github watch report: ${candidates.length} candidates`,
    content: report.summary,
    actorId: input.actorId, actorRole: input.actorRole, actorSource: input.actorSource,
    importance: risks.length > 0 ? "high" : "medium",
    metadata: { candidates: evaluations.map((e) => e.candidate.normalizedName), riskCount: risks.length },
  });

  return report;
}
