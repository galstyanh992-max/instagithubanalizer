import { NextResponse } from "next/server";
import { isTgUserReady } from "@/lib/telegram/tg-music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CHANNEL = "@carMuzzicH";

function channelName(value: string | undefined) {
  const raw = (value || DEFAULT_CHANNEL).trim();
  const normalized = raw.startsWith("@") ? raw : `@${raw}`;
  return /^@[A-Za-z0-9_]{5,32}$/.test(normalized) ? normalized : DEFAULT_CHANNEL;
}

export async function GET() {
  const channel = channelName(process.env.TELEGRAM_MUSIC_CHANNEL);

  if (isTgUserReady()) {
    return NextResponse.json({
      configured: true,
      connected: true,
      channel,
      source: "userbot",
      message: "Канал подключён через MTProto-сессию. Плеер читает аудиоархив канала.",
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token === "replace-later") {
    return NextResponse.json({ configured: false, connected: false, channel, message: "Бот Telegram ещё не настроен." });
  }

  try {
    const endpoint = new URL(`https://api.telegram.org/bot${token}/getChat`);
    endpoint.searchParams.set("chat_id", channel);
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const payload = (await response.json()) as { ok?: boolean; result?: { title?: string } };
    if (!response.ok || !payload.ok) {
      return NextResponse.json({ configured: true, connected: false, channel, message: "Добавьте бота администратором канала." });
    }
    return NextResponse.json({
      configured: true,
      connected: true,
      channel,
      source: "botapi",
      title: payload.result?.title || channel,
      message: "Канал подключён (бот). Для архива аудио настройте MTProto-сессию: node scripts/tg-music-login.mjs",
    });
  } catch {
    return NextResponse.json({ configured: true, connected: false, channel, message: "Не удалось проверить доступ бота к каналу." }, { status: 502 });
  }
}
