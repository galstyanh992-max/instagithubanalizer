// AI Jarwisyan — shared types

export type Verdict = "USE_NOW" | "TEST" | "SAVE" | "SKIP";
export type Difficulty = "LOW" | "MEDIUM" | "HIGH";
export type SecurityStatus = "SAFE" | "REVIEW" | "RISK";
export type CommercialStatus = "SAFE" | "WARNING" | "HIGH_RISK" | "UNKNOWN";
export type RunMode =
  | "local"
  | "local_cpu_only"
  | "local_docker"
  | "local_directml"
  | "local_rocm_if_available"
  | "ollama_cloud"
  | "skip_local";
export type AiProvider = "glm" | "openai" | "gemini" | "claude" | "openrouter" | "local" | "mock";
export type PricingStatus = "approximate" | "unknown" | "requires_live_check";
export type EstimatedLocalPerformance = "FAST" | "OK" | "SLOW" | "VERY_SLOW" | "NOT_RECOMMENDED";

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  githubUrl: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  license: string;
  primaryLanguage: string;
  topics: string[];
  createdAtGithub: string | null;
  updatedAtGithub: string | null;
  pushedAtGithub: string | null;
  archived: boolean;
  disabled: boolean;
  defaultBranch: string;
  readmeText: string;
  hasDocker: boolean;
  hasDockerCompose: boolean;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasPyproject: boolean;
  hasEnvExample: boolean;
  gpuRequired?: boolean;
  mock?: boolean;
}

export interface ProjectFitItem {
  score: number;
  notes: string;
}

export interface ProjectFit {
  agentOs: ProjectFitItem;
  aiLegalArmenia: ProjectFitItem;
  ragOcr: ProjectFitItem;
  videoAutomation: ProjectFitItem;
  saasBusiness: ProjectFitItem;
  tradingFinance: ProjectFitItem;
}

export interface ProjectContext {
  projectAgentOs: boolean;
  projectAiLegal: boolean;
  projectRagOcr: boolean;
  projectVideo: boolean;
  projectSaas: boolean;
  projectTrading: boolean;
}

export interface LocalRunInfo {
  possible: boolean;
  gpuRequired: boolean;
  difficulty: Difficulty;
  notes: string;
}

export interface SecurityInfo {
  status: SecurityStatus;
  notes: string[];
}

export interface CommercialRiskInfo {
  status: CommercialStatus;
  notes: string;
}

export interface CostInfo {
  status: "FREE_OR_LOW_COST" | "MEDIUM_COST" | "HIGH_COST" | "UNKNOWN";
  notes: string;
}

export interface TestPlan {
  fifteenMinutes: string[];
  thirtyMinutes: string[];
  sixtyMinutes: string[];
}

export interface ScoreSet {
  usefulness: number;
  health: number;
  compatibility: number;
  commercialRisk: number;
  agentOs: number;
  aiLegal: number;
  security: number;
  cost: number;
  finalPriority: number;
}

export interface RepoAnalysisResult {
  summary: string;
  problemSolved: string;
  bestUseCases: string[];
  projectFit: ProjectFit;
  localRun: LocalRunInfo;
  commercialRisk: CommercialRiskInfo;
  security: SecurityInfo;
  cost: CostInfo;
  extractedIdeas: string[];
  testPlan: TestPlan;
  scores: ScoreSet;
  verdict: Verdict;
  nextAction: string;
  mock?: boolean;
}

export interface CompatibilityResult {
  canRunLocally: boolean;
  compatibilityScore: number;
  recommendedRunMode: RunMode;
  bottlenecks: string[];
  missingDependencies: string[];
  hardwareRisks: string[];
  softwareRisks: string[];
  providerPolicy: {
    allowedProviders: readonly ["ollama_cloud"];
    selectedProvider: "ollama_cloud";
    otherProvidersDisabled: true;
  };
  estimatedLocalPerformance: EstimatedLocalPerformance;
  explanation: string;
  /** legacy aliases kept for backward compat with older code */
  missingDeps?: string[];
}

export interface LicenseClassification {
  status: CommercialStatus;
  notes: string;
  recommendation: string;
}

export interface PcSpecs {
  cpu: string;
  ram: string;
  gpu: string;
  vram: string;
  os: string;
  freeDiskGb: number;
  dockerAvailable: boolean;
  pythonVersion: string;
  nodeVersion: string;
  gitAvailable: boolean;
  cudaAvailable: boolean;
}

// ============================================================
// New: expanded PC profile per spec
// ============================================================
export interface MyPcProfile {
  profileName: string;
  os: string;
  systemType: string;
  cpu: string;
  cpuCoresHint: string;
  ramGb: number;
  gpu: string;
  vramGb: number;
  storageTotalGb: number;
  storageUsedGb: number;
  storageFreeGb: number;
  dockerAvailable: boolean | null;
  pythonVersion: string | null;
  nodeVersion: string | null;
  gitAvailable: boolean | null;
  cudaAvailable: boolean;
  cudaNotes: string;
  rocmAvailable: boolean | null;
  preferredRunMode: string;
  fallbackRunMode: string;
}

// ============================================================
// Run options per spec
// ============================================================
export interface RunOptionsResult {
  localOption: {
    possible: boolean;
    mode: string;
    steps: string[];
    limitations: string[];
    estimatedCost: "free";
  };
  dockerOption: {
    possible: boolean;
    steps: string[];
    limitations: string[];
    estimatedCost: "free";
  };
  cpuOnlyOption: {
    possible: boolean;
    steps: string[];
    expectedPerformance: string;
    limitations: string[];
    estimatedCost: "free";
  };
  ollamaCloudOption: {
    possible: boolean;
    provider: "ollama_cloud";
    providerName: "Ollama Cloud";
    useCaseFit: string;
    steps: string[];
    limitations: string[];
    estimatedCostUsd: string;
    pricingStatus: PricingStatus;
    pricingNote: string;
    linksToCheck: string[];
  };
  disabledProviders: string[];
  githubAlternatives: {
    query: string;
    reason: string;
    suggestedSearches: string[];
  }[];
  finalRecommendation: string;
}

// ============================================================
// GitHub alternatives per spec
// ============================================================
export interface GithubAlternative {
  fullName: string;
  githubUrl: string;
  description: string;
  stars: number;
  language: string;
  license: string;
  whyBetterForMyPc: string;
  tradeoffs: string[];
  estimatedCompatibilityScore: number;
}

export interface GithubAlternativesResult {
  alternatives: GithubAlternative[];
  fallbackQueries: string[];
  liveSearchPerformed: boolean;
  note: string;
}

// ============================================================
// Provider policy payload
// ============================================================
export interface ProviderPolicyPayload {
  allowedProviders: readonly ["ollama_cloud"];
  selectedProvider: "ollama_cloud";
  otherProvidersDisabled: true;
  note: string;
}

// ============================================================
// Ollama Cloud option (standalone)
// ============================================================
export interface OllamaCloudOption {
  possible: boolean;
  provider: "ollama_cloud";
  providerName: "Ollama Cloud";
  useCaseFit: string;
  steps: string[];
  limitations: string[];
  estimatedCostUsd: string;
  pricingStatus: PricingStatus;
  pricingNote: string;
  linksToCheck: string[];
}

export interface InstallPlanData {
  prerequisites: string[];
  dockerCommands: string[];
  manualCommands: string[];
  envVars: { key: string; description: string; required: boolean }[];
  verificationSteps: string[];
  commonErrors: string[];
  cleanupSteps: string[];
}

export interface CompareResult {
  repos: Array<{
    id: string;
    fullName: string;
    scores: ScoreSet;
    verdict: Verdict;
    metrics: {
      stars: number;
      forks: number;
      license: string;
      difficulty: Difficulty;
      gpuRequired: boolean;
      commercialUseStatus: CommercialStatus;
    };
  }>;
  winner: { id: string; fullName: string; reason: string } | null;
  rankings: { id: string; fullName: string; rank: number; reason: string }[];
  bestFor: {
    agentOs: string;
    aiLegalArmenia: string;
    easiestToRun: string;
    lowestRisk: string;
  };
  finalRecommendation: string;
}

export interface VoiceCommandResult {
  action: string;
  payload: unknown;
  spokenResponse: string;
  handled: boolean;
}

export interface ExtractedCandidate {
  rawText: string;
  candidateName: string;
  resolvedGithubUrl: string;
  owner: string;
  repo: string;
  confidenceScore: number;
  needsManualReview: boolean;
}
