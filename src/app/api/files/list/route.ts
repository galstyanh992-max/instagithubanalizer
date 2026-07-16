import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { join, resolve, isAbsolute, sep } from "node:path";
import { getAllowedWorkspace, checkPathAllowed } from "@/lib/local-operator/workspace-policy";
import type { AllowedWorkspace } from "@/lib/local-operator/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (["localhost", "127.0.0.1", "[::1]"].includes(host)) return true;
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const firstIp = xff.split(",")[0]?.trim();
  return !!firstIp && ["127.0.0.1", "::1"].includes(firstIp);
}

// Root for browsing: AGENT_WORKSPACE_ROOT if set, otherwise whole D: drive on Windows,
// or filesystem root on Linux/macOS.
function getBrowseRoot(): string {
  const ws = getAllowedWorkspace();
  if (ws) return ws.rootPath;
  if (process.platform === "win32") return "D:\\";
  return "/";
}

// Permissive workspace for the whole-drive access (still gated by checkPathAllowed
// which blocks .env/secrets/credentials/keys and OS system dirs).
function getDriveWorkspace(rootPath: string): AllowedWorkspace {
  return {
    id: "drive",
    name: "Drive Root",
    rootPath: resolve(rootPath),
    allowedOperations: ["read_project_files", "list_workspace", "open_preview"],
    requiresApprovalForWrite: true,
  };
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
  const root = getBrowseRoot();
  const ws = getDriveWorkspace(root);
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