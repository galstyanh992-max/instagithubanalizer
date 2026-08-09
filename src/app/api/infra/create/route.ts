import { err, ok, parseJson, safe } from "@/lib/api";
import { projectInfrastructureService } from "@/services/project-infrastructure.service";
import { z } from "zod";

const schema = z.object({
  projectName: z.string().min(1).max(50),
  localPath: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
  dryRun: z.boolean().optional().default(true),
  providers: z.array(z.enum(["github", "vercel", "supabase"])).optional().default([]),
});

// This endpoint only creates a persisted plan. It never invokes a provider CLI.
export const POST = safe(async (req: Request) => {
  const parsed = schema.safeParse(await parseJson(req));
  if (!parsed.success) return err("Invalid infrastructure request", 400, { issues: parsed.error.flatten() });
  return ok(await projectInfrastructureService.plan(parsed.data));
});
