// AI Jarwisyan — constants

import type { Verdict, Difficulty, CommercialStatus, RunMode } from "./types";

export const VERDICTS: Verdict[] = ["USE_NOW", "TEST", "SAVE", "SKIP"];

export const VERDICT_META: Record<
  Verdict,
  { label: string; color: string; bg: string; border: string; icon: string; description: string }
> = {
  USE_NOW: {
    label: "USE NOW",
    color: "text-lime-300",
    bg: "bg-lime-500/10",
    border: "border-lime-400/50",
    icon: "rocket",
    description: "usefulness ≥ 80, health ≥ 65, no high commercial risk, runs locally/docker/CPU-only, no disallowed provider",
  },
  TEST: {
    label: "TEST",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-400/50",
    icon: "flask-conical",
    description: "high or medium usefulness, runs locally with limits OR has Ollama Cloud fallback",
  },
  SAVE: {
    label: "SAVE",
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-400/50",
    icon: "bookmark",
    description: "useful idea but my PC is weak; only Ollama Cloud fallback; not urgent",
  },
  SKIP: {
    label: "SKIP",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/50",
    icon: "x-circle",
    description: "no local run, Ollama Cloud unsuitable, disallowed provider required, high risk, no license, dead repo",
  },
};

export const DIFFICULTIES: Difficulty[] = ["LOW", "MEDIUM", "HIGH"];

export const COMMERCIAL_STATUSES: CommercialStatus[] = [
  "SAFE",
  "WARNING",
  "HIGH_RISK",
  "UNKNOWN",
];

export const COMMERCIAL_META: Record<
  CommercialStatus,
  { label: string; color: string; bg: string }
> = {
  SAFE: { label: "SAFE", color: "text-lime-300", bg: "bg-lime-500/10" },
  WARNING: { label: "WARNING", color: "text-amber-300", bg: "bg-amber-500/10" },
  HIGH_RISK: { label: "HIGH RISK", color: "text-red-300", bg: "bg-red-500/10" },
  UNKNOWN: { label: "UNKNOWN", color: "text-zinc-300", bg: "bg-zinc-500/10" },
};

export const LICENSE_MAP: Record<
  string,
  { status: CommercialStatus; label: string }
> = {
  mit: { status: "SAFE", label: "MIT" },
  "apache-2.0": { status: "SAFE", label: "Apache-2.0" },
  apache: { status: "SAFE", label: "Apache-2.0" },
  bsd: { status: "SAFE", label: "BSD" },
  "bsd-2-clause": { status: "SAFE", label: "BSD-2-Clause" },
  "bsd-3-clause": { status: "SAFE", label: "BSD-3-Clause" },
  mpl: { status: "WARNING", label: "MPL" },
  "mpl-2.0": { status: "WARNING", label: "MPL-2.0" },
  lgpl: { status: "WARNING", label: "LGPL" },
  "lgpl-2.1": { status: "WARNING", label: "LGPL-2.1" },
  "lgpl-3.0": { status: "WARNING", label: "LGPL-3.0" },
  gpl: { status: "WARNING", label: "GPL" },
  "gpl-2.0": { status: "WARNING", label: "GPL-2.0" },
  "gpl-3.0": { status: "WARNING", label: "GPL-3.0" },
  agpl: { status: "HIGH_RISK", label: "AGPL" },
  "agpl-3.0": { status: "HIGH_RISK", label: "AGPL-3.0" },
  "no-license": { status: "HIGH_RISK", label: "No License" },
  none: { status: "HIGH_RISK", label: "No License" },
  unknown: { status: "UNKNOWN", label: "Unknown" },
  other: { status: "UNKNOWN", label: "Other" },
  unlicense: { status: "SAFE", label: "Unlicense" },
  cc0: { status: "SAFE", label: "CC0" },
  "cc-by-4.0": { status: "SAFE", label: "CC-BY-4.0" },
  "cc-by-sa-4.0": { status: "WARNING", label: "CC-BY-SA-4.0" },
};

export const DEFAULT_LICENSE_NOTE =
  "Preliminary license risk analysis — not legal advice. Verify with a lawyer before commercial use.";

export const SEED_REPOS = [
  "docling-project/docling",
  "firecrawl/firecrawl",
  "unclecode/crawl4ai",
  "paperless-ngx/paperless-ngx",
  "OpenHands/OpenHands",
  "mem0ai/mem0",
  "KDE/kdenlive",
  "duplicati/duplicati",
  "akaunting/akaunting",
  "QwenLM/Qwen3-TTS",
  "jina-ai/reader",
  "QuivrHQ/MegaParse",
  "trailbaseio/trailbase",
  "ubicloud/ubicloud",
];

export const NAV_GROUPS = [
  { label: "Главное", items: ["/", "/dashboard", "/projects", "/memory"] },
  { label: "Система Агентов", items: ["/agents", "/workflows", "/departments", "/approvals"] },
  { label: "Анализ", items: ["/upload", "/repos", "/compare", "/board"] },
  { label: "Управление", items: ["/watchlist", "/manual-review", "/categories"] },
  { label: "Настройки", items: ["/voice", "/settings", "/deploy"] },
];

export const NAV_ITEMS = [
  { href: "/", label: "Главная", icon: "Home" },
  { href: "/dashboard", label: "Панель", icon: "LayoutDashboard" },
  { href: "/agents", label: "Агенты", icon: "UserCog" },
  { href: "/workflows", label: "Процессы", icon: "GitMerge" },
  { href: "/approvals", label: "Подтверждения", icon: "CheckSquare" },
  { href: "/projects", label: "Проекты", icon: "Wrench" },
  { href: "/memory", label: "Память", icon: "Brain" },
  { href: "/upload", label: "Загрузка", icon: "Upload" },
  { href: "/repos", label: "Репозитории", icon: "FolderGit2" },
  { href: "/compare", label: "Сравнение", icon: "Swords" },
  { href: "/board", label: "Доска", icon: "Trello" },
  { href: "/watchlist", label: "Избранное", icon: "Eye" },
  { href: "/manual-review", label: "Ручная проверка", icon: "ClipboardCheck" },
  { href: "/categories", label: "Категории", icon: "Tags" },
  { href: "/voice", label: "Голос", icon: "Mic" },
  { href: "/settings", label: "Настройки", icon: "Settings" },
  { href: "/deploy", label: "Деплой", icon: "Rocket" },
  { href: "/departments", label: "Департаменты", icon: "Users" },
];

export const AI_PROVIDERS = [
  { value: "glm", label: "GLM 5.2 (z.ai)", requiresKey: true },
  { value: "mock", label: "Mock (no API key)", requiresKey: false },
];

export const SCORE_WEIGHTS = {
  usefulness: 0.25,
  health: 0.15,
  compatibility: 0.20,
  agentOs: 0.15,
  aiLegal: 0.15,
  cost: 0.05,
  commercialRisk: -0.05,
};

// ============================================================
// My PC profile (default — used by compatibility service)
// ============================================================
export const MY_PC_PROFILE = {
  profileName: "Main Windows Workstation",
  os: "Windows 11 Pro 23H2",
  systemType: "64-bit OS, x64-based processor",
  cpu: "Intel Xeon E5-2699 v3 @ 2.30GHz",
  cpuCoresHint: "high-core-count Xeon workstation CPU",
  ramGb: 64,
  gpu: "AMD Radeon RX 580 2048SP",
  vramGb: 8,
  storageTotalGb: 704,
  storageUsedGb: 369,
  storageFreeGb: 335,
  dockerAvailable: null as boolean | null,
  pythonVersion: null as string | null,
  nodeVersion: null as string | null,
  gitAvailable: null as boolean | null,
  cudaAvailable: false,
  cudaNotes: "CUDA is not available because GPU is AMD Radeon RX 580, not NVIDIA.",
  rocmAvailable: null as boolean | null,
  preferredRunMode: "local_or_docker_when_possible",
  fallbackRunMode: "ollama_cloud_if_local_not_possible",
} as const;

// ============================================================
// Cloud provider policy — ONLY Ollama Cloud is allowed
// ============================================================
export const CLOUD_PROVIDER_POLICY = {
  allowedProviders: ["ollama_cloud"] as const,
  defaultProvider: "ollama_cloud" as const,
  providerDisplayName: {
    ollama_cloud: "Ollama Cloud",
  },
  disallowedProviders: [
    "runpod", "vast_ai", "lambda_cloud", "paperspace",
    "google_colab", "kaggle", "aws", "google_cloud", "azure",
    "huggingface_spaces", "modal", "replicate",
    "digitalocean", "railway", "render", "fly_io",
  ],
  rule: "Never suggest, display, price, rank, link, or recommend any cloud provider except Ollama Cloud.",
} as const;

export const ALLOWED_CLOUD_PROVIDERS = CLOUD_PROVIDER_POLICY.allowedProviders;
export const DEFAULT_CLOUD_PROVIDER = CLOUD_PROVIDER_POLICY.defaultProvider;

export const OLLAMA_CLOUD_PROVIDER = {
  id: "ollama_cloud",
  name: "Ollama Cloud",
  type: "cloud_ai_runtime",
  pricingStatus: "verify_current_pricing",
  pricingNote:
    "Pricing changes often. Verify current pricing on the official Ollama Cloud website before spending money.",
  allowed: true,
} as const;

// Recommended run modes (extended set per new spec)
export const RECOMMENDED_RUN_MODES: RunMode[] = [
  "local", "local_cpu_only", "local_docker", "local_directml",
  "local_rocm_if_available", "ollama_cloud", "skip_local",
];

// GitHub alternative search query templates
export const GITHUB_ALTERNATIVE_QUERY_TEMPLATES = [
  "{purpose} CPU only GitHub",
  "{purpose} no CUDA GitHub",
  "{purpose} lightweight GitHub",
  "{purpose} Docker GitHub",
  "{purpose} Windows GitHub",
  "{purpose} Ollama compatible GitHub",
  "{purpose} local first GitHub",
  "{purpose} alternative open source",
];

// Pricing status values
export type PricingStatus = "approximate" | "unknown" | "requires_live_check";

export const PRICING_NOTE =
  "Pricing changes often. Verify current pricing on the official Ollama Cloud website before spending money.";
