import { err, ok, safe } from "@/lib/api";
import { projectInfrastructureService } from "@/services/project-infrastructure.service";

export const GET = safe(async (_req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
  const operationId = (await ctx?.params)?.operationId;
  if (!operationId) return err("operation id is required", 400);
  const operation = await projectInfrastructureService.get(operationId);
  return operation ? ok({ operation }) : err("operation not found", 404);
});
