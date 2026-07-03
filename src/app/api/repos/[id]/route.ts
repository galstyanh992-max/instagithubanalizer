import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";

export const GET = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({
    where: { id },
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 5 },
      installPlans: { orderBy: { createdAt: "desc" }, take: 3 },
      watchlistSnapshots: { orderBy: { capturedAt: "desc" }, take: 10 },
      analysisRuns: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!repo) return err("Repository not found", 404);
  return ok({ repo });
});
