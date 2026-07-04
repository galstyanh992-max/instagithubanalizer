import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planConnectionTest } from "@/lib/api-hub/api-registry-service";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().min(1) });

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("id required", 400, { issues: parsed.error.flatten() });
  const plan = planConnectionTest(parsed.data.id);
  if (!plan) return err("api not found", 404);
  return ok({ plan }); // planned only — no external call
});
