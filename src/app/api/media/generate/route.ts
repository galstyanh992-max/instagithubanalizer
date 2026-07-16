import { NextResponse } from "next/server";
import { generateMedia, transcribeAudio, type MediaRequest, type MediaType } from "@/services/media-router.service";
import { fileToBuffer } from "@/services/storage.service";
import { initProviders } from "@/lib/ai-provider/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await initProviders();
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const type = (formData.get("type") as MediaType) ?? "transcription";
      const prompt = (formData.get("prompt") as string) ?? "";

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }
      if (type !== "transcription") {
        return NextResponse.json({ error: "multipart uploads are only supported for transcription" }, { status: 400 });
      }

      const buffer = await fileToBuffer(file);
      const result = await transcribeAudio(buffer, file.type || "audio/mpeg", file.name);
      return NextResponse.json(result);
    }

    const body: MediaRequest = await req.json();
    if (!body.prompt || !body.type) {
      return NextResponse.json({ error: "prompt and type are required" }, { status: 400 });
    }

    const result = await generateMedia(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[media/generate] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
