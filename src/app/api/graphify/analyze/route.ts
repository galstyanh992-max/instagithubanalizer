import { ok, err, safe } from "@/lib/api";
import { env } from "@/lib/env";

// Graphify spawns a local CLI (child_process) — local-runtime only. Never
// imported statically so it can't ship in a Vercel web-control-plane bundle.
export const POST = safe(async () => {
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return err("Graphify runs on the local JARVIS runtime only.", 501);
  }
  const { graphifyService } = await import("@/local-runtime/services/graphify.service");
  try {
    const result = await graphifyService.analyzeProject();
    return ok({ message: "Graphify analysis completed", stdout: result.stdout, stderr: result.stderr });
  } catch (e: any) {
    return err(e.message, 500);
  }
});
