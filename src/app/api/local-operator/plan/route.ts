import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planLocalOperatorAction } from "@/lib/local-operator/planner";

export const runtime = "nodejs";
const schema = z.object({
  text: z.string().min(1).max(2000), actorId: z.string().optional(), actorRole: z.string().optional(),
  actorSource: z.enum(["web", "telegram", "api", "system", "agent"]).optional(),
  workspaceId: z.string().optional(), requestedPath: z.string().optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const plan = await planLocalOperatorAction(parsed.data);
  return ok({ plan }); // never executes
});
