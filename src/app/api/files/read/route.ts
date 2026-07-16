import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, isAbsolute, extname, resolve } from "node:path";
import { getAllowedWorkspace, checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import type { AllowedWorkspace } from "@/lib/local-operator/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No size limit — user wants to read any file on D:.

const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mdx", ".txt", ".css", ".scss",
  ".html", ".htm", ".yml", ".yaml", ".xml", ".svg", ".csv", ".tsv", ".toml",
  ".ini", ".sh", ".bash", ".zsh", ".ps1", ".py", ".rb", ".go", ".rs", ".java",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".sql", ".graphql", ".gql",
  ".vue", ".svelte", ".astro", ".lock", ".log", ".conf", ".cfg", ".properties",
  ".env.example", ".gitignore", ".prettierrc", ".eslintrc", ".editorconfig",
  ".dockerfile", ".txt", ".mjs", ".cjs", ".mts", ".cts", ".razor", ".ejs",
]);

// Image extensions — previewable inline via <img>
const IMAGE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".avif", ".apng",
]);

// MIME map for common binary types
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
  ".woff2": "font/woff2",
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
    const isText = TEXT_EXT.has(ext) || !ext;
    const isImage = IMAGE_EXT.has(ext);
    const mime = MIME_MAP[ext] ?? "application/octet-stream";

    if (isText) {
      const content = (await readFile(target)).toString("utf8");
      return NextResponse.json({
        path: target.split(/[\\/]/).join("/"),
        relPath: target
          .slice(root.length)
          .replace(/^[\\/]+/, "")
          .split(/[\\/]/)
          .join("/"),
        size: s.size,
        mtime: s.mtimeMs,
        kind: "text",
        content,
      });
    }

    if (isImage) {
      // Return base64 data URL for inline preview
      const buf = await readFile(target);
      const base64 = buf.toString("base64");
      return NextResponse.json({
        path: target.split(/[\\/]/).join("/"),
        relPath: target
          .slice(root.length)
          .replace(/^[\\/]+/, "")
          .split(/[\\/]/)
          .join("/"),
        size: s.size,
        mtime: s.mtimeMs,
        kind: "image",
        mime,
        dataUrl: `data:${mime};base64,${base64}`,
      });
    }

    // Other binary — return metadata + download URL
    return NextResponse.json({
      path: target.split(/[\\/]/).join("/"),
      relPath: target
        .slice(root.length)
        .replace(/^[\\/]+/, "")
        .split(/[\\/]/)
        .join("/"),
      size: s.size,
      mtime: s.mtimeMs,
      kind: "binary",
      mime,
      downloadUrl: `/api/files/raw?path=${encodeURIComponent(target.split(/[\\/]/).join("/"))}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read error" },
      { status: 500 }
    );
  }
}