import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { exportService } from "@/services/export.service";

export const POST = safe(async (req: Request) => {
  const { ids } = await parseJson<{ ids?: string[] }>(req);
  const repos = await db.repository.findMany({
    where: ids && ids.length ? { id: { in: ids } } : undefined,
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 500,
  });
  const json = exportService.exportJson(repos);
  return ok(JSON.parse(json));
});
