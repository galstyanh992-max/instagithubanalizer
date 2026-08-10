import { err, ok, safe } from "@/lib/api";
import { env } from "@/lib/env";

export const POST = safe(async (_req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return err("Infrastructure operations run on the local JARVIS runtime only.", 501);
  }
  const operationId = (await ctx?.params)?.operationId;
  if (!operationId) return err("operation id is required", 400);
  const { projectInfrastructureService } = await import("@/local-runtime/services/project-infrastructure.service");
  return ok({ operation: await projectInfrastructureService.cancel(operationId) });
});
