import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { buildEmailDraft } from "@/lib/email-foundation/draft-builder";

export const runtime = "nodejs";
const schema = z.object({
  text: z.string().min(1).max(3000), actorId: z.string().optional(),
  recipientHint: z.string().optional(), subjectHint: z.string().optional(),
  tone: z.enum(["neutral", "friendly", "professional", "short"]).optional(),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("text required", 400, { issues: parsed.error.flatten() });
  const draft = await buildEmailDraft(parsed.data);
  return ok({ draft }); // never sends
});
