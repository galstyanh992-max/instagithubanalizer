import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";

export const GET = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const record = await memoryService.get(id);
  if (!record) return err("Memory record not found", 404);
  return ok({ record });
});

export const PATCH = safe(async (req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const body = await parseJson(req);
  const record = await memoryService.update(id, body as Record<string, any>);
  return ok({ record });
});

export const DELETE = safe(async (_req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  await memoryService.remove(id);
  return ok({ ok: true });
});
