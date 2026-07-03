import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { aiService } from "@/services/ai.service";
import type { RepoMetadata } from "@/lib/types";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({
    where: { id },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!repo) return err("Repository not found", 404);

  const latestAnalysis = repo.analyses[0];
  const meta: RepoMetadata = {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    githubUrl: repo.githubUrl,
    description: repo.description,
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    openIssues: repo.openIssues,
    license: repo.license,
    primaryLanguage: repo.primaryLanguage,
    topics: safeParse(repo.topics),
    createdAtGithub: repo.createdAtGithub?.toISOString() ?? null,
    updatedAtGithub: repo.updatedAtGithub?.toISOString() ?? null,
    pushedAtGithub: repo.pushedAtGithub?.toISOString() ?? null,
    archived: repo.archived,
    disabled: repo.disabled,
    defaultBranch: repo.defaultBranch,
    readmeText: repo.readmeText,
    hasDocker: repo.hasDocker,
    hasDockerCompose: repo.hasDockerCompose,
    hasPackageJson: repo.hasPackageJson,
    hasRequirements: repo.hasRequirements,
    hasPyproject: repo.hasPyproject,
    hasEnvExample: repo.hasEnvExample,
  };

  // Build a minimal analysis shape from latestAnalysis (for AI context)
  const analysis = latestAnalysis
    ? {
        summary: latestAnalysis.summary,
        problemSolved: latestAnalysis.problemSolved,
        usefulness: latestAnalysis.usefulness,
        projectFit: safeParseJson(latestAnalysis.projectFit),
        extractedIdeas: safeParseJson(latestAnalysis.extractedIdeas),
        risks: safeParseJson(latestAnalysis.risks),
        testPlan: safeParseJson(latestAnalysis.testPlan),
        localRunPlan: safeParseJson(latestAnalysis.localRunPlan),
        securityReview: latestAnalysis.securityReview,
        commercialReview: latestAnalysis.commercialReview,
        costReview: latestAnalysis.costReview,
        finalRecommendation: latestAnalysis.finalRecommendation,
        rawAiJson: latestAnalysis.rawAiJson,
      }
    : undefined;

  const plan = await aiService.generateInstallPlan(meta, analysis as never);

  const installPlan = await db.installPlan.create({
    data: {
      repositoryId: repo.id,
      prerequisites: JSON.stringify(plan.prerequisites),
      dockerCommands: JSON.stringify(plan.dockerCommands),
      manualCommands: JSON.stringify(plan.manualCommands),
      envVars: JSON.stringify(plan.envVars),
      verificationSteps: JSON.stringify(plan.verificationSteps),
      commonErrors: JSON.stringify(plan.commonErrors),
      cleanupSteps: JSON.stringify(plan.cleanupSteps),
      mock: aiService.isMock(),
    },
  });

  return ok({ installPlan, plan });
});

function safeParse(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}
function safeParseJson<T = unknown>(s: string | null | undefined): T {
  if (!s) return {} as T;
  try { return JSON.parse(s) as T; } catch { return {} as T; }
}
