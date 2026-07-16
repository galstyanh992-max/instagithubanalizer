import { NextResponse } from "next/server";
import { uploadAsset, fileToBuffer } from "@/services/storage.service";

export const runtime = "nodejs";

/**
 * Upload JSON / JSONL / TXT import files to Supabase Storage.
 * Returns the public Supabase URL so the client can trigger batch analysis.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!/\.(json|jsonl|txt)$/i.test(file.name)) {
      return NextResponse.json(
        { error: "only .json, .jsonl, .txt are supported" },
        { status: 400 }
      );
    }

    const buffer = await fileToBuffer(file);
    const stored = await uploadAsset(
      "imports",
      buffer,
      file.name,
      file.type || "application/json"
    );

    return NextResponse.json({
      url: stored.publicUrl,
      key: stored.key,
      bucket: stored.bucket,
      size: stored.size,
    });
  } catch (error) {
    console.error("[import-upload] error:", error);
    return NextResponse.json(
      {
        error: `Upload failed: ${error instanceof Error ? error.message : "unknown"}`,
      },
      { status: 500 }
    );
  }
}
