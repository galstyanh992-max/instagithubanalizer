import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planBrowserResearch } from "@/lib/browser-research/planner";

export const runtime = "nodejs";
const schema = z.object({ text: z.string().min(1).max(2000), actorId: z.string().optional(), allowedSites: z.array(z.string()).optional() });

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const plan = await planBrowserResearch(parsed.data);
  return ok({ plan }); // no browser launch, no network calls
});
