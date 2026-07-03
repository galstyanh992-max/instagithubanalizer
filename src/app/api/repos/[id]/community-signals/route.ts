import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { githubCommunityService } from "@/services/github-community.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  const signals = await githubCommunityService.summarizeCommunitySignals({
    owner: repo.owner, name: repo.name, openIssues: repo.openIssues, stars: repo.stars,
  });
  return ok({ signals });
});
