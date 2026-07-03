// POST /api/repos/:id/alternatives — find GitHub alternatives for repos that don't fit my PC.

import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { githubAlternativesService } from "@/services/github-alternatives.service";
import type { RepoMetadata, MyPcProfile } from "@/lib/types";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);

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
    topics: safeParseArr(repo.topics),
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

  // Load PC profile
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  const pcProfile: Partial<MyPcProfile> = {
    os: s.os,
    cpu: s.cpu,
    ramGb: Number(s.ram),
    gpu: s.gpu,
    vramGb: Number(s.vram),
    cudaAvailable: s.cudaAvailable,
  };

  const result = await githubAlternativesService.find(meta, pcProfile);
  return ok({ alternatives: result, repoId: id });
});

function safeParseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}
