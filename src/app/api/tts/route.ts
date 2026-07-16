import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, mkdtemp, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "node:crypto";
import { uploadAsset } from "@/services/storage.service";

export const runtime = "nodejs";

// Path to edge-tts CLI (installed via pip install edge-tts)
const EDGE_TTS_BIN =
  "C:\\Users\\Admin\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python313\\Scripts\\edge-tts.exe";

export async function POST(req: Request) {
  try {
    const { text, voice = "ru-RU-SvetlanaNeural" } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Create temp file for the audio output
    const dir = await mkdtemp(join(tmpdir(), "tts-"));
    const outFile = join(dir, "audio.mp3");

    await new Promise<void>((resolve, reject) => {
      execFile(
        EDGE_TTS_BIN,
        ["--voice", voice, "--text", text, "--write-media", outFile],
        { timeout: 30000, maxBuffer: 1024 * 1024 },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const audio = await readFile(outFile);

    // Upload generated audio to Supabase Storage so it does not stay on the PC
    const { publicUrl } = await uploadAsset(
      "tts",
      audio,
      `${randomUUID()}.mp3`,
      "audio/mpeg"
    );

    // Cleanup temp file
    await unlink(outFile).catch(() => {});

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("[tts] error:", error);
    return NextResponse.json(
      { error: `TTS failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
