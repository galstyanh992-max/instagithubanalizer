import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { planContentGeneration } from "@/lib/content-generation/planner";

export const runtime = "nodejs";
const schema = z.object({
  text: z.string().min(1).max(2000), actorId: z.string().optional(),
  targetPlatform: z.enum(["instagram", "youtube", "tiktok", "telegram", "linkedin", "custom"]).optional(),
  brandTone: z.enum(["neutral", "friendly", "professional", "bold"]).optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const plan = await planContentGeneration(parsed.data);
  return ok({ plan }); // never generates, never publishes
});
