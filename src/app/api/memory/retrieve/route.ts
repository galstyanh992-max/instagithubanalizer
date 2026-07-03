import { ok, safe, parseJson } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";
import { memorySafetyService } from "@/services/memory/memory-safety.service";

export const POST = safe(async (req: Request) => {
  const body = await parseJson<{ query: string; projectId?: string; repositoryId?: string; limit?: number }>(req);
  const records = await memoryService.retrieveRelevant({
    query: body.query,
    projectId: body.projectId,
    repositoryId: body.repositoryId,
    limit: body.limit ?? 10,
  });
  // Safety filter — не отправляем sensitive память
  const safeMemory = memorySafetyService.sanitizeForAI(
    records.map((r) => ({ sensitive: r.sensitive, content: r.content, title: r.title }))
  );
  return ok({ memory: safeMemory, count: records.length, filtered: records.length > 0 && safeMemory === "" });
});
