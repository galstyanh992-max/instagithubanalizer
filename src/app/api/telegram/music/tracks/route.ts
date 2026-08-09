import { NextResponse } from "next/server";
import { isTgUserReady, getChannelTracks } from "@/lib/telegram/tg-music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type TelegramAudio = { file_id?: string; file_name?: string; title?: string; performer?: string; mime_type?: string; duration?: number };
type TelegramPost = { chat?: { username?: string }; audio?: TelegramAudio; document?: TelegramAudio; caption?: string; message_id?: number };
type TelegramUpdate = { channel_post?: TelegramPost };

const CHANNEL = (process.env.TELEGRAM_MUSIC_CHANNEL || "@carMuzzicH").replace(/^@?/, "@").toLowerCase();
const AUDIO_MIME = /^(audio\/(mpeg|ogg|wav|x-wav|aac|mp4)|application\/ogg)$/i;

export async function GET() {
  const channel = (process.env.TELEGRAM_MUSIC_CHANNEL || "@carMuzzicH").trim();

  // ── MTProto user path: reads the channel's actual audio history ──
  if (isTgUserReady()) {
    try {
      const tracks = await getChannelTracks(100);
      if (tracks) return NextResponse.json({ configured: true, connected: true, channel, source: "userbot", tracks });
    } catch (e: any) {
      return NextResponse.json(
        { configured: true, connected: false, channel, source: "userbot", tracks: [], message: e?.message || "MTProto недоступен." },
        { status: 502 },
      );
    }
  }

  // ── Bot API fallback: only new channel_post updates (best-effort) ──
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token === "replace-later") return NextResponse.json({ configured: false, tracks: [] });

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=0&allowed_updates=%5B%22channel_post%22%5D`,
      { cache: "no-store", signal: AbortSignal.timeout(8_000) },
    );
    const payload = (await response.json()) as { ok?: boolean; result?: TelegramUpdate[] };
    if (!response.ok || !payload.ok)
      return NextResponse.json({ configured: true, tracks: [], message: "Не удалось получить новые записи канала." }, { status: 502 });

    const tracks = (payload.result || [])
      .map((update) => update.channel_post)
      .filter((post): post is TelegramPost => Boolean(post && post.chat?.username && `@${post.chat.username}`.toLowerCase() === CHANNEL))
      .map((post) => {
        const media = post.audio || post.document;
        if (!media?.file_id || (post.document && media.mime_type && !AUDIO_MIME.test(media.mime_type))) return null;
        const title = [media.performer, media.title || media.file_name || post.caption].filter(Boolean).join(" — ") || "Аудиозапись Telegram";
        return { id: String(post.message_id || media.file_id), title: title.slice(0, 180), fileId: media.file_id, duration: media.duration || null };
      })
      .filter((track): track is { id: string; title: string; fileId: string; duration: number | null } => Boolean(track))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 40)
      .map((track) => ({ ...track, url: `/api/telegram/music/audio?fileId=${encodeURIComponent(track.fileId)}` }));

    return NextResponse.json({ configured: true, channel: CHANNEL, source: "botapi", tracks });
  } catch {
    return NextResponse.json({ configured: true, tracks: [], message: "Не удалось загрузить новые записи Telegram." }, { status: 502 });
  }
}
