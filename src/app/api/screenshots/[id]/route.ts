import { db } from "@/lib/db";
import { ok, err, safe, parseParams } from "@/lib/api";

export const GET = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const screenshot = await db.screenshot.findUnique({
    where: { id },
    include: { candidates: true },
  });
  if (!screenshot) return err("Screenshot not found", 404);
  return ok({ screenshot });
});
