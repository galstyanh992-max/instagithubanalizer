import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { compareSchema } from "@/lib/validators";
import type { CompareResult } from "@/lib/types";

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return err("Provide 2–5 repository IDs", 400, { issues: parsed.error.flatten() });
  }
  const { ids } = parsed.data;

  const repos = await db.repository.findMany({
    where: { id: { in: ids } },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (repos.length < 2) return err("Need at least 2 valid repositories", 400);

  const items = repos.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    scores: {
      usefulness: r.usefulnessScore,
      health: r.healthScore,
      compatibility: r.compatibilityScore,
      commercialRisk: r.commercialRiskScore,
      agentOs: r.agentOsScore,
      aiLegal: r.aiLegalScore,
      security: r.securityScore,
      cost: r.costScore,
      finalPriority: r.finalPriorityScore,
    },
    verdict: r.verdict as CompareResult["repos"][number]["verdict"],
    metrics: {
      stars: r.stars,
      forks: r.forks,
      license: r.license,
      difficulty: r.difficulty as CompareResult["repos"][number]["metrics"]["difficulty"],
      gpuRequired: r.gpuRequired,
      commercialUseStatus: r.commercialUseStatus as CompareResult["repos"][number]["metrics"]["commercialUseStatus"],
    },
  }));

  const rankings = [...items]
    .sort((a, b) => b.scores.finalPriority - a.scores.finalPriority)
    .map((r, i) => ({
      id: r.id,
      fullName: r.fullName,
      rank: i + 1,
      reason: `Final priority ${r.scores.finalPriority}`,
    }));

  const winner = rankings[0]
    ? { id: rankings[0].id, fullName: rankings[0].fullName, reason: rankings[0].reason }
    : null;

  const bestFor = {
    agentOs: [...items].sort((a, b) => b.scores.agentOs - a.scores.agentOs)[0]?.fullName ?? "—",
    aiLegalArmenia: [...items].sort((a, b) => b.scores.aiLegal - a.scores.aiLegal)[0]?.fullName ?? "—",
    easiestToRun: [...items].sort((a, b) => {
      const aScore = (a.metrics.difficulty === "LOW" ? 3 : a.metrics.difficulty === "MEDIUM" ? 2 : 1) + (a.metrics.gpuRequired ? 0 : 1);
      const bScore = (b.metrics.difficulty === "LOW" ? 3 : b.metrics.difficulty === "MEDIUM" ? 2 : 1) + (b.metrics.gpuRequired ? 0 : 1);
      return bScore - aScore;
    })[0]?.fullName ?? "—",
    lowestRisk: [...items].sort((a, b) => {
      const order = { SAFE: 3, WARNING: 2, UNKNOWN: 1, HIGH_RISK: 0 } as const;
      return order[b.metrics.commercialUseStatus] - order[a.metrics.commercialUseStatus];
    })[0]?.fullName ?? "—",
  };

  const finalRecommendation = winner
    ? `${winner.fullName} is the recommended choice with final priority ${items.find((i) => i.id === winner.id)?.scores.finalPriority}. Best for Agent OS: ${bestFor.agentOs}. Best for AI Legal Armenia: ${bestFor.aiLegalArmenia}.`
    : "No clear winner — review manually.";

  const result: CompareResult = {
    repos: items,
    winner,
    rankings,
    bestFor,
    finalRecommendation,
  };
  return ok(result);
});
