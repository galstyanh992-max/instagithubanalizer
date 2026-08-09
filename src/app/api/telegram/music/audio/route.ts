import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { isTgUserReady, getTgClient, getAudioMessage, audioMime } from "@/lib/telegram/tg-music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FILE_ID = /^[A-Za-z0-9_-]{8,512}$/;
const AUDIO_MIME = /^(audio\/(mpeg|ogg|wav|x-wav|aac|mp4|flac)|application\/ogg)$/i;
const cacheDir = path.join(os.tmpdir(), "jrvs-tg-music");
fs.mkdirSync(cacheDir, { recursive: true });

function extFor(mime: string) {
  if (/mpeg/i.test(mime)) return "mp3";
  if (/ogg/i.test(mime)) return "ogg";
  if (/mp4|aac/i.test(mime)) return "m4a";
  if (/wav/i.test(mime)) return "wav";
  if (/flac/i.test(mime)) return "flac";
  return "bin";
}

async function downloadToCache(client: any, message: any, dest: string) {
  // GramJS writes the media to outputFile and returns the path.
  const out = await client.downloadMedia(message, { outputFile: dest });
  return out === dest || typeof out === "string" ? dest : dest;
}

export async function GET(request: NextRequest) {
  const messageId = request.nextUrl.searchParams.get("messageId");
  const fileId = request.nextUrl.searchParams.get("fileId") || "";

  // ── MTProto user path (preferred) ───────────────────────────────
  if (messageId && isTgUserReady()) {
    try {
      const client = await getTgClient();
      let message = await getAudioMessage(Number(messageId));
      if (!message) return NextResponse.json({ error: "Аудиозапись не найдена." }, { status: 404 });
      const doc = message.media.document;
      const mime = audioMime(doc);
      const ext = extFor(mime);
      const cachePath = path.join(cacheDir, `${messageId}.${ext}`);

      let tryCount = 0;
      while (tryCount < 2) {
        try {
          if (!fs.existsSync(cachePath)) await downloadToCache(client, message, cachePath);
          break;
        } catch (e: any) {
          // file reference may have expired — refetch the message and retry once
          message = await getAudioMessage(Number(messageId));
          if (!message) return NextResponse.json({ error: "Аудиозапись недоступна." }, { status: 502 });
          tryCount++;
        }
      }
      if (!fs.existsSync(cachePath)) return NextResponse.json({ error: "Не удалось получить аудио." }, { status: 502 });

      const stat = fs.statSync(cachePath);
      const size = stat.size;
      const range = request.headers.get("range");
      const headers: Record<string, string> = {
        "content-type": AUDIO_MIME.test(mime) ? mime : "audio/mpeg",
        "cache-control": "private, max-age=600",
        "accept-ranges": "bytes",
      };
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end) || end >= size) end = size - 1;
        headers["content-length"] = String(end - start + 1);
        headers["content-range"] = `bytes ${start}-${end}/${size}`;
        const rs = fs.createReadStream(cachePath, { start, end });
        return new NextResponse(Readable.toWeb(rs) as unknown as BodyInit, { status: 206, headers });
      }
      headers["content-length"] = String(size);
      const rs = fs.createReadStream(cachePath);
      return new NextResponse(Readable.toWeb(rs) as unknown as BodyInit, { status: 200, headers });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "TG audio error" }, { status: 502 });
    }
  }

  // ── Bot API fallback (legacy, fileId based) ─────────────────────
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token === "replace-later" || !FILE_ID.test(fileId))
    return NextResponse.json({ error: "Аудиозапись недоступна." }, { status: 400 });

  try {
    const metadataResponse = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { cache: "no-store", signal: AbortSignal.timeout(8_000) },
    );
    const metadata = (await metadataResponse.json()) as { ok?: boolean; result?: { file_path?: string } };
    const filePath = metadata.result?.file_path;
    const FILE_PATH = /^[A-Za-z0-9_./-]{1,512}$/;
    if (!metadataResponse.ok || !metadata.ok || !filePath || !FILE_PATH.test(filePath) || filePath.includes(".."))
      throw new Error("invalid file path");

    const range = request.headers.get("range");
    const audioResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: range ? { range } : undefined,
    });
    if (!audioResponse.ok || !audioResponse.body) throw new Error("audio unavailable");
    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";
    if (!AUDIO_MIME.test(contentType)) throw new Error("unexpected content type");
    const headers = new Headers({
      "content-type": contentType,
      "cache-control": "private, max-age=300",
      "accept-ranges": "bytes",
      "x-content-type-options": "nosniff",
    });
    for (const name of ["content-length", "content-range"]) {
      const value = audioResponse.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(audioResponse.body, { status: audioResponse.status, headers });
  } catch {
    return NextResponse.json({ error: "Не удалось получить аудиозапись Telegram." }, { status: 502 });
  }
}
