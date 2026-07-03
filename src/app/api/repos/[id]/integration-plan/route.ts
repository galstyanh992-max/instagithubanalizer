import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { integrationPlanService } from "@/services/integration-plan.service";
import { z } from "zod";

const schema = z.object({
  connectedProjectId: z.string().min(1),
});

export const POST = safe(async (req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("connectedProjectId required", 400, { issues: parsed.error.flatten() });
  }
  try {
    const plan = await integrationPlanService.generate({
      connectedProjectId: parsed.data.connectedProjectId,
      repositoryId: id,
    });
    return ok({ plan });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed", 500);
  }
});
