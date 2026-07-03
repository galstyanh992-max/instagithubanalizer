import { ok, safe, parseParams } from "@/lib/api";
import { repoHealthService } from "@/services/repo-health.service";

export const GET = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const [timeline, trend] = await Promise.all([
    repoHealthService.getTimeline(id),
    repoHealthService.calculateTrend(id),
  ]);
  return ok({ timeline, trend });
});
