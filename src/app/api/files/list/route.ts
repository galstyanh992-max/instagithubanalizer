import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { join, isAbsolute, sep } from "node:path";
import { checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (["localhost", "127.0.0.1", "[::1]"].includes(host)) return true;
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const firstIp = xff.split(",")[0]?.trim();
  return !!firstIp && ["127.0.0.1", "::1"].includes(firstIp);
}

const HIDDEN = /^\./;
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".cache", "coverage",
  "$Recycle.Bin", "System Volume Information", "Windows", "Program Files",
  "Program Files (x86)", "ProgramData",
]);

export async function GET(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return NextResponse.json({ error: "Local drive browsing runs on the local JARVIS runtime only." }, { status: 501 });
  }
  const { getBrowseRoot, getDriveWorkspace } = await import("@/local-runtime/api-helpers/drive-browse");
  const root = getBrowseRoot();
  const ws = getDriveWorkspace(root, ["read_project_files", "list_workspace", "open_preview"]);
  const rel = req.nextUrl.searchParams.get("path") ?? "";
  const requested = rel ? (isAbsolute(rel) ? rel : join(root, rel)) : root;
  const check = checkPathAllowed(requested, ws);
  if (!check.ok || !check.resolvedPath) {
    return NextResponse.json({ error: check.reason ?? "Access denied" }, { status: 403 });
  }
  const target = check.resolvedPath;

  try {
    const entries = await readdir(target, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter(
          (e) =>
            !HIDDEN.test(e.name) &&
            !(e.isDirectory() && SKIP_DIRS.has(e.name))
        )
        .map(async (e) => {
          const fullPath = join(target, e.name);
          let size = 0;
          let mtime: number | null = null;
          try {
            const s = await stat(fullPath);
            size = s.size;
            mtime = s.mtimeMs;
          } catch {}
          return {
            name: e.name,
            path: fullPath.split(sep).join("/"),
            relPath: fullPath
              .slice(root.length)
              .split(sep)
              .join("/")
              .replace(/^\//, ""),
            isDirectory: e.isDirectory(),
            isSymlink: e.isSymbolicLink(),
            size,
            mtime,
          };
        })
    );
    items.sort((a, b) =>
      a.isDirectory === b.isDirectory
        ? a.name.localeCompare(b.name)
        : a.isDirectory
        ? -1
        : 1
    );
    return NextResponse.json({ root, current: target, items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read error" },
      { status: 500 }
    );
  }
}