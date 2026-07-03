import { ok, err, safe, parseParams } from "@/lib/api";
import { db } from "@/lib/db";

export const DELETE = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  await db.knowledgeVaultSource.delete({ where: { id } });
  return ok({ ok: true });
});
