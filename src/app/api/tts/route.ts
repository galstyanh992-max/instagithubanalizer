import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { uploadAsset } from "@/services/storage.service";

export const runtime = "nodejs";
const MAX_TTS_TEXT_LENGTH = 2_000;
const MAX_TTS_CHUNK_LENGTH = 180;
const MAX_AUDIO_CHUNK_BYTES = 2 * 1024 * 1024;

function splitTtsText(value: string): string[] {
  const words = value.trim().split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > MAX_TTS_CHUNK_LENGTH) {
      if (current) chunks.push(current);
      for (let offset = 0; offset < word.length; offset += MAX_TTS_CHUNK_LENGTH) {
        chunks.push(word.slice(offset, offset + MAX_TTS_CHUNK_LENGTH));
      }
      current = "";
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_TTS_CHUNK_LENGTH) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function fetchTtsChunk(text: string, index: number, total: number): Promise<Buffer> {
  const query = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: "ru",
    total: String(total),
    idx: String(index),
    textlen: String(text.length),
    client: "tw-ob",
    prev: "input",
    ttsspeed: "1",
  });
  const response = await fetch(`https://translate.google.com/translate_tts?${query}`, {
    headers: { "user-agent": "JARVIS/0.2 local TTS" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_CHUNK_BYTES) {
    throw new Error("Ответ TTS превышает допустимый размер");
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_AUDIO_CHUNK_BYTES) throw new Error("Ответ TTS превышает допустимый размер");
  return Buffer.from(bytes);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Текст не передан" }, { status: 400 });
    }
    const normalizedText = text.trim();
    if (normalizedText.length > MAX_TTS_TEXT_LENGTH) {
      return NextResponse.json({ error: `Текст превышает лимит ${MAX_TTS_TEXT_LENGTH} символов` }, { status: 413 });
    }

    const textChunks = splitTtsText(normalizedText);
    const audioBuffer = Buffer.concat(await Promise.all(
      textChunks.map((chunk, index) => fetchTtsChunk(chunk, index, textChunks.length)),
    ));

    // Upload generated audio to Supabase Storage so it does not stay on the PC
    const { publicUrl } = await uploadAsset(
      "tts",
      audioBuffer,
      `${randomUUID()}.mp3`,
      "audio/mpeg"
    );

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("[tts] error:", error);
    return NextResponse.json(
      { error: `Синтез речи не выполнен: ${error instanceof Error ? error.message : "неизвестная ошибка"}` },
      { status: 500 }
    );
  }
}
