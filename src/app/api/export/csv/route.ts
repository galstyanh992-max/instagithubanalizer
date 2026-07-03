import { db } from "@/lib/db";
import { safe, parseJson } from "@/lib/api";
import { exportService } from "@/services/export.service";

export const POST = safe(async (req: Request) => {
  const { ids } = await parseJson<{ ids?: string[] }>(req);
  const repos = await db.repository.findMany({
    where: ids && ids.length ? { id: { in: ids } } : undefined,
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 500,
  });
  const csv = exportService.exportCsv(repos);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ai-jarwisyan-repos.csv",
    },
  });
});
