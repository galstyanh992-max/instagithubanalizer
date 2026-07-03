// AI Jarwisyan — Run Options service
// Generates local / docker / cpu-only / Ollama Cloud options per repo.
// Per policy: ONLY ollama_cloud is allowed as cloud fallback.

import {
  CLOUD_PROVIDER_POLICY,
  PRICING_NOTE,
  OLLAMA_CLOUD_PROVIDER,
  GITHUB_ALTERNATIVE_QUERY_TEMPLATES,
} from "@/lib/constants";
import type {
  RepoMetadata,
  RunOptionsResult,
  CompatibilityResult,
} from "@/lib/types";

interface BuildRunOptionsInput {
  meta: RepoMetadata;
  compatibility: CompatibilityResult;
  /** repo purpose / one-line description for GitHub search queries */
  purpose?: string;
}

export const runOptionsService = {
  build(input: BuildRunOptionsInput): RunOptionsResult {
    const { meta, compatibility } = input;
    const purpose = (input.purpose ?? meta.description ?? meta.name).slice(0, 80);

    // ---- Local option ----
    const localPossible = compatibility.canRunLocally && compatibility.recommendedRunMode !== "skip_local";
    const localMode = compatibility.recommendedRunMode === "local_cpu_only"
      ? "CPU-only native install"
      : compatibility.recommendedRunMode === "local_docker"
        ? "Docker container (local)"
        : "Native install (local)";
    const localSteps: string[] = localPossible
      ? [
          `git clone ${meta.githubUrl}.git`,
          `cd ${meta.name}`,
          meta.hasPackageJson
            ? "npm install"
            : meta.hasPyproject
              ? "pip install -e ."
              : meta.hasRequirements
                ? "pip install -r requirements.txt"
                : "see README",
          meta.hasPackageJson
            ? "npm run dev"
            : meta.hasPyproject
              ? `python -m ${meta.name}`
              : "see README",
          "Verify service is reachable",
        ]
      : [];
    const localLimitations: string[] = localPossible
      ? [
          compatibility.estimatedLocalPerformance === "FAST"
            ? "Should run smoothly"
            : `Expected performance: ${compatibility.estimatedLocalPerformance}`,
          ...(compatibility.bottlenecks.length > 0 ? ["Hardware bottlenecks: " + compatibility.bottlenecks.join("; ")] : []),
        ]
      : ["Local run is not viable on this PC."];

    // ---- Docker option ----
    const dockerPossible =
      (meta.hasDocker || meta.hasDockerCompose) &&
      compatibility.recommendedRunMode !== "skip_local";
    const dockerSteps: string[] = dockerPossible
      ? [
          `git clone ${meta.githubUrl}.git`,
          `cd ${meta.name}`,
          meta.hasDockerCompose
            ? "docker compose up -d"
            : `docker build -t ${meta.name} .`,
          meta.hasDockerCompose
            ? "docker compose logs -f"
            : `docker run -p 8000:8000 ${meta.name}`,
        ]
      : [];
    const dockerLimitations: string[] = dockerPossible
      ? ["Requires Docker Desktop on Windows / Docker Engine on Linux."]
      : [
          "No Dockerfile / docker-compose detected in repo.",
          "Install Docker Desktop on Windows if not yet installed.",
        ];

    // ---- CPU-only option ----
    const cpuOnlyPossible =
      compatibility.recommendedRunMode === "local_cpu_only" ||
      (/cpu/i.test(meta.readmeText.slice(0, 4000)) && !compatibility.hardwareRisks.some((r) => /CUDA/i.test(r)));
    const cpuOnlySteps: string[] = cpuOnlyPossible
      ? [
          `git clone ${meta.githubUrl}.git`,
          `cd ${meta.name}`,
          "Install with CPU-only extras (see README — e.g. --extra-index-url or --cpu flag)",
          "Run with CPU device flag",
        ]
      : [];
    const cpuOnlyPerformance = cpuOnlyPossible
      ? compatibility.estimatedLocalPerformance === "FAST"
        ? "OK to FAST for small batches"
        : "SLOW to VERY_SLOW — fine for evaluation, not for production"
      : "n/a";
    const cpuOnlyLimitations = cpuOnlyPossible
      ? ["Inference will be 5-50x slower than GPU.", "Not suitable for production workloads."]
      : ["Repository does not document a CPU-only path."];

    // ---- Ollama Cloud option ----
    // Ollama Cloud is suitable ONLY when:
    //   (a) the repo explicitly integrates Ollama / llama.cpp / GGUF models as its primary use case, OR
    //   (b) the repo is an LLM / chat / embedding / vision-language workload that Ollama Cloud can serve.
    // Ollama Cloud does NOT serve OCR, TTS (non-LLM), document parsing, RAG backends, video, audio, etc.
    const repoText = (meta.description + " " + meta.readmeText.slice(0, 4000)).toLowerCase();
    // Positive Ollama signals (must be INSTALL/USE signal, not just mention of "Ollama Cloud is not a fit")
    const ollamaInstallSignal = /ollama\s+(run|pull|serve|install)|import\s+ollama|from\s+ollama|ollama\.chat|ollama\.embed|ollama\.client|ollama\s+compatible|runs\s+with\s+ollama/i.test(repoText);
    const ggufSignal = /\bgguf\b|llama\.cpp|ggml/i.test(repoText);
    const ollamaCompatible = ollamaInstallSignal || ggufSignal;
    // Repo category detection
    const isTtsRepo = /\btts\b|text[\s-]to[\s-]speech|speech\s*synthesis|voice\s*clone|speech\s*model/i.test(repoText);
    const isOcrOrPdfRepo = /\bocr\b|pdf\s*parse|document\s*parse|table\s*extract|pdf\s*extract/i.test(repoText);
    const isVideoRepo = /\bvideo\b|ffmpeg|transcode|video\s*edit/i.test(repoText);
    const isLlmChatRepo = /\bllm\b|chat\s*completion|chat\s*model|embedding\s*model|vision[\s-]language|instruction[\s-]tuned|fine[\s-]tuned\s*model|transformer\s*model|instruct\s*model/i.test(repoText);

    const ollamaCloudPossible =
      ollamaCompatible ||
      (isLlmChatRepo && !isTtsRepo && !isOcrOrPdfRepo && !isVideoRepo);

    const ollamaUseCaseFit = ollamaCloudPossible
      ? ollamaCompatible
        ? "Direct fit — repo integrates Ollama / llama.cpp / GGUF models as its primary use case."
        : "Indirect fit — repo is an LLM/chat/embedding workload that could be replaced by an Ollama Cloud endpoint."
      : "No fit — repo's use case (TTS, OCR, document parsing, video, RAG backend) is not served by Ollama Cloud. No allowed cloud provider is suitable.";
    const ollamaSteps: string[] = ollamaCloudPossible
      ? [
          "Visit https://ollama.com/cloud and create an account.",
          "Generate an API key.",
          "Pick a model that covers this repo's task (chat / embedding / vision).",
          "Replace local model loading with `import ollama; ollama.Client(host='https://...')` calls.",
          "Verify API responses match the expected format.",
        ]
      : ["Not applicable — repo use case is not served by Ollama Cloud."];
    const ollamaLimitations = ollamaCloudPossible
      ? [
          "Requires paid Ollama Cloud plan for production use.",
          "Network latency replaces local inference.",
          "Not suitable for offline / private-data-only workflows.",
        ]
      : ["No suitable Ollama Cloud option for this repo's use case."];

    // ---- GitHub alternatives (queries only — actual search happens via github-alternatives.service.ts) ----
    const githubAlternatives = GITHUB_ALTERNATIVE_QUERY_TEMPLATES.map((tpl) => ({
      query: tpl.replace("{purpose}", purpose),
      reason: `Find a lighter / CPU-friendly / Ollama-compatible alternative to ${meta.fullName}.`,
      suggestedSearches: [
        tpl.replace("{purpose}", purpose),
        `${meta.primaryLanguage || "any"} ${purpose} alternative`,
      ],
    }));

    // ---- Disabled providers (informational) ----
    const disabledProviders = [...CLOUD_PROVIDER_POLICY.disallowedProviders];

    // ---- Final recommendation ----
    let finalRecommendation = "";
    if (localPossible) {
      finalRecommendation = `Run locally via ${localMode}. Estimated performance: ${compatibility.estimatedLocalPerformance}.`;
    } else if (dockerPossible) {
      finalRecommendation = "Run locally via Docker (recommended install path).";
    } else if (cpuOnlyPossible) {
      finalRecommendation = "Run CPU-only mode for evaluation; expect slow inference.";
    } else if (ollamaCloudPossible) {
      finalRecommendation = `Run via ${OLLAMA_CLOUD_PROVIDER.name}. ${PRICING_NOTE}`;
    } else {
      finalRecommendation =
        "No allowed cloud provider is suitable. Provider policy allows only Ollama Cloud. Consider saving the repo for ideas or skipping.";
    }

    return {
      localOption: {
        possible: localPossible,
        mode: localMode,
        steps: localSteps,
        limitations: localLimitations,
        estimatedCost: "free",
      },
      dockerOption: {
        possible: dockerPossible,
        steps: dockerSteps,
        limitations: dockerLimitations,
        estimatedCost: "free",
      },
      cpuOnlyOption: {
        possible: cpuOnlyPossible,
        steps: cpuOnlySteps,
        expectedPerformance: cpuOnlyPerformance,
        limitations: cpuOnlyLimitations,
        estimatedCost: "free",
      },
      ollamaCloudOption: {
        possible: ollamaCloudPossible,
        provider: "ollama_cloud",
        providerName: OLLAMA_CLOUD_PROVIDER.name,
        useCaseFit: ollamaUseCaseFit,
        steps: ollamaSteps,
        limitations: ollamaLimitations,
        estimatedCostUsd: "approximate — see https://ollama.com/cloud for current pricing",
        pricingStatus: "requires_live_check",
        pricingNote: PRICING_NOTE,
        linksToCheck: ["https://ollama.com/cloud", "https://ollama.com/pricing"],
      },
      disabledProviders,
      githubAlternatives,
      finalRecommendation,
    };
  },
};
