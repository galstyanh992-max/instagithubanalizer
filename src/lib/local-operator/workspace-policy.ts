import { resolve, isAbsolute, relative } from "path";
import { existsSync, realpathSync } from "node:fs";
import type { AllowedWorkspace } from "./types";

export function getAllowedWorkspace(): AllowedWorkspace | null {
  const root = process.env.AGENT_WORKSPACE_ROOT;
  if (!root) return null;
  return {
    id: "default", name: "Agent Workspace", rootPath: resolve(root),
    allowedOperations: ["read_project_files", "list_workspace", "open_preview", "run_safe_command", "prepare_file_change"],
    requiresApprovalForWrite: true,
  };
}

const BLOCKED_PATH_PATTERNS = [/\.env(\.|$)/i, /\bsecrets?\b/i, /\bcredentials?\b/i, /id_rsa|\.pem$|\.key$/i];
const OS_SYSTEM_DIRS = [/^\/etc\//, /^\/root\//, /^\/sys\//, /^C:\\Windows/i, /^C:\\Users\\[^\\]+\\AppData/i];

export interface PathCheckResult { ok: boolean; reason?: string; resolvedPath?: string }

/** Never reads/writes; only validates a candidate path against workspace + policy. */
export function checkPathAllowed(requestedPath: string | undefined, workspace: AllowedWorkspace | null): PathCheckResult {
  if (!workspace) return { ok: false, reason: "Workspace не настроен (local_agent_required)." };
  if (!requestedPath) return { ok: true, resolvedPath: workspace.rootPath };

  if (BLOCKED_PATH_PATTERNS.some((re) => re.test(requestedPath))) {
    return { ok: false, reason: "Доступ к .env/secrets/credentials/ключам запрещён." };
  }
  if (OS_SYSTEM_DIRS.some((re) => re.test(requestedPath))) {
    return { ok: false, reason: "Доступ к системным директориям ОС запрещён." };
  }

  const target = isAbsolute(requestedPath) ? resolve(requestedPath) : resolve(workspace.rootPath, requestedPath);
  const root = existsSync(workspace.rootPath) ? realpathSync.native(workspace.rootPath) : resolve(workspace.rootPath);
  const canonicalTarget = existsSync(target) ? realpathSync.native(target) : target;
  const rel = relative(root, canonicalTarget);
  if (rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(rel)) {
    return { ok: false, reason: "Path traversal за пределы workspace запрещён." };
  }
  return { ok: true, resolvedPath: canonicalTarget };
}
