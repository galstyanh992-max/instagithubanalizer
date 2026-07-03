import { ok, err, safe, parseParams } from "@/lib/api";
import { repoHealthService } from "@/services/repo-health.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  try {
    const snapshot = await repoHealthService.createSnapshot(id);
    return ok({ snapshot });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed", 500);
  }
});
