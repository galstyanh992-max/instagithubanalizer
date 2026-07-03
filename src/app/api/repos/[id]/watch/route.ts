import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";
import { watchlistService } from "@/services/watchlist.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  await watchlistService.addToWatchlist(id);
  return ok({ ok: true, repositoryId: id, isWatchlisted: true });
});

export const DELETE = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({ where: { id } });
  if (!repo) return err("Repository not found", 404);
  await watchlistService.removeFromWatchlist(id);
  return ok({ ok: true, repositoryId: id, isWatchlisted: false });
});
