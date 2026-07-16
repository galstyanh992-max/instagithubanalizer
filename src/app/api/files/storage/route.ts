import { NextResponse } from "next/server";
import { parseStorageUrl, deleteFromStorage, downloadFromStorage } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/files/storage?url=<publicSupabaseUrl>
 * Removes a file from Supabase Storage by its public URL.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const parsed = parseStorageUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: "invalid storage url" }, { status: 400 });
    }

    await deleteFromStorage(parsed.key, parsed.bucket);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[files/storage] delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/storage?url=<publicSupabaseUrl>
 * Streams a file from Supabase Storage with Content-Disposition attachment.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const parsed = parseStorageUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: "invalid storage url" }, { status: 400 });
    }

    const buffer = await downloadFromStorage(parsed.key, parsed.bucket);
    const fileName = parsed.key.split("/").pop() ?? "download";

    return new NextResponse(buffer as unknown as ArrayBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[files/storage] download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
