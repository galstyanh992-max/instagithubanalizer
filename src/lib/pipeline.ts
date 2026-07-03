// AI Jarwisyan — Server-side pipeline orchestrator

import { db } from "@/lib/db";
import { resolveRepo, fetchRepoMetadata } from "@/services/github.service";
import { aiService, type ProjectContextFlags } from "@/services/ai.service";
import { scoringService } from "@/services/scoring.service";
import { licenseService } from "@/services/license.service";
import { securityService } from "@/services/security.service";
import { compatibilityService } from "@/services/compatibility.service";
import { duplicateService } from "@/services/duplicate.service";
import type { RepoMetadata, RepoAnalysisResult } from "@/lib/types";

export interface AnalyzeOptions {
  force?: boolean; // re-analyze even if existing
  screenshotId?: string;
}

export interface AnalyzeResult {
  repositoryId: string;
  fullName: string;
  isNew: boolean;
  mock: boolean;
  verdict: string;
  finalPriorityScore: number;
}

export async function analyzeRepoPipeline(
  input: string | { owner: string; repo: string },
  options: AnalyzeOptions = {}
): Promise<AnalyzeResult> {
  const { force = false, screenshotId } = options;

  // 1. Resolve metadata from GitHub
  const meta: RepoMetadata =
    typeof input === "string"
      ? await resolveRepo(input)
      : await fetchRepoMetadata(input.owner, input.repo);

  // 2. Duplicate check
  const existing = await duplicateService.findDuplicate(meta.fullName);
  if (existing && !force) {
    return {
      repositoryId: existing.id,
      fullName: existing.fullName,
      isNew: false,
      mock: false,
      verdict: existing.verdict,
      finalPriorityScore: existing.finalPriorityScore,
    };
  }

  // 3. Get settings + project context
  const settings = await db.setting.findUnique({ where: { id: "singleton" } });
  const ctx: ProjectContextFlags = {
    agentOs: settings?.projectAgentOs ?? true,
    aiLegalArmenia: settings?.projectAiLegal ?? true,
    ragOcr: settings?.projectRagOcr ?? true,
    videoAutomation: settings?.projectVideo ?? true,
    saasBusiness: settings?.projectSaas ?? true,
    tradingFinance: settings?.projectTrading ?? true,
  };

  // 4. Run analysis
  const analysis: RepoAnalysisResult = await aiService.analyze(meta, ctx);

  // 5. Compute compatibility (hardware-aware, Ollama Cloud fallback only)
  const pcProfileOverrides = settings
    ? {
        profileName: settings.pcProfileName || undefined,
        os: settings.os || undefined,
        systemType: settings.pcSystemType || undefined,
        cpu: settings.cpu || undefined,
        ramGb: Number(settings.ram) || undefined,
        gpu: settings.gpu || undefined,
        vramGb: Number(settings.vram) || undefined,
        storageTotalGb: settings.pcStorageTotalGb || undefined,
        storageUsedGb: settings.pcStorageUsedGb || undefined,
        storageFreeGb: settings.freeDiskGb || undefined,
        dockerAvailable: settings.dockerAvailable,
        pythonVersion: settings.pythonVersion || null,
        nodeVersion: settings.nodeVersion || null,
        gitAvailable: settings.gitAvailable,
        cudaAvailable: settings.cudaAvailable,
        rocmAvailable: settings.pcRocmAvailable,
      }
    : undefined;
  const compat = compatibilityService.check({
    meta,
    pcProfile: pcProfileOverrides,
    gpuRequired: analysis.localRun.gpuRequired,
    difficulty: analysis.localRun.difficulty,
    requiredVramGb: analysis.localRun.gpuRequired ? 8 : undefined,
  });
  const scores = scoringService.computeScores(meta, analysis, compat);

  // 6. License + security classification (also computed in AI but we trust local logic)
  const licenseInfo = licenseService.classifyLicense(meta.license);
  const securityInfo = securityService.scanSecurity(meta, meta.readmeText);

  // 7. Persist
  const data = {
    owner: meta.owner,
    name: meta.name,
    fullName: meta.fullName.toLowerCase(),
    githubUrl: meta.githubUrl,
    description: meta.description,
    stars: meta.stars,
    forks: meta.forks,
    watchers: meta.watchers,
    openIssues: meta.openIssues,
    license: meta.license,
    primaryLanguage: meta.primaryLanguage,
    topics: JSON.stringify(meta.topics),
    createdAtGithub: meta.createdAtGithub ? new Date(meta.createdAtGithub) : null,
    updatedAtGithub: meta.updatedAtGithub ? new Date(meta.updatedAtGithub) : null,
    pushedAtGithub: meta.pushedAtGithub ? new Date(meta.pushedAtGithub) : null,
    archived: meta.archived,
    disabled: meta.disabled,
    defaultBranch: meta.defaultBranch,
    readmeText: meta.readmeText,
    hasDocker: meta.hasDocker,
    hasDockerCompose: meta.hasDockerCompose,
    hasPackageJson: meta.hasPackageJson,
    hasRequirements: meta.hasRequirements,
    hasPyproject: meta.hasPyproject,
    hasEnvExample: meta.hasEnvExample,
    localRunPossible: analysis.localRun.possible && compat.canRunLocally,
    gpuRequired: analysis.localRun.gpuRequired,
    difficulty: analysis.localRun.difficulty,
    usefulnessScore: scores.usefulness,
    healthScore: scores.health,
    compatibilityScore: scores.compatibility,
    commercialRiskScore: scores.commercialRisk,
    agentOsScore: scores.agentOs,
    aiLegalScore: scores.aiLegal,
    securityScore: scores.security,
    costScore: scores.cost,
    finalPriorityScore: scores.finalPriority,
    verdict: scores.verdict,
    securityStatus: securityInfo.status,
    securityNotes: JSON.stringify(securityInfo.notes),
    commercialUseStatus: licenseInfo.status,
    commercialNotes: licenseInfo.notes,
    costNotes: analysis.cost.notes,
    lastCheckedAt: new Date(),
  };

  let repo;
  if (existing && force) {
    repo = await db.repository.update({ where: { id: existing.id }, data });
  } else if (existing) {
    repo = existing;
  } else {
    repo = await db.repository.create({ data });
  }

  // 8. Persist analysis
  await db.repositoryAnalysis.create({
    data: {
      repositoryId: repo.id,
      summary: analysis.summary,
      problemSolved: analysis.problemSolved,
      usefulness: analysis.bestUseCases.join('; ') || analysis.summary,
      projectFit: JSON.stringify(analysis.projectFit),
      extractedIdeas: JSON.stringify(analysis.extractedIdeas),
      risks: JSON.stringify(analysis.security.notes),
      testPlan: JSON.stringify(analysis.testPlan),
      localRunPlan: JSON.stringify(analysis.localRun),
      securityReview: JSON.stringify(analysis.security),
      commercialReview: JSON.stringify(analysis.commercialRisk),
      costReview: JSON.stringify(analysis.cost),
      finalRecommendation: analysis.nextAction,
      rawAiJson: JSON.stringify(analysis),
      mock: analysis.mock ?? false,
    },
  });

  // 9. AnalysisRun log
  await db.analysisRun.create({
    data: {
      repositoryId: repo.id,
      status: "success",
      mode: analysis.mock ? "mock" : "live",
      finishedAt: new Date(),
    },
  });

  // 10. If from screenshot — link candidate
  if (screenshotId) {
    await db.extractedCandidate.updateMany({
      where: { screenshotId },
      data: { status: "analyzed" },
    });
  }

  return {
    repositoryId: repo.id,
    fullName: repo.fullName,
    isNew: !existing,
    mock: analysis.mock ?? false,
    verdict: scores.verdict,
    finalPriorityScore: scores.finalPriority,
  };
}
