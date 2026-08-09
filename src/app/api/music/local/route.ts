import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav", ".weba"]);

function trackTitle(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    const musicDirectory = path.join(process.cwd(), "public", "music");
    const entries = await readdir(musicDirectory, { withFileTypes: true });
    const tracks = entries
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => ({
        title: trackTitle(entry.name) || entry.name,
        url: `/music/${encodeURIComponent(entry.name)}`,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [], error: "Не удалось прочитать локальную папку с музыкой." }, { status: 500 });
  }
}
