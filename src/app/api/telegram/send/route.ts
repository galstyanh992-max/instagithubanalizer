import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(4096),
});

export const POST = safe(async (req: Request) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "replace-later") {
    return err("TELEGRAM_BOT_TOKEN not configured", 400);
  }
  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("invalid payload", 400, { issues: parsed.error.flatten() });

  try {
    const bot = new TelegramBot(token, { polling: false });
    const sent = await bot.sendMessage(parsed.data.chatId, parsed.data.text);
    return ok({ ok: true, messageId: sent.message_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telegram/send] error:", msg);
    return err(msg, 500);
  }
});
