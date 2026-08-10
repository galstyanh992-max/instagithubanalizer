import { err, ok, parseJson, safe } from "@/lib/api";
import { env } from "@/lib/env";
import { z } from "zod";

const schema = z.object({
  projectName: z.string().min(1).max(50),
  localPath: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
  dryRun: z.boolean().optional().default(true),
  providers: z.array(z.enum(["github", "vercel", "supabase"])).optional().default([]),
});

// This endpoint only creates a persisted plan. It never invokes a provider CLI.
// The service still validates localPath against the local workspace drive
// policy, so it's local-runtime only — never imported statically.
export const POST = safe(async (req: Request) => {
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return err("Project infrastructure planning runs on the local JARVIS runtime only.", 501);
  }
  const parsed = schema.safeParse(await parseJson(req));
  if (!parsed.success) return err("Invalid infrastructure request", 400, { issues: parsed.error.flatten() });
  const { projectInfrastructureService } = await import("@/local-runtime/services/project-infrastructure.service");
  return ok(await projectInfrastructureService.plan(parsed.data));
});
