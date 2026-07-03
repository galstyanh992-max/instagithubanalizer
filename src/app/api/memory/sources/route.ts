import { ok, err, safe, parseJson } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  localPath: z.string().optional(),
  githubUrl: z.string().optional(),
  syncMode: z.string().optional(),
});

export const GET = safe(async () => {
  const sources = await memoryService.listSources();
  return ok({ sources });
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid source input", 400, { issues: parsed.error.flatten() });
  }
  const source = await memoryService.createSource(parsed.data);
  return ok({ source });
});
