import { db } from "@/lib/db";
import { safe, parseParams } from "@/lib/api";
import { exportService } from "@/services/export.service";

export const POST = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const repo = await db.repository.findUnique({
    where: { id },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, installPlans: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!repo) return new Response("Not found", { status: 404 });
  const md = exportService.exportMarkdown([repo]);
  return new Response(md, { headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename=${repo.fullName.replace("/", "-")}-report.md` } });
});
