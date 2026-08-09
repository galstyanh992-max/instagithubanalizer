import { err, ok, safe } from "@/lib/api";
import { projectInfrastructureService } from "@/services/project-infrastructure.service";

export const POST = safe(async (_req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
  const operationId = (await ctx?.params)?.operationId;
  if (!operationId) return err("operation id is required", 400);
  return ok(await projectInfrastructureService.bootstrapLocal(operationId));
});
