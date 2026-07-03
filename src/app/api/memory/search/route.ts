import { ok, safe, parseJson } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";

export const POST = safe(async (req: Request) => {
  const body = await parseJson<{ query?: string; kind?: string; projectId?: string; limit?: number }>(req);
  const records = await memoryService.search({
    query: body.query,
    kind: body.kind as never,
    projectId: body.projectId,
    limit: body.limit,
  });
  return ok({ records, count: records.length });
});
