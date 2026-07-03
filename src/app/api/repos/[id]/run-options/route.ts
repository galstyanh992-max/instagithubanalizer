// POST /api/repos/:id/run-options — generates local / docker / cpu-only / Ollama Cloud options.

import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { compatibilityService } from "@/services/compatibility.service";
import { runOptionsService } from "@/services/run-options.service";
import type { RepoMetadata } from "@/lib/types";

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

  const compatibility = compatibilityService.check({
    meta,
    gpuRequired: repo.gpuRequired,
    difficulty: repo.difficulty as "LOW" | "MEDIUM" | "HIGH",
  });
  const runOptions = runOptionsService.build({
    meta,
    compatibility,
    purpose: repo.description || repo.name,
  });

  return ok({ runOptions, repoId: id });
});

function safeParseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}
