import 'server-only'
import { db } from '@/lib/db'
import { aiService } from '@/services/ai.service'
import { compatibilityService } from '@/services/compatibility.service'
import { resolveRepo } from '@/services/github.service'
import { licenseService } from '@/services/license.service'
import { scoringService } from '@/services/scoring.service'
import { securityService } from '@/services/security.service'
import type { PcSpecs, ProjectContext, RepoMetadata } from '@/lib/types'

export interface PipelineOptions {
  mode?: 'live' | 'mock'
  skipGithub?: boolean
  existingMeta?: RepoMetadata
}

export interface PipelineResult {
  repoId: string
  mock: boolean
  verdict: string
  finalPriorityScore: number
}

function getSetting<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value
}

function toPcSpecs(s: {
  cpu: string | null
  ram: string | null
  gpu: string | null
  vram: string | null
  os: string | null
  freeDiskGb: number | null
  dockerAvailable: boolean | null
  pythonVersion: string | null
  nodeVersion: string | null
  gitAvailable: boolean | null
  cudaAvailable: boolean | null
}): PcSpecs {
  return {
    cpu: s.cpu ?? '',
    ram: s.ram ?? '',
    gpu: s.gpu ?? '',
    vram: s.vram ?? '',
    os: s.os ?? '',
    freeDiskGb: s.freeDiskGb ?? 0,
    dockerAvailable: s.dockerAvailable ?? false,
    pythonVersion: s.pythonVersion ?? '',
    nodeVersion: s.nodeVersion ?? '',
    gitAvailable: s.gitAvailable ?? true,
    cudaAvailable: s.cudaAvailable ?? false,
  }
}

function toProjectContext(s: {
  projectAgentOs: boolean | null
  projectAiLegal: boolean | null
  projectRagOcr: boolean | null
  projectVideo: boolean | null
  projectSaas: boolean | null
  projectTrading: boolean | null
}): ProjectContext {
  return {
    projectAgentOs: getSetting(s.projectAgentOs, false),
    projectAiLegal: getSetting(s.projectAiLegal, false),
    projectRagOcr: getSetting(s.projectRagOcr, false),
    projectVideo: getSetting(s.projectVideo, false),
    projectSaas: getSetting(s.projectSaas, false),
    projectTrading: getSetting(s.projectTrading, false),
  }
}

export async function runAnalysisPipeline(
  owner: string,
  repo: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const setting = await db.setting.findUnique({ where: { id: 'singleton' } })
  const pcSpecs = setting ? toPcSpecs(setting) : {
    cpu: '', ram: '', gpu: '', vram: '', os: '', freeDiskGb: 0,
    dockerAvailable: false, pythonVersion: '', nodeVersion: '',
    gitAvailable: true, cudaAvailable: false,
  }
  const ctx = setting ? toProjectContext(setting) : {
    projectAgentOs: false, projectAiLegal: false, projectRagOcr: false,
    projectVideo: false, projectSaas: false, projectTrading: false,
  }

  let meta: RepoMetadata | null = options.existingMeta ?? null
  if (!options.skipGithub && !meta) {
    const resolved = await resolveRepo(`${owner}/${repo}`).catch(() => null)
    if (resolved) {
      meta = resolved
    }
  }

  if (!meta) {
    meta = {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      githubUrl: `https://github.com/${owner}/${repo}`,
      description: 'GitHub API unavailable — analyzed in mock mode.',
      stars: 0,
      forks: 0,
      watchers: 0,
      openIssues: 0,
      license: "unknown",
      primaryLanguage: "unknown",
      topics: [],
      createdAtGithub: new Date().toISOString(),
      updatedAtGithub: new Date().toISOString(),
      pushedAtGithub: new Date().toISOString(),
      archived: false,
      disabled: false,
      defaultBranch: 'main',
      hasDocker: false,
      hasDockerCompose: false,
      hasPackageJson: false,
      hasRequirements: false,
      hasPyproject: false,
      hasEnvExample: false,
      readmeText: '',
      mock: true,
    }
  }

  const finalMeta = meta!
  const ctxFlags = {
    agentOs: ctx.projectAgentOs,
    aiLegalArmenia: ctx.projectAiLegal,
    ragOcr: ctx.projectRagOcr,
    videoAutomation: ctx.projectVideo,
    saasBusiness: ctx.projectSaas,
    tradingFinance: ctx.projectTrading,
  }

  const analysis = await aiService.analyze(finalMeta, ctxFlags)
  const compat = compatibilityService.check({ meta: finalMeta, pcProfile: pcSpecs })
  const licenseInfo = licenseService.classifyLicense(finalMeta.license)
  const securityScan = securityService.scanSecurity(finalMeta, finalMeta.readmeText)
  const { usefulness, health, compatibility, commercialRisk, agentOs, aiLegal, security, cost, finalPriority, verdict } = scoringService.computeScores(finalMeta, analysis, compat)
  const scores = { usefulnessScore: usefulness, healthScore: health, compatibilityScore: compatibility, commercialRiskScore: commercialRisk, agentOsScore: agentOs, aiLegalScore: aiLegal, securityScore: security, costScore: cost, finalPriorityScore: finalPriority }

  // Compute GPU requirement from analysis hint
  const gpuRequired = analysis.localRun.gpuRequired || /cuda/i.test(finalMeta.readmeText)
  const difficulty = gpuRequired ? 'HARD' : finalMeta.hasDocker ? 'EASY' : 'MEDIUM'

  // Upsert repository
  const existing = await db.repository.findUnique({ where: { fullName: finalMeta.fullName } })
  const repoId = existing?.id ?? null

  const repoData = {
    owner: finalMeta.owner,
    name: finalMeta.name,
    fullName: finalMeta.fullName,
    githubUrl: finalMeta.githubUrl,
    description: finalMeta.description,
    stars: finalMeta.stars,
    forks: finalMeta.forks,
    watchers: finalMeta.watchers,
    openIssues: finalMeta.openIssues,
    license: finalMeta.license ?? '',
    primaryLanguage: finalMeta.primaryLanguage ?? '',
    topics: JSON.stringify(finalMeta.topics),
    createdAtGithub: finalMeta.createdAtGithub ? new Date(finalMeta.createdAtGithub) : null,
    updatedAtGithub: finalMeta.updatedAtGithub ? new Date(finalMeta.updatedAtGithub) : null,
    pushedAtGithub: finalMeta.pushedAtGithub ? new Date(finalMeta.pushedAtGithub) : null,
    archived: finalMeta.archived,
    disabled: finalMeta.disabled,
    defaultBranch: finalMeta.defaultBranch,
    readmeText: finalMeta.readmeText,
    hasDocker: finalMeta.hasDocker,
    hasDockerCompose: finalMeta.hasDockerCompose,
    hasPackageJson: finalMeta.hasPackageJson,
    hasRequirements: finalMeta.hasRequirements,
    hasPyproject: finalMeta.hasPyproject,
    hasEnvExample: finalMeta.hasEnvExample,
    localRunPossible: compat.canRunLocally,
    gpuRequired,
    difficulty,
    usefulnessScore: scores.usefulnessScore,
    healthScore: scores.healthScore,
    compatibilityScore: scores.compatibilityScore,
    commercialRiskScore: scores.commercialRiskScore,
    agentOsScore: scores.agentOsScore,
    aiLegalScore: scores.aiLegalScore,
    securityScore: scores.securityScore,
    costScore: scores.costScore,
    finalPriorityScore: scores.finalPriorityScore,
    verdict,
    securityStatus: securityScan.status,
    securityNotes: JSON.stringify(securityScan.notes),
    commercialUseStatus: licenseInfo.status,
    commercialNotes: licenseInfo.notes,
    costNotes: analysis.cost.notes,
    lastCheckedAt: new Date(),
  }

  const repoRow = existing
    ? await db.repository.update({ where: { id: existing.id }, data: repoData })
    : await db.repository.create({ data: repoData })

  // Save analysis row
  await db.repositoryAnalysis.create({
    data: {
      repositoryId: repoRow.id,
      summary: analysis.summary,
      problemSolved: analysis.problemSolved,
      usefulness: analysis.bestUseCases.join('; '),
      projectFit: JSON.stringify(analysis.projectFit),
      extractedIdeas: JSON.stringify(analysis.extractedIdeas),
      risks: JSON.stringify({
        commercial: analysis.commercialRisk,
        security: analysis.security,
      }),
      testPlan: JSON.stringify(analysis.testPlan),
      localRunPlan: JSON.stringify(analysis.localRun),
      securityReview: JSON.stringify(analysis.security),
      commercialReview: JSON.stringify(analysis.commercialRisk),
      costReview: JSON.stringify(analysis.cost),
      finalRecommendation: analysis.nextAction,
      rawAiJson: JSON.stringify(analysis),
    },
  })

  // Save analysis run
  await db.analysisRun.create({
    data: {
      repositoryId: repoRow.id,
      status: 'SUCCESS',
      mode: options.mode ?? (analysis.mock ? 'mock' : 'live'),
      finishedAt: new Date(),
    },
  }).catch(() => null)

  return {
    repoId: repoRow.id,
    mock: analysis.mock || false,
    verdict,
    finalPriorityScore: scores.finalPriorityScore,
  }
}
