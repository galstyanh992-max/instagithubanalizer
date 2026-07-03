import { db } from "@/lib/db";
import { ok, safe, parseParams } from "@/lib/api";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({
    where: { id },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, installPlans: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!repo) return new Response("Not found", { status: 404 });
  return ok({ repository: repo });
});
