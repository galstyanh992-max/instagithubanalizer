import { ok, err, safe, parseJson, parseParams } from "@/lib/api";
import { integrationPatchPlanner } from "@/services/integration-patch-planner.service";
import { z } from "zod";

const schema = z.object({ projectId: z.string().min(1) });

export const POST = safe(async (req: Request, ctx) => {
  const { id } = await parseParams(ctx);
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("projectId required", 400);
  try {
    const plan = await integrationPatchPlanner.generate(id, parsed.data.projectId);
    return ok({ plan });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed", 500);
  }
});
