import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { join, isAbsolute, extname, basename } from "node:path";
import { readFile } from "node:fs/promises";
import { checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
  ".ico": "image/x-icon", ".avif": "image/avif", ".apng": "image/apng",
  ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  ".wav": "audio/wav", ".ogg": "audio/ogg", ".zip": "application/zip",
  ".gz": "application/gzip", ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed", ".tar": "application/x-tar",
  ".exe": "application/octet-stream", ".dll": "application/octet-stream",
  ".so": "application/octet-stream", ".dylib": "application/octet-stream",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff",
  ".woff2": "font/woff2", ".txt": "text/plain", ".md": "text/markdown",
  ".json": "application/json", ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".ts": "text/typescript",
};
const ACTIVE_CONTENT = new Set([".html", ".htm", ".svg", ".js", ".mjs", ".css", ".xml"]);

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (["localhost", "127.0.0.1", "[::1]"].includes(host)) return true;
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const firstIp = xff.split(",")[0]?.trim();
  return !!firstIp && ["127.0.0.1", "::1"].includes(firstIp);
}

export async function GET(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return NextResponse.json({ error: "Local file access runs on the local JARVIS runtime only." }, { status: 501 });
  }
  const { getBrowseRoot, getDriveWorkspace } = await import("@/local-runtime/api-helpers/drive-browse");
  const root = getBrowseRoot();
  const ws = getDriveWorkspace(root, ["read_project_files", "open_preview"]);
  const rel = req.nextUrl.searchParams.get("path") ?? "";
  if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });
  const requested = isAbsolute(rel) ? rel : join(root, rel);
  const check = checkPathAllowed(requested, ws);
  if (!check.ok || !check.resolvedPath) {
    return NextResponse.json({ error: check.reason ?? "Access denied" }, { status: 403 });
  }
  const target = check.resolvedPath;

  try {
    const s = await stat(target);
    if (!s.isFile()) return NextResponse.json({ error: "Not a file" }, { status: 400 });

    const ext = extname(target).toLowerCase();
    const activeContent = ACTIVE_CONTENT.has(ext);
    const mime = activeContent ? "application/octet-stream" : MIME_MAP[ext] ?? "application/octet-stream";
    const buf = await readFile(target);
    const download = activeContent || req.nextUrl.searchParams.get("download") === "1";
    const filename = basename(target).replace(/["\r\n]/g, "_");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${filename}"` }
          : { "Content-Disposition": `inline; filename="${filename}"` }),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read error" },
      { status: 500 }
    );
  }
}
