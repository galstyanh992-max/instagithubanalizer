import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { join, isAbsolute, extname, resolve, basename } from "node:path";
import { readFile } from "node:fs/promises";
import { getAllowedWorkspace, checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import type { AllowedWorkspace } from "@/lib/local-operator/types";

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

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (["localhost", "127.0.0.1", "[::1]"].includes(host)) return true;
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const firstIp = xff.split(",")[0]?.trim();
  return !!firstIp && ["127.0.0.1", "::1"].includes(firstIp);
}

function getBrowseRoot(): string {
  const ws = getAllowedWorkspace();
  if (ws) return ws.rootPath;
  if (process.platform === "win32") return "D:\\";
  return "/";
}

function getDriveWorkspace(rootPath: string): AllowedWorkspace {
  return {
    id: "drive",
    name: "Drive Root",
    rootPath: resolve(rootPath),
    allowedOperations: ["read_project_files", "open_preview"],
    requiresApprovalForWrite: true,
  };
}

export async function GET(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }
  const root = getBrowseRoot();
  const ws = getDriveWorkspace(root);
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
    const mime = MIME_MAP[ext] ?? "application/octet-stream";
    const buf = await readFile(target);
    const download = req.nextUrl.searchParams.get("download") === "1";
    const filename = basename(target);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
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