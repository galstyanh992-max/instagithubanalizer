import { ok, err, safe, parseJson } from "@/lib/api";
import { env } from "@/lib/env";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().min(1).max(500),
});

// Graphify spawns a local CLI (child_process) — local-runtime only. Never
// imported statically so it can't ship in a Vercel web-control-plane bundle.
export const POST = safe(async (req: Request) => {
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return err("Graphify runs on the local JARVIS runtime only.", 501);
  }
  const body = await parseJson(req);
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) return err("Invalid query", 400, { issues: parsed.error.flatten() });
  try {
    const { graphifyService } = await import("@/local-runtime/services/graphify.service");
    const result = await graphifyService.query(parsed.data.query);
    return ok({ stdout: result.stdout, stderr: result.stderr });
  } catch (e: any) {
    return err(e.message, 500);
  }
});
