import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { analyzeRepoPipeline } from "@/lib/pipeline";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  const result = await analyzeRepoPipeline(repo.fullName, { force: true });
  return ok(result);
});
