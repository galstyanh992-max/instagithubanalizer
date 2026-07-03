import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";
import { z } from "zod";

const createSchema = z.object({
  kind: z.string(),
  title: z.string().min(1),
  content: z.string().default(""),
  source: z.string().optional(),
  projectId: z.string().optional(),
  repositoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sensitive: z.boolean().optional(),
});

export const GET = safe(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const records = await memoryService.list({
      query: params.query,
      kind: params.kind as never,
      projectId: params.projectId,
      repositoryId: params.repositoryId,
      limit: params.limit ? Number(params.limit) : undefined,
    });
    return ok({ records, count: records.length });
  } catch (e) {
    return ok({
      ok: true,
      fallbackUsed: true,
      message: "Данные загружены в fallback-режиме (база недоступна).",
      records: [],
      count: 0
    });
  }
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid memory input", 400, { issues: parsed.error.flatten() });
  }
  const record = await memoryService.create(parsed.data as never);
  return ok({ record });
});
