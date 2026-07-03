// AI Jarwisyan — Scoring engine (v2 — hardware & provider-aware)
//
// New formula per spec:
//   final_priority_score =
//     usefulness * 0.25
//   + health * 0.15
//   + compatibility * 0.20
//   + agent_os * 0.15
//   + ai_legal * 0.15
//   + cost * 0.05
//   - commercial_risk * 0.05
//
// Verdict logic is now hardware-aware and provider-aware.

import { SCORE_WEIGHTS, CLOUD_PROVIDER_POLICY } from "@/lib/constants";
import type {
  RepoMetadata,
  RepoAnalysisResult,
  Verdict,
  CompatibilityResult,
} from "@/lib/types";
import { licenseService } from "./license.service";

export interface FullScoreSet {
  usefulness: number;
  health: number;
  compatibility: number;
  commercialRisk: number;
  agentOs: number;
  aiLegal: number;
  security: number;
  cost: number;
  finalPriority: number;
  verdict: Verdict;
}

export const scoringService = {
  computeScores(
    meta: RepoMetadata,
    analysis: RepoAnalysisResult,
    compatibility?: CompatibilityResult | number | null
  ): FullScoreSet {
    const usefulness = analysis.scores.usefulness;
    const health = analysis.scores.health;
    const agentOs = analysis.projectFit.agentOs.score;
    const aiLegal = analysis.projectFit.aiLegalArmenia.score;
    const security = analysis.scores.security;
    const cost = analysis.scores.cost;

    // Compatibility — accept either a CompatibilityResult or a raw score.
    let compatibilityScore: number;
    let compatResult: CompatibilityResult | null = null;
    if (compatibility && typeof compatibility === "object" && "compatibilityScore" in compatibility) {
      compatResult = compatibility;
      compatibilityScore = compatibility.compatibilityScore;
    } else if (typeof compatibility === "number") {
      compatibilityScore = compatibility;
    } else {
      compatibilityScore = analysis.scores.compatibility;
    }

    const commercialRisk = analysis.scores.commercialRisk;
    const finalPriority = clamp(
      Math.round(
        usefulness * SCORE_WEIGHTS.usefulness +
          health * SCORE_WEIGHTS.health +
          compatibilityScore * SCORE_WEIGHTS.compatibility +
          agentOs * SCORE_WEIGHTS.agentOs +
          aiLegal * SCORE_WEIGHTS.aiLegal +
          cost * SCORE_WEIGHTS.cost +
          commercialRisk * SCORE_WEIGHTS.commercialRisk
      ),
      0,
      100
    );

    const verdict = decideVerdict(
      meta,
      analysis,
      compatResult,
      compatibilityScore,
      finalPriority
    );

    return {
      usefulness,
      health,
      compatibility: compatibilityScore,
      commercialRisk,
      agentOs,
      aiLegal,
      security,
      cost,
      finalPriority,
      verdict,
    };
  },
};

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function decideVerdict(
  meta: RepoMetadata,
  analysis: RepoAnalysisResult,
  compat: CompatibilityResult | null,
  compatibilityScore: number,
  _finalPriority: number
): Verdict {
  const usefulness = analysis.scores.usefulness;
  const health = analysis.scores.health;
  const licenseStatus = licenseService.classifyLicense(meta.license).status;

  // ---------- USE NOW ----------
  // usefulness >= 80, health >= 65, no high commercial risk,
  // runs locally (native / docker / WSL2 / CPU-only), no disallowed provider.
  const runsLocally =
    compat?.canRunLocally === true ||
    ["local", "local_cpu_only", "local_docker", "local_directml", "local_rocm_if_available"].includes(
      compat?.recommendedRunMode ?? ""
    );
  const noDisallowedProvider = !analysis.nextAction
    .toLowerCase()
    .split(/\s+/)
    .some((w) => (CLOUD_PROVIDER_POLICY.disallowedProviders as readonly string[]).includes(w.toLowerCase()));

  if (
    usefulness >= 80 &&
    health >= 65 &&
    licenseStatus !== "HIGH_RISK" &&
    runsLocally &&
    noDisallowedProvider
  ) {
    return "USE_NOW";
  }

  // ---------- TEST ----------
  // High or medium usefulness + runs locally with limits OR has Ollama Cloud fallback.
  const hasOllamaFallback =
    compat?.recommendedRunMode === "ollama_cloud" &&
    !compat.hardwareRisks.some((r) => /NVIDIA-only/i.test(r));
  if (
    usefulness >= 60 &&
    (runsLocally || hasOllamaFallback) &&
    licenseStatus !== "HIGH_RISK"
  ) {
    return "TEST";
  }

  // ---------- SAVE ----------
  // Useful idea but my PC is weak; only Ollama Cloud fallback; not urgent.
  if (usefulness >= 35 && (hasOllamaFallback || usefulness >= 50)) {
    return "SAVE";
  }

  // ---------- SKIP ----------
  // No local run + Ollama Cloud unsuitable + disallowed provider required +
  // high risk + no license + dead repo.
  if (compat && compat.recommendedRunMode === "skip_local" && !hasOllamaFallback) {
    return "SKIP";
  }
  if (licenseStatus === "HIGH_RISK" && usefulness < 50) {
    return "SKIP";
  }
  if (usefulness < 35) {
    return "SKIP";
  }
  return "SAVE";
}
