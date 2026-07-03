import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { sandboxTestService } from "@/services/sandbox-test.service";
import type { RepoMetadata } from "@/lib/types";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  const meta: RepoMetadata = {
    owner: repo.owner, name: repo.name, fullName: repo.fullName, githubUrl: repo.githubUrl,
    description: repo.description, stars: repo.stars, forks: repo.forks, watchers: repo.watchers,
    openIssues: repo.openIssues, license: repo.license, primaryLanguage: repo.primaryLanguage,
    topics: safeParseArr(repo.topics), createdAtGithub: null, updatedAtGithub: null, pushedAtGithub: null,
    archived: repo.archived, disabled: repo.disabled, defaultBranch: repo.defaultBranch,
    readmeText: repo.readmeText, hasDocker: repo.hasDocker, hasDockerCompose: repo.hasDockerCompose,
    hasPackageJson: repo.hasPackageJson, hasRequirements: repo.hasRequirements, hasPyproject: repo.hasPyproject,
    hasEnvExample: repo.hasEnvExample,
  };
  const plan = sandboxTestService.generatePlan(id, meta);
  return ok({ plan });
});
function safeParseArr(s: string | null): string[] { if (!s) return []; try { return JSON.parse(s); } catch { return []; } }
