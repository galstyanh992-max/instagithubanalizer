import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { handleTelegramMessage } from "@/lib/telegram/message-router";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1).max(2000),
  chatId: z.string().default("test-chat"),
  user: z.object({
    telegramUserId: z.string(),
    username: z.string().optional(),
    isAllowed: z.boolean().default(false),
  }),
});

// Internal/test endpoint only — not a live webhook. No Telegram API calls.
export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("invalid payload", 400, { issues: parsed.error.flatten() });
  const result = await handleTelegramMessage(parsed.data);
  return ok({ result });
});
