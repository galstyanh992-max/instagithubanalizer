// AI Jarwisyan — AI service (GLM 5.2 via z.ai SDK, with mock fallback)
// v2 — system prompt includes user PC profile + cloud provider policy.

import { env, isAiConfigured } from "@/lib/env";
import type {
  RepoMetadata,
  RepoAnalysisResult,
  ProjectFit,
  ProjectFitItem,
  Verdict,
  Difficulty,
  InstallPlanData,
} from "@/lib/types";
import { licenseService } from "./license.service";
import { securityService } from "./security.service";
import { MY_PC_PROFILE, CLOUD_PROVIDER_POLICY, PRICING_NOTE } from "@/lib/constants";

interface AIProvider {
  name: string;
  isMock: boolean;
  analyze(meta: RepoMetadata, projectContext: ProjectContextFlags): Promise<RepoAnalysisResult>;
  generateInstallPlan(meta: RepoMetadata, analysis: RepoAnalysisResult): Promise<InstallPlanData>;
}

export interface ProjectContextFlags {
  agentOs: boolean;
  aiLegalArmenia: boolean;
  ragOcr: boolean;
  videoAutomation: boolean;
  saasBusiness: boolean;
  tradingFinance: boolean;
}

class GlmProvider implements AIProvider {
  name = "glm";
  isMock = false;

  private async chat(prompt: string, system: string): Promise<string> {
    // Dynamic import — z-ai-web-dev-sdk is server-side only
    const ZAISDK = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAISDK.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async analyze(meta: RepoMetadata, ctx: ProjectContextFlags): Promise<RepoAnalysisResult> {
    const system =
      "Ты — AI Jarwisyan, senior software architect, анализирующий GitHub-репозитории. " +
      "ВСЕГДА отвечай на русском языке. Все объяснения, рекомендации, планы запуска, " +
      "анализ рисков и fallback-сообщения должны быть на русском. " +
      "Технические имена файлов, команды, API endpoints, JSON keys и названия библиотек оставляй без перевода. " +
      "Верни ТОЛЬКО валидный JSON объект. Без прозы, без markdown ограждений. " +
      "JSON keys — английские, но все человекочитаемые значения — на русском.";
    const prompt = buildAnalysisPrompt(meta, ctx);
    const raw = await this.chat(prompt, system);
    return parseAnalysisJson(raw, meta);
  }

  async generateInstallPlan(meta: RepoMetadata, _analysis: RepoAnalysisResult): Promise<InstallPlanData> {
    const system =
      "Ты — DevOps инженер. ВСЕГДА отвечай на русском. Верни ТОЛЬКО валидный JSON с планом установки. Без прозы. JSON keys — английские, значения — на русском.";
    const prompt = buildInstallPlanPrompt(meta);
    const raw = await this.chat(prompt, system);
    return parseInstallPlanJson(raw, meta);
  }
}

class MockProvider implements AIProvider {
  name = "mock";
  isMock = true;

  async analyze(meta: RepoMetadata, ctx: ProjectContextFlags): Promise<RepoAnalysisResult> {
    return mockAnalyze(meta, ctx);
  }

  async generateInstallPlan(meta: RepoMetadata, _analysis: RepoAnalysisResult): Promise<InstallPlanData> {
    return mockInstallPlan(meta);
  }
}

export function getAiProvider(): AIProvider {
  if (isAiConfigured()) {
    try {
      return new GlmProvider();
    } catch (e) {
      console.warn("[ai] GLM provider init failed, using mock:", e);
      return new MockProvider();
    }
  }
  return new MockProvider();
}

// -------- Prompt builders --------

function buildAnalysisPrompt(meta: RepoMetadata, ctx: ProjectContextFlags): string {
  const enabledProjects = Object.entries(ctx)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");
  return `Analyze this GitHub repository.

USER PC PROFILE (always evaluate compatibility against this):
- OS: ${MY_PC_PROFILE.os}
- CPU: ${MY_PC_PROFILE.cpu} (${MY_PC_PROFILE.cpuCoresHint})
- RAM: ${MY_PC_PROFILE.ramGb} GB
- GPU: ${MY_PC_PROFILE.gpu}
- VRAM: ${MY_PC_PROFILE.vramGb} GB
- Free disk: ~${MY_PC_PROFILE.storageFreeGb} GB
- CUDA: ${MY_PC_PROFILE.cudaAvailable ? "available" : "unavailable"} (${MY_PC_PROFILE.cudaNotes})
- ROCm: ${MY_PC_PROFILE.rocmAvailable === null ? "unknown" : MY_PC_PROFILE.rocmAvailable ? "available" : "unavailable"}
- Docker/Python/Node/Git: unknown unless configured by user

CLOUD PROVIDER POLICY:
- The ONLY allowed cloud provider is Ollama Cloud.
- NEVER recommend RunPod, Vast.ai, Lambda, Paperspace, Google Colab, Kaggle, AWS, Google Cloud, Azure, Hugging Face Spaces, Modal, Replicate, DigitalOcean, Railway, Render, Fly.io, or any other provider.
- If local execution is not possible, evaluate only Ollama Cloud as the cloud fallback.
- If Ollama Cloud is not suitable, explicitly say that no allowed cloud provider is suitable.
- Pricing must be marked as approximate, unknown, or requires_live_check. Never present pricing as guaranteed.
- ${PRICING_NOTE}

If the repository does not fit this PC, ALWAYS provide:
1. exact reason it does not fit;
2. local workaround if possible;
3. CPU-only option if possible;
4. Docker/WSL2 option if possible;
5. Ollama Cloud option if possible;
6. pricing status for Ollama Cloud (approximate | unknown | requires_live_check);
7. pricing verification warning;
8. GitHub alternative search queries;
9. lighter GitHub alternatives if available (do NOT invent repos — return empty array if unknown);
10. final recommendation: USE NOW, TEST, SAVE, or SKIP.

REPO:
- fullName: ${meta.fullName}
- description: ${meta.description || "(none)"}
- stars: ${meta.stars}
- forks: ${meta.forks}
- license: ${meta.license}
- primaryLanguage: ${meta.primaryLanguage}
- topics: ${meta.topics.join(", ") || "(none)"}
- hasDocker: ${meta.hasDocker}
- hasDockerCompose: ${meta.hasDockerCompose}
- hasPackageJson: ${meta.hasPackageJson}
- hasRequirements: ${meta.hasRequirements}
- hasPyproject: ${meta.hasPyproject}
- hasEnvExample: ${meta.hasEnvExample}
- archived: ${meta.archived}
- disabled: ${meta.disabled}

ENABLED PROJECTS: ${enabledProjects || "none"}

README (first 4000 chars):
${meta.readmeText.slice(0, 4000)}

Return JSON exactly matching this shape:
{
  "summary": "1-2 sentence project description",
  "problemSolved": "what problem does it solve",
  "bestUseCases": ["use case 1", "use case 2", ...],
  "projectFit": {
    "agentOs": {"score": 0-100, "notes": ""},
    "aiLegalArmenia": {"score": 0-100, "notes": ""},
    "ragOcr": {"score": 0-100, "notes": ""},
    "videoAutomation": {"score": 0-100, "notes": ""},
    "saasBusiness": {"score": 0-100, "notes": ""},
    "tradingFinance": {"score": 0-100, "notes": ""}
  },
  "localRun": {"possible": true, "gpuRequired": false, "difficulty": "LOW|MEDIUM|HIGH", "notes": ""},
  "commercialRisk": {"status": "SAFE|WARNING|HIGH_RISK|UNKNOWN", "notes": ""},
  "security": {"status": "SAFE|REVIEW|RISK", "notes": ["note 1", ...]},
  "cost": {"status": "FREE_OR_LOW_COST|MEDIUM_COST|HIGH_COST|UNKNOWN", "notes": ""},
  "extractedIdeas": ["idea 1", "idea 2", ...],
  "testPlan": {
    "fifteenMinutes": ["step 1", ...],
    "thirtyMinutes": ["step 1", ...],
    "sixtyMinutes": ["step 1", ...]
  },
  "scores": {
    "usefulness": 0-100,
    "health": 0-100,
    "compatibility": 0-100,
    "commercialRisk": 0-100,
    "agentOs": 0-100,
    "aiLegal": 0-100,
    "security": 0-100,
    "cost": 0-100,
    "finalPriority": 0-100
  },
  "verdict": "USE_NOW|TEST|SAVE|SKIP",
  "nextAction": "concrete next step, must respect cloud provider policy"
}`;
}

function buildInstallPlanPrompt(meta: RepoMetadata): string {
  return `Create an install/run plan for ${meta.fullName}.

Repo signals:
- primaryLanguage: ${meta.primaryLanguage}
- hasDocker: ${meta.hasDocker}
- hasDockerCompose: ${meta.hasDockerCompose}
- hasPackageJson: ${meta.hasPackageJson}
- hasRequirements: ${meta.hasRequirements}
- hasPyproject: ${meta.hasPyproject}
- hasEnvExample: ${meta.hasEnvExample}
- defaultBranch: ${meta.defaultBranch}

Return JSON:
{
  "prerequisites": ["..."],
  "dockerCommands": ["..."],
  "manualCommands": ["..."],
  "envVars": [{"key": "...", "description": "...", "required": true}],
  "verificationSteps": ["..."],
  "commonErrors": ["..."],
  "cleanupSteps": ["..."]
}`;
}

// -------- Parsers --------

function parseAnalysisJson(raw: string, meta: RepoMetadata): RepoAnalysisResult {
  let json: Record<string, unknown> | null = null;
  try {
    // Strip code fences if present
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    json = JSON.parse(cleaned);
  } catch {
    console.warn("[ai] failed to parse AI JSON, falling back to mock");
    return mockAnalyze(meta, {
      agentOs: true,
      aiLegalArmenia: true,
      ragOcr: true,
      videoAutomation: true,
      saasBusiness: true,
      tradingFinance: true,
    });
  }
  if (!json) return mockAnalyze(meta, {
    agentOs: true, aiLegalArmenia: true, ragOcr: true,
    videoAutomation: true, saasBusiness: true, tradingFinance: true
  });
  return normalizeAnalysis(json, meta);
}

function parseInstallPlanJson(raw: string, meta: RepoMetadata): InstallPlanData {
  let json: Record<string, unknown> | null = null;
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    json = JSON.parse(cleaned);
  } catch {
    return mockInstallPlan(meta);
  }
  if (!json) return mockInstallPlan(meta);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];
  return {
    prerequisites: arr(json.prerequisites),
    dockerCommands: arr(json.dockerCommands),
    manualCommands: arr(json.manualCommands),
    envVars: Array.isArray(json.envVars)
      ? (json.envVars as Array<Record<string, unknown>>).map((e) => ({
          key: String(e.key ?? ""),
          description: String(e.description ?? ""),
          required: Boolean(e.required),
        }))
      : [],
    verificationSteps: arr(json.verificationSteps),
    commonErrors: arr(json.commonErrors),
    cleanupSteps: arr(json.cleanupSteps),
  };
}

function normalizeAnalysis(json: Record<string, unknown>, meta: RepoMetadata): RepoAnalysisResult {
  const projectFitRaw = (json.projectFit ?? {}) as Record<string, unknown>;
  const buildItem = (k: string): ProjectFitItem => {
    const v = (projectFitRaw[k] ?? {}) as Record<string, unknown>;
    return {
      score: clamp(Number(v.score ?? 0), 0, 100),
      notes: String(v.notes ?? ""),
    };
  };
  const projectFit: ProjectFit = {
    agentOs: buildItem("agentOs"),
    aiLegalArmenia: buildItem("aiLegalArmenia"),
    ragOcr: buildItem("ragOcr"),
    videoAutomation: buildItem("videoAutomation"),
    saasBusiness: buildItem("saasBusiness"),
    tradingFinance: buildItem("tradingFinance"),
  };
  const localRunRaw = (json.localRun ?? {}) as Record<string, unknown>;
  const scoresRaw = (json.scores ?? {}) as Record<string, unknown>;
  const securityRaw = (json.security ?? {}) as Record<string, unknown>;
  const commercialRaw = (json.commercialRisk ?? {}) as Record<string, unknown>;
  const costRaw = (json.cost ?? {}) as Record<string, unknown>;
  const testPlanRaw = (json.testPlan ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  const scores = {
    usefulness: clamp(Number(scoresRaw.usefulness ?? 0), 0, 100),
    health: clamp(Number(scoresRaw.health ?? 0), 0, 100),
    compatibility: clamp(Number(scoresRaw.compatibility ?? 0), 0, 100),
    commercialRisk: clamp(Number(scoresRaw.commercialRisk ?? 0), 0, 100),
    agentOs: clamp(Number(scoresRaw.agentOs ?? 0), 0, 100),
    aiLegal: clamp(Number(scoresRaw.aiLegal ?? 0), 0, 100),
    security: clamp(Number(scoresRaw.security ?? 0), 0, 100),
    cost: clamp(Number(scoresRaw.cost ?? 0), 0, 100),
    finalPriority: clamp(Number(scoresRaw.finalPriority ?? 0), 0, 100),
  };

  const verdict = (["USE_NOW", "TEST", "SAVE", "SKIP"].includes(String(json.verdict))
    ? String(json.verdict)
    : "TEST") as Verdict;

  return {
    summary: String(json.summary ?? ""),
    problemSolved: String(json.problemSolved ?? ""),
    bestUseCases: arr(json.bestUseCases),
    projectFit,
    localRun: {
      possible: Boolean(localRunRaw.possible ?? true),
      gpuRequired: Boolean(localRunRaw.gpuRequired ?? false),
      difficulty: (["LOW", "MEDIUM", "HIGH"].includes(String(localRunRaw.difficulty))
        ? String(localRunRaw.difficulty)
        : "MEDIUM") as Difficulty,
      notes: String(localRunRaw.notes ?? ""),
    },
    commercialRisk: {
      status: (["SAFE", "WARNING", "HIGH_RISK", "UNKNOWN"].includes(
        String(commercialRaw.status)
      )
        ? String(commercialRaw.status)
        : "UNKNOWN") as RepoAnalysisResult["commercialRisk"]["status"],
      notes: String(commercialRaw.notes ?? ""),
    },
    security: {
      status: (["SAFE", "REVIEW", "RISK"].includes(String(securityRaw.status))
        ? String(securityRaw.status)
        : "REVIEW") as RepoAnalysisResult["security"]["status"],
      notes: arr(securityRaw.notes),
    },
    cost: {
      status: (["FREE_OR_LOW_COST", "MEDIUM_COST", "HIGH_COST", "UNKNOWN"].includes(
        String(costRaw.status)
      )
        ? String(costRaw.status)
        : "UNKNOWN") as RepoAnalysisResult["cost"]["status"],
      notes: String(costRaw.notes ?? ""),
    },
    extractedIdeas: arr(json.extractedIdeas),
    testPlan: {
      fifteenMinutes: arr(testPlanRaw.fifteenMinutes),
      thirtyMinutes: arr(testPlanRaw.thirtyMinutes),
      sixtyMinutes: arr(testPlanRaw.sixtyMinutes),
    },
    scores,
    verdict,
    nextAction: String(json.nextAction ?? ""),
  };
}

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

// -------- Mock implementation --------

function mockAnalyze(meta: RepoMetadata, ctx: ProjectContextFlags): RepoAnalysisResult {
  // Heuristic mock scores based on repo metadata
  const readmeLength = meta.readmeText.length;
  const hasLicense = meta.license && meta.license !== "unknown" && meta.license !== "none";
  const isPopular = meta.stars > 1000;
  const isMaintained = !meta.archived && !meta.disabled;
  const isPy = /python/i.test(meta.primaryLanguage) || meta.hasPyproject || meta.hasRequirements;
  const isJs = /typescript|javascript/i.test(meta.primaryLanguage) || meta.hasPackageJson;

  const licenseInfo = licenseService.classifyLicense(meta.license);
  const securityInfo = securityService.scanSecurity(meta, meta.readmeText);

  const usefulness = clamp(
    40 + (isPopular ? 20 : 0) + (readmeLength > 2000 ? 15 : 0) + (hasLicense ? 10 : 0),
    0,
    100
  );
  const health = clamp(
    40 +
      (isMaintained ? 25 : 0) +
      (meta.stars > 500 ? 15 : 0) +
      (meta.openIssues < 100 ? 10 : 0) +
      (meta.pushedAtGithub &&
      Date.now() - new Date(meta.pushedAtGithub).getTime() < 1000 * 60 * 60 * 24 * 90
        ? 10
        : 0),
    0,
    100
  );
  const compatibility = clamp(
    50 +
      (meta.hasDocker ? 20 : 0) +
      (meta.hasEnvExample ? 10 : 0) +
      (isPy || isJs ? 15 : 0) +
      (meta.hasDockerCompose ? 5 : 0),
    0,
    100
  );

  // Project fit heuristics — keyword based
  const lowerName = meta.fullName.toLowerCase();
  const lowerDesc = (meta.description + " " + meta.readmeText.slice(0, 1000)).toLowerCase();
  const kw = (s: string) => lowerName.includes(s) || lowerDesc.includes(s);

  const fitScore = (base: number, keywords: string[], bonus: number) =>
    clamp(base + (keywords.some(kw) ? bonus : 0), 0, 100);

  const projectFit: ProjectFit = {
    agentOs: {
      score: ctx.agentOs
        ? fitScore(
            40,
            ["agent", "orchestrat", "tool", "browser", "automation", "openhands", "mem0"],
            35
          )
        : 0,
      notes: ctx.agentOs ? "Keyword-based estimate; verify by manual review." : "Disabled in settings.",
    },
    aiLegalArmenia: {
      score: ctx.aiLegalArmenia
        ? fitScore(35, ["ocr", "pdf", "document", "docling", "crawl", "parse", "reader"], 35)
        : 0,
      notes: ctx.aiLegalArmenia ? "Suitable for document-heavy legal workflows." : "Disabled.",
    },
    ragOcr: {
      score: ctx.ragOcr
        ? fitScore(40, ["ocr", "pdf", "rag", "parse", "table", "docling", "megaparse"], 30)
        : 0,
      notes: ctx.ragOcr ? "Could feed RAG pipelines." : "Disabled.",
    },
    videoAutomation: {
      score: ctx.videoAutomation
        ? fitScore(30, ["video", "kdenlive", "ffmpeg", "media", "transcode"], 40)
        : 0,
      notes: ctx.videoAutomation ? "Limited video automation utility." : "Disabled.",
    },
    saasBusiness: {
      score: ctx.saasBusiness
        ? fitScore(35, ["saas", "business", "crm", "erp", "akaunting", "billing"], 35)
        : 0,
      notes: ctx.saasBusiness ? "Check for SaaS-reusable modules." : "Disabled.",
    },
    tradingFinance: {
      score: ctx.tradingFinance
        ? fitScore(25, ["trading", "broker", "stock", "finance", "quant", "backtest"], 40)
        : 0,
      notes: ctx.tradingFinance ? "Limited finance utility." : "Disabled.",
    },
  };

  const agentOs = projectFit.agentOs.score;
  const aiLegal = projectFit.aiLegalArmenia.score;
  const commercialRisk = licenseInfo.status === "SAFE"
    ? 10
    : licenseInfo.status === "WARNING"
      ? 40
      : licenseInfo.status === "HIGH_RISK"
        ? 80
        : 50;
  const securityScore = securityInfo.status === "SAFE" ? 85 : securityInfo.status === "REVIEW" ? 60 : 30;
  const cost = meta.gpuRequired ? 50 : 85;

  // ---------- Hardware-aware adjustment for my PC ----------
  // My PC: AMD Radeon RX 580 8 GB, no CUDA, 64 GB RAM, Windows 11.
  const lowerAll = (meta.description + " " + meta.readmeText.slice(0, 4000) + " " + meta.topics.join(" ")).toLowerCase();
  const cudaRequired = /\bcuda\b|cudnn|tensorrt|nvidia\s+gpu|ngc\s+nvidia|nvidia-docker/i.test(lowerAll) || meta.gpuRequired;
  const nvidiaOnly = /nvidia[\s-]only|requires\s+nvidia|nvidia\s+gpu\s+required/i.test(lowerAll);
  const ollamaCompatible = /\bollama\b|llama\.cpp|gguf|ggml/i.test(lowerAll);
  const cpuOnlyAvailable = /cpu[\s-]only|cpu[\s-]mode|cpu[\s-]inference|no\s+gpu\s+required/i.test(lowerAll);
  const amdOrRocm = /amd|radeon|rocm|directml|opencl/i.test(lowerAll);

  let adjustedCompatibility = compatibility;
  let localRunPossible = !meta.gpuRequired;
  let gpuRequired = meta.gpuRequired;
  let difficulty = meta.hasDocker ? ("LOW" as Difficulty) : (isPy || isJs ? ("MEDIUM" as Difficulty) : ("HIGH" as Difficulty));

  if (cudaRequired && !MY_PC_PROFILE.cudaAvailable && !amdOrRocm) {
    adjustedCompatibility = clamp(adjustedCompatibility - 25, 0, 100);
    localRunPossible = cpuOnlyAvailable; // only if CPU mode is documented
    gpuRequired = true;
    difficulty = "HIGH";
  }
  if (nvidiaOnly) {
    adjustedCompatibility = clamp(adjustedCompatibility - 15, 0, 100);
    localRunPossible = false;
  }
  if (ollamaCompatible) {
    adjustedCompatibility = clamp(adjustedCompatibility + 10, 0, 100);
  }
  if (cpuOnlyAvailable) {
    adjustedCompatibility = clamp(adjustedCompatibility + 10, 0, 100);
  }
  if (meta.hasDocker && MY_PC_PROFILE.dockerAvailable === null) {
    // Docker not yet configured — do not penalize too hard
    adjustedCompatibility = clamp(adjustedCompatibility - 5, 0, 100);
  }

  const finalPriority = clamp(
    Math.round(
      usefulness * 0.25 +
        health * 0.15 +
        adjustedCompatibility * 0.20 +
        agentOs * 0.15 +
        aiLegal * 0.15 +
        cost * 0.05 -
        commercialRisk * 0.05
    ),
    0,
    100
  );

  // ---------- Provider-aware verdict ----------
  // USE NOW only if runs locally without disallowed provider + no HIGH_RISK license.
  const runsLocally = localRunPossible || cpuOnlyAvailable || (meta.hasDocker && ollamaCompatible && !nvidiaOnly);
  const ollamaFallback = ollamaCompatible && (cudaRequired || nvidiaOnly || !localRunPossible);
  let verdict: Verdict;
  if (
    usefulness >= 80 &&
    health >= 65 &&
    licenseInfo.status !== "HIGH_RISK" &&
    runsLocally
  ) {
    verdict = "USE_NOW";
  } else if (
    usefulness >= 60 &&
    (runsLocally || ollamaFallback) &&
    licenseInfo.status !== "HIGH_RISK"
  ) {
    verdict = "TEST";
  } else if (usefulness >= 35 && (ollamaFallback || runsLocally)) {
    verdict = "SAVE";
  } else {
    verdict = "SKIP";
  }

  // ---------- Local run notes (provider-aware) ----------
  let localRunNotes = meta.hasDocker
    ? "Docker available — recommended for local run."
    : "No Docker detected; check README for manual install.";
  if (cudaRequired && !MY_PC_PROFILE.cudaAvailable && !amdOrRocm) {
    localRunNotes =
      "Repository requires NVIDIA CUDA but my GPU is AMD Radeon RX 580 2048SP (no CUDA). Local run is not viable without a CPU-only mode or Ollama Cloud fallback.";
  }
  if (ollamaFallback) {
    localRunNotes +=
      " Fallback via Ollama Cloud (the only allowed cloud provider) — pricing must be verified at https://ollama.com/cloud.";
  }
  if (nvidiaOnly) {
    localRunNotes = "Repository explicitly requires NVIDIA GPU — local run blocked on AMD Radeon RX 580.";
  }

  return {
    summary: meta.description || `${meta.fullName} — automated mock analysis`,
    problemSolved: `Mock heuristic analysis based on metadata signals (stars, license, language, README length, my PC profile, cloud provider policy).`,
    bestUseCases: [
      isPy ? "Python module integration" : null,
      isJs ? "Node.js / front-end integration" : null,
      meta.hasDocker ? "Docker-based local deployment" : null,
      meta.hasDockerCompose ? "Multi-service deployment" : null,
      ollamaCompatible ? "Ollama / llama.cpp compatible — can use Ollama Cloud fallback" : null,
    ].filter(Boolean) as string[],
    projectFit,
    localRun: {
      possible: localRunPossible,
      gpuRequired: Boolean(gpuRequired),
      difficulty,
      notes: localRunNotes,
    },
    commercialRisk: {
      status: licenseInfo.status,
      notes: licenseInfo.notes,
    },
    security: {
      status: securityInfo.status,
      notes: securityInfo.notes,
    },
    cost: {
      status: ollamaFallback
        ? "MEDIUM_COST"
        : meta.gpuRequired
          ? "MEDIUM_COST"
          : "FREE_OR_LOW_COST",
      notes: ollamaFallback
        ? `Ollama Cloud fallback required. ${PRICING_NOTE}`
        : meta.gpuRequired
          ? "GPU required — but my PC has AMD GPU without CUDA; may need Ollama Cloud fallback."
          : "Free local execution likely possible.",
    },
    extractedIdeas: [
      meta.hasDocker ? "Dockerfile patterns reusable" : null,
      meta.hasPackageJson ? "Node.js package structure" : null,
      meta.hasPyproject ? "Python packaging patterns" : null,
      meta.topics.length > 0 ? `Topic taxonomy: ${meta.topics.slice(0, 5).join(", ")}` : null,
      cudaRequired && !MY_PC_PROFILE.cudaAvailable ? "Architecture ideas only — cannot run locally without CUDA" : null,
    ].filter(Boolean) as string[],
    testPlan: {
      fifteenMinutes: [
        `git clone ${meta.githubUrl}.git`,
        "Inspect README and project structure",
        "Verify prerequisites in README",
        cudaRequired && !MY_PC_PROFILE.cudaAvailable
          ? "Check for CPU-only mode or Ollama Cloud compatibility"
          : "Verify Docker / Python / Node availability",
      ],
      thirtyMinutes: [
        meta.hasDocker && !cudaRequired
          ? "Run docker-compose up"
          : ollamaFallback
            ? "Try Ollama Cloud endpoint with a small model"
            : "Install dependencies and start service",
        "Start the service",
        "Hit the health endpoint or open UI",
      ],
      sixtyMinutes: [
        "Run test suite",
        "Inspect source for reusable modules",
        "Document integration plan",
        ollamaFallback ? "Estimate Ollama Cloud cost for production use" : "Plan production deployment",
      ],
    },
    scores: {
      usefulness,
      health,
      compatibility: adjustedCompatibility,
      commercialRisk,
      agentOs,
      aiLegal,
      security: securityScore,
      cost,
      finalPriority,
    },
    verdict,
    nextAction:
      verdict === "USE_NOW"
        ? `Clone and integrate ${meta.fullName} into your project. Local run viable on your PC.`
        : verdict === "TEST"
          ? ollamaFallback
            ? `Test via Ollama Cloud fallback. ${PRICING_NOTE}`
            : "Run the 15-minute test plan to verify utility."
          : verdict === "SAVE"
            ? ollamaFallback
              ? `Save — only viable via Ollama Cloud. ${PRICING_NOTE}`
              : "Bookmark for later evaluation."
            : cudaRequired && !MY_PC_PROFILE.cudaAvailable && !ollamaFallback
              ? "Skip — CUDA required, no Ollama Cloud fallback, no allowed cloud provider is suitable."
              : "Skip — does not fit current priorities.",
    mock: true,
  };
}

function mockInstallPlan(meta: RepoMetadata): InstallPlanData {
  const dockerFirst = meta.hasDocker || meta.hasDockerCompose;
  return {
    prerequisites: [
      `git`,
      meta.hasDocker ? "Docker 24+" : null,
      meta.hasDockerCompose ? "Docker Compose v2" : null,
      meta.hasPyproject || meta.hasRequirements ? "Python 3.10+" : null,
      meta.hasPackageJson ? "Node.js 20+" : null,
    ].filter(Boolean) as string[],
    dockerCommands: dockerFirst
      ? [
          `git clone ${meta.githubUrl}.git`,
          `cd ${meta.name}`,
          meta.hasDockerCompose ? "docker compose up -d" : "docker build -t " + meta.name + " .",
          meta.hasDockerCompose ? "docker compose logs -f" : "docker run -p 8000:8000 " + meta.name,
        ]
      : [],
    manualCommands: dockerFirst
      ? []
      : [
          `git clone ${meta.githubUrl}.git`,
          `cd ${meta.name}`,
          meta.hasPackageJson ? "npm install" : meta.hasPyproject ? "pip install -e ." : meta.hasRequirements ? "pip install -r requirements.txt" : "see README",
          meta.hasPackageJson ? "npm run dev" : meta.hasPyproject ? "python -m " + meta.name : "see README",
        ],
    envVars: meta.hasEnvExample
      ? [{ key: "see .env.example", description: "Copy .env.example to .env and fill in values", required: true }]
      : [],
    verificationSteps: [
      "Service starts without errors",
      "Health endpoint responds 200",
      "Logs show no fatal errors",
    ],
    commonErrors: [
      "Missing env vars — copy .env.example",
      "Port already in use — change in config",
      "Dependency version mismatch",
    ],
    cleanupSteps: [
      dockerFirst ? "docker compose down -v" : "rm -rf node_modules .venv __pycache__",
      "Delete the cloned directory",
    ],
  };
}

// Convenience exports
export const aiService = {
  getProvider: getAiProvider,
  analyze: (meta: RepoMetadata, ctx: ProjectContextFlags) => getAiProvider().analyze(meta, ctx),
  generateInstallPlan: (meta: RepoMetadata, analysis: RepoAnalysisResult) =>
    getAiProvider().generateInstallPlan(meta, analysis),
  isMock: () => !isAiConfigured(),
};
