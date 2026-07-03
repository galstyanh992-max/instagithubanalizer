// AI Jarwisyan — seed script
// Run: bun run prisma/seed.ts

import { db } from "../src/lib/db";
import { SEED_REPOS } from "../src/lib/constants";

interface SeedSpec {
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  license: string;
  primaryLanguage: string;
  topics: string[];
  hasDocker: boolean;
  hasDockerCompose: boolean;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasPyproject: boolean;
  hasEnvExample: boolean;
  gpuRequired: boolean;
  difficulty: "LOW" | "MEDIUM" | "HIGH";
  readmeSnippet: string;
  verdict: "USE_NOW" | "TEST" | "SAVE" | "SKIP";
  watchlist?: boolean;
}

const SPECS: Record<string, SeedSpec> = {
  "docling-project/docling": {
    fullName: "docling-project/docling",
    description: "Get your documents ready for generative AI",
    stars: 18500,
    forks: 950,
    license: "mit",
    primaryLanguage: "Python",
    topics: ["pdf", "ocr", "rag", "document-parsing", "table-extraction"],
    hasDocker: true,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: true,
    hasEnvExample: false,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "Docling simplifies document processing, parsing PDFs, DOCX, PPTX, HTML and more into a unified representation for downstream tasks like RAG.",
    verdict: "USE_NOW",
    watchlist: true,
  },
  "firecrawl/firecrawl": {
    fullName: "firecrawl/firecrawl",
    description: "Turn entire websites into LLM-ready markdown",
    stars: 21500,
    forks: 1700,
    license: "agpl-3.0",
    primaryLanguage: "TypeScript",
    topics: ["web-scraping", "rag", "crawl", "markdown", "llm"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: true,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "MEDIUM",
    readmeSnippet: "Firecrawl crawls entire websites and converts pages to clean markdown for LLM ingestion. Self-hostable; AGPL — commercial use requires review.",
    verdict: "TEST",
  },
  "unclecode/crawl4ai": {
    fullName: "unclecode/crawl4ai",
    description: "Open-source LLM-friendly web crawler & scraper",
    stars: 27500,
    forks: 2100,
    license: "apache-2.0",
    primaryLanguage: "Python",
    topics: ["crawler", "scraper", "rag", "llm", "web-scraping"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: true,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "Crawl4AI is a powerful, free LLM-friendly web crawler and scraper. Apache-2.0 license — commercial-safe.",
    verdict: "USE_NOW",
    watchlist: true,
  },
  "paperless-ngx/paperless-ngx": {
    fullName: "paperless-ngx/paperless-ngx",
    description: "A community-supported supercharged version of paperless",
    stars: 24500,
    forks: 1500,
    license: "gpl-3.0",
    primaryLanguage: "Python",
    topics: ["document-management", "ocr", "scan", "archive"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "Paperless-ngx is a document management system that transforms physical documents into a searchable online archive with OCR.",
    verdict: "TEST",
  },
  "OpenHands/OpenHands": {
    fullName: "OpenHands/OpenHands",
    description: "OpenHands: Code Less, Build More",
    stars: 42500,
    forks: 4700,
    license: "mit",
    primaryLanguage: "Python",
    topics: ["agent", "ai", "coding-agent", "automation"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: true,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "MEDIUM",
    readmeSnippet: "OpenHands is a platform for autonomous software agents — writes code, runs commands, browses the web. MIT license.",
    verdict: "USE_NOW",
    watchlist: true,
  },
  "mem0ai/mem0": {
    fullName: "mem0ai/mem0",
    description: "The Memory layer for AI Applications",
    stars: 23500,
    forks: 2050,
    license: "apache-2.0",
    primaryLanguage: "Python",
    topics: ["memory", "llm", "agent", "long-term-memory"],
    hasDocker: false,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: true,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "mem0 provides long-term memory primitives for LLM agents. Apache-2.0 — safe for commercial use.",
    verdict: "USE_NOW",
  },
  "KDE/kdenlive": {
    fullName: "KDE/kdenlive",
    description: "Free and open source video editor, based on MLT Framework",
    stars: 2750,
    forks: 350,
    license: "gpl-3.0",
    primaryLanguage: "C++",
    topics: ["video", "editor", "kde", "mlt"],
    hasDocker: false,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: false,
    gpuRequired: false,
    difficulty: "HIGH",
    readmeSnippet: "KDE Kdenlive is a multi-track video editor. C++ codebase; GPL-3.0. Useful for AI video automation ideas, not for direct integration.",
    verdict: "SAVE",
  },
  "duplicati/duplicati": {
    fullName: "duplicati/duplicati",
    description: "Store securely encrypted backups in the cloud",
    stars: 12500,
    forks: 850,
    license: "lgpl-3.0",
    primaryLanguage: "C#",
    topics: ["backup", "encryption", "cloud"],
    hasDocker: true,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: false,
    gpuRequired: false,
    difficulty: "MEDIUM",
    readmeSnippet: "Duplicati is a backup client that securely stores encrypted, incremental, compressed backups on cloud storage services.",
    verdict: "SAVE",
  },
  "akaunting/akaunting": {
    fullName: "akaunting/akaunting",
    description: "Online accounting software for small businesses and freelancers",
    stars: 8500,
    forks: 2300,
    license: "gpl-3.0",
    primaryLanguage: "PHP",
    topics: ["accounting", "billing", "business", "erp"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "MEDIUM",
    readmeSnippet: "Akaunting is a free, open-source, online accounting software designed for small businesses and freelancers.",
    verdict: "SAVE",
  },
  "QwenLM/Qwen3-TTS": {
    fullName: "QwenLM/Qwen3-TTS",
    description: "Qwen3-TTS: A multilingual text-to-speech model requiring CUDA GPU",
    stars: 1850,
    forks: 120,
    license: "apache-2.0",
    primaryLanguage: "Python",
    topics: ["tts", "voice", "speech", "llm", "multilingual", "cuda"],
    hasDocker: false,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: false,
    hasEnvExample: false,
    gpuRequired: true,
    difficulty: "HIGH",
    readmeSnippet: "Qwen3-TTS is a multilingual text-to-speech model requiring NVIDIA CUDA GPU for inference. AMD Radeon RX 580 (no CUDA) cannot run this locally — Ollama Cloud is not a fit for TTS. Skip or save for architecture ideas only.",
    verdict: "SAVE",
  },
  "jina-ai/reader": {
    fullName: "jina-ai/reader",
    description: "Convert any URL to an LLM-friendly input with a simple prefix",
    stars: 7800,
    forks: 550,
    license: "apache-2.0",
    primaryLanguage: "Python",
    topics: ["reader", "rag", "llm", "scraping"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "Jina Reader converts any URL into clean markdown optimized for LLM RAG pipelines. Apache-2.0.",
    verdict: "USE_NOW",
  },
  "QuivrHQ/MegaParse": {
    fullName: "QuivrHQ/MegaParse",
    description: "File Parser optimised for LLM Ingestion",
    stars: 5500,
    forks: 280,
    license: "apache-2.0",
    primaryLanguage: "Python",
    topics: ["parser", "pdf", "rag", "ocr", "table"],
    hasDocker: false,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: true,
    hasPyproject: true,
    hasEnvExample: false,
    gpuRequired: false,
    difficulty: "LOW",
    readmeSnippet: "MegaParse is a file parser optimized for LLM ingestion — handles PDFs, tables, code. Apache-2.0.",
    verdict: "USE_NOW",
  },
  "trailbaseio/trailbase": {
    fullName: "trailbaseio/trailbase",
    description: "A blazingly fast, open-source application backend",
    stars: 1850,
    forks: 75,
    license: "apache-2.0",
    primaryLanguage: "Rust",
    topics: ["backend", "database", "api", "baas"],
    hasDocker: true,
    hasDockerCompose: false,
    hasPackageJson: false,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "MEDIUM",
    readmeSnippet: "TrailBase is a fast, open-source application backend with built-in DB, auth, REST/GraphQL. Rust.",
    verdict: "TEST",
  },
  "ubicloud/ubicloud": {
    fullName: "ubicloud/ubicloud",
    description: "Open, free, and portable cloud",
    stars: 4200,
    forks: 180,
    license: "agpl-3.0",
    primaryLanguage: "Ruby",
    topics: ["cloud", "iaas", "infrastructure"],
    hasDocker: true,
    hasDockerCompose: true,
    hasPackageJson: false,
    hasRequirements: false,
    hasPyproject: false,
    hasEnvExample: true,
    gpuRequired: false,
    difficulty: "HIGH",
    readmeSnippet: "Ubicloud is an open-source cloud alternative — runs on bare metal providers. AGPL — commercial review needed.",
    verdict: "SAVE",
  },
};

function computeHeuristicScore(spec: SeedSpec): {
  usefulness: number; health: number; compatibility: number; commercialRisk: number;
  agentOs: number; aiLegal: number; security: number; cost: number; finalPriority: number;
} {
  const usefulness = Math.min(100, 40 + (spec.stars > 1000 ? 20 : 0) + (spec.readmeSnippet.length > 100 ? 15 : 0) + (spec.license === "mit" || spec.license === "apache-2.0" ? 10 : 0));
  const health = Math.min(100, 40 + (spec.stars > 500 ? 15 : 0) + 25);
  const compatibility = Math.min(100, 50 + (spec.hasDocker ? 20 : 0) + (spec.hasEnvExample ? 10 : 0) + (spec.primaryLanguage === "Python" || spec.primaryLanguage === "TypeScript" ? 15 : 0));
  const commercialRisk = spec.license === "agpl-3.0" ? 80 : spec.license === "gpl-3.0" ? 40 : spec.license === "lgpl-3.0" ? 35 : 10;
  const agentOs = spec.topics.includes("agent") || spec.topics.includes("automation") ? 85 : 30;
  const aiLegal = spec.topics.includes("ocr") || spec.topics.includes("pdf") || spec.topics.includes("parser") ? 85 : 25;
  const security = 75;
  const cost = spec.gpuRequired ? 50 : 85;
  const finalPriority = Math.max(0, Math.min(100, Math.round(usefulness * 0.30 + health * 0.20 + compatibility * 0.15 + agentOs * 0.15 + aiLegal * 0.15 - commercialRisk * 0.05)));
  return { usefulness, health, compatibility, commercialRisk, agentOs, aiLegal, security, cost, finalPriority };
}

function classify(license: string): "SAFE" | "WARNING" | "HIGH_RISK" | "UNKNOWN" {
  if (["mit", "apache-2.0", "bsd", "unlicense"].includes(license)) return "SAFE";
  if (["mpl-2.0", "lgpl-3.0", "gpl-3.0"].includes(license)) return "WARNING";
  if (["agpl-3.0", "no-license", "none"].includes(license)) return "HIGH_RISK";
  return "UNKNOWN";
}

async function seed() {
  console.log("🚀 Seeding AI Jarwisyan database...");

  // 1. Settings singleton — pre-fill with My PC profile (Windows 11 + AMD GPU)
  await db.setting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      // PC profile (per spec)
      pcProfileName: "Main Windows Workstation",
      pcSystemType: "64-bit OS, x64-based processor",
      pcCpuNotes: "high-core-count Xeon workstation CPU",
      pcStorageTotalGb: 704,
      pcStorageUsedGb: 369,
      pcCudaNotes: "CUDA is not available because GPU is AMD Radeon RX 580, not NVIDIA.",
      pcRocmAvailable: false,
      pcPreferredRunMode: "local_or_docker_when_possible",
      pcFallbackRunMode: "ollama_cloud_if_local_not_possible",
      cloudProvider: "ollama_cloud",
      allowedCloudProviders: "ollama_cloud",
      language: "ru",
      // legacy PC fields
      cpu: "Intel Xeon E5-2699 v3 @ 2.30GHz",
      ram: "64",
      gpu: "AMD Radeon RX 580 2048SP",
      vram: "8",
      os: "Windows 11 Pro 23H2",
      freeDiskGb: 335,
      dockerAvailable: false,
      cudaAvailable: false,
    },
    update: {
      pcProfileName: "Main Windows Workstation",
      pcSystemType: "64-bit OS, x64-based processor",
      pcCpuNotes: "high-core-count Xeon workstation CPU",
      pcStorageTotalGb: 704,
      pcStorageUsedGb: 369,
      pcCudaNotes: "CUDA is not available because GPU is AMD Radeon RX 580, not NVIDIA.",
      pcRocmAvailable: false,
      pcPreferredRunMode: "local_or_docker_when_possible",
      pcFallbackRunMode: "ollama_cloud_if_local_not_possible",
      cloudProvider: "ollama_cloud",
      allowedCloudProviders: "ollama_cloud",
      cpu: "Intel Xeon E5-2699 v3 @ 2.30GHz",
      ram: "64",
      gpu: "AMD Radeon RX 580 2048SP",
      vram: "8",
      os: "Windows 11 Pro 23H2",
      freeDiskGb: 335,
      dockerAvailable: false,
      cudaAvailable: false,
    },
  });
  console.log("✓ Settings singleton (PC profile + Ollama Cloud policy)");

  // 2. Repositories
  for (const fullName of SEED_REPOS) {
    const spec = SPECS[fullName];
    if (!spec) {
      console.warn(`No spec for ${fullName}, skipping`);
      continue;
    }
    const [owner, name] = fullName.split("/");
    const scores = computeHeuristicScore(spec);
    const commercialUseStatus = classify(spec.license);

    const readmeText = `# ${name}\n\n${spec.readmeSnippet}\n\n## Topics\n${spec.topics.map((t) => `- ${t}`).join("\n")}\n\n## Install\nSee GitHub for details.\n`;

    const existing = await db.repository.findUnique({ where: { fullName: fullName.toLowerCase() } });
    if (existing) {
      await db.repository.update({
        where: { id: existing.id },
        data: {
          owner, name,
          githubUrl: `https://github.com/${fullName}`,
          description: spec.description,
          stars: spec.stars,
          forks: spec.forks,
          watchers: Math.floor(spec.forks / 3),
          openIssues: Math.floor(spec.stars / 100),
          license: spec.license,
          primaryLanguage: spec.primaryLanguage,
          topics: JSON.stringify(spec.topics),
          createdAtGithub: new Date("2022-01-01"),
          updatedAtGithub: new Date(),
          pushedAtGithub: new Date(),
          archived: false,
          disabled: false,
          defaultBranch: "main",
          readmeText,
          hasDocker: spec.hasDocker,
          hasDockerCompose: spec.hasDockerCompose,
          hasPackageJson: spec.hasPackageJson,
          hasRequirements: spec.hasRequirements,
          hasPyproject: spec.hasPyproject,
          hasEnvExample: spec.hasEnvExample,
          localRunPossible: !spec.gpuRequired,
          gpuRequired: spec.gpuRequired,
          difficulty: spec.difficulty,
          usefulnessScore: scores.usefulness,
          healthScore: scores.health,
          compatibilityScore: scores.compatibility,
          commercialRiskScore: scores.commercialRisk,
          agentOsScore: scores.agentOs,
          aiLegalScore: scores.aiLegal,
          securityScore: scores.security,
          costScore: scores.cost,
          finalPriorityScore: scores.finalPriority,
          verdict: spec.verdict,
          securityStatus: "SAFE",
          securityNotes: JSON.stringify(["No suspicious patterns detected in README."]),
          commercialUseStatus,
          commercialNotes: `${commercialUseStatus} license: ${spec.license}.`,
          costNotes: spec.gpuRequired ? "GPU required — possible cloud cost." : "Free local execution likely possible.",
          isWatchlisted: Boolean(spec.watchlist),
          lastCheckedAt: new Date(),
        },
      });
    } else {
      await db.repository.create({
        data: {
          owner, name,
          fullName: fullName.toLowerCase(),
          githubUrl: `https://github.com/${fullName}`,
          description: spec.description,
          stars: spec.stars,
          forks: spec.forks,
          watchers: Math.floor(spec.forks / 3),
          openIssues: Math.floor(spec.stars / 100),
          license: spec.license,
          primaryLanguage: spec.primaryLanguage,
          topics: JSON.stringify(spec.topics),
          createdAtGithub: new Date("2022-01-01"),
          updatedAtGithub: new Date(),
          pushedAtGithub: new Date(),
          archived: false,
          disabled: false,
          defaultBranch: "main",
          readmeText,
          hasDocker: spec.hasDocker,
          hasDockerCompose: spec.hasDockerCompose,
          hasPackageJson: spec.hasPackageJson,
          hasRequirements: spec.hasRequirements,
          hasPyproject: spec.hasPyproject,
          hasEnvExample: spec.hasEnvExample,
          localRunPossible: !spec.gpuRequired,
          gpuRequired: spec.gpuRequired,
          difficulty: spec.difficulty,
          usefulnessScore: scores.usefulness,
          healthScore: scores.health,
          compatibilityScore: scores.compatibility,
          commercialRiskScore: scores.commercialRisk,
          agentOsScore: scores.agentOs,
          aiLegalScore: scores.aiLegal,
          securityScore: scores.security,
          costScore: scores.cost,
          finalPriorityScore: scores.finalPriority,
          verdict: spec.verdict,
          securityStatus: "SAFE",
          securityNotes: JSON.stringify(["No suspicious patterns detected in README."]),
          commercialUseStatus,
          commercialNotes: `${commercialUseStatus} license: ${spec.license}.`,
          costNotes: spec.gpuRequired ? "GPU required — possible cloud cost." : "Free local execution likely possible.",
          isWatchlisted: Boolean(spec.watchlist),
          lastCheckedAt: new Date(),
        },
      });
    }
    console.log(`✓ ${fullName} — verdict ${spec.verdict}, score ${scores.finalPriority}`);
  }

  console.log("✅ Seed complete");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
