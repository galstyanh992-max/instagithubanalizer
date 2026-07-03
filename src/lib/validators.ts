// AI Jarwisyan — Zod validators

import { z } from "zod";

export const analyzeRepoSchema = z.object({
  fullName: z.string().min(3).optional(),
  owner: z.string().min(1).optional(),
  repo: z.string().min(1).optional(),
  screenshotId: z.string().optional(),
}).refine(
  (v) => !!v.fullName || (!!v.owner && !!v.repo),
  "Provide either fullName or owner+repo"
);

export const compareSchema = z.object({
  ids: z.array(z.string().min(1)).min(2).max(5),
});

export const boardMoveSchema = z.object({
  repoId: z.string().min(1),
  verdict: z.enum(["USE_NOW", "TEST", "SAVE", "SKIP"]),
});

export const settingsSchema = z.object({
  githubToken: z.string().optional(),
  aiProvider: z.string().optional(),
  glmApiKey: z.string().optional(),
  glmBaseUrl: z.string().optional(),
  ocrProvider: z.string().optional(),
  ttsProvider: z.string().optional(),
  sttProvider: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  gpu: z.string().optional(),
  vram: z.string().optional(),
  os: z.string().optional(),
  freeDiskGb: z.number().int().min(0).optional(),
  dockerAvailable: z.boolean().optional(),
  pythonVersion: z.string().optional(),
  nodeVersion: z.string().optional(),
  gitAvailable: z.boolean().optional(),
  cudaAvailable: z.boolean().optional(),
  enable3d: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  compactMode: z.boolean().optional(),
  neonIntensity: z.number().int().min(0).max(100).optional(),
  voiceEnabled: z.boolean().optional(),
  autoSpeak: z.boolean().optional(),
  projectAgentOs: z.boolean().optional(),
  projectAiLegal: z.boolean().optional(),
  projectRagOcr: z.boolean().optional(),
  projectVideo: z.boolean().optional(),
  projectSaas: z.boolean().optional(),
  projectTrading: z.boolean().optional(),
});

export const voiceCommandSchema = z.object({
  transcript: z.string().min(1).max(500),
});

// ============================================================
// PC profile (per spec)
// ============================================================
export const pcProfileSchema = z.object({
  profileName: z.string().optional(),
  os: z.string().optional(),
  systemType: z.string().optional(),
  cpu: z.string().optional(),
  cpuCoresHint: z.string().optional(),
  ramGb: z.coerce.number().int().min(0).optional(),
  gpu: z.string().optional(),
  vramGb: z.coerce.number().int().min(0).optional(),
  storageTotalGb: z.coerce.number().int().min(0).optional(),
  storageUsedGb: z.coerce.number().int().min(0).optional(),
  storageFreeGb: z.coerce.number().int().min(0).optional(),
  dockerAvailable: z.boolean().nullable().optional(),
  pythonVersion: z.string().nullable().optional(),
  nodeVersion: z.string().nullable().optional(),
  gitAvailable: z.boolean().nullable().optional(),
  cudaAvailable: z.boolean().optional(),
  cudaNotes: z.string().optional(),
  rocmAvailable: z.boolean().nullable().optional(),
  preferredRunMode: z.string().optional(),
  fallbackRunMode: z.string().optional(),
});

// ============================================================
// Cloud provider policy (per spec)
// ============================================================
export const cloudProviderPolicySchema = z.object({
  cloudProvider: z.string().default("ollama_cloud"),
  allowedCloudProviders: z.array(z.string()).default(["ollama_cloud"]),
  disableOtherCloudProviders: z.boolean().default(true),
});

export type PcProfileInput = z.infer<typeof pcProfileSchema>;
export type CloudProviderPolicyInput = z.infer<typeof cloudProviderPolicySchema>;

export const manualReviewResolveSchema = z.object({
  candidateId: z.string().min(1),
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const reposQuerySchema = z.object({
  search: z.string().optional(),
  verdict: z.enum(["USE_NOW", "TEST", "SAVE", "SKIP"]).optional(),
  license: z.string().optional(),
  difficulty: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  gpu: z.enum(["true", "false"]).optional(),
  commercialRisk: z
    .enum(["SAFE", "WARNING", "HIGH_RISK", "UNKNOWN"])
    .optional(),
  sort: z
    .enum([
      "stars",
      "healthScore",
      "usefulnessScore",
      "finalPriorityScore",
      "updatedAtGithub",
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type AnalyzeRepoInput = z.infer<typeof analyzeRepoSchema>;
export type CompareInput = z.infer<typeof compareSchema>;
export type BoardMoveInput = z.infer<typeof boardMoveSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type VoiceCommandInput = z.infer<typeof voiceCommandSchema>;
export type ReposQuery = z.infer<typeof reposQuerySchema>;
