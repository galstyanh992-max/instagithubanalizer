// src/lib/tool-hub/adapters/filesystem.ts
// Real filesystem adapter — sandboxed to workspace root.

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import type { ToolAdapter, ToolExecutionInput, ToolExecutionOutput } from '../types';

// ── Workspace root (process.cwd() = project root in Next.js) ─

let workspaceRootCache: string | null = null;
export function getWorkspaceRoot(): string {
  if (!workspaceRootCache) {
    const root = process.env.WORKSPACE_ROOT || /*turbopackIgnore: true*/ process.cwd();
    workspaceRootCache = fsSync.realpathSync(path.resolve(/*turbopackIgnore: true*/ root));
  }
  return workspaceRootCache;
}

// ── Deny-listed path segments ─────────────────────────────────

const DENIED_PATTERNS = [
  /^\.env($|\.)/, // .env, .env.local, .env.*
  /node_modules/,
  /^\.git(\/|$)/,
];

// ── Path safety ───────────────────────────────────────────────

function resolveRealpathIfExtant(target: string): string {
  let curr = target;
  while (curr !== path.parse(curr).root) {
    try {
      if (fsSync.existsSync(curr)) {
        const real = fsSync.realpathSync(curr);
        return path.join(real, path.relative(curr, target));
      }
    } catch {
      // Ignore
    }
    const next = path.dirname(curr);
    if (next === curr) break;
    curr = next;
  }
  return target;
}

export function resolveSafe(rawPath: string): { ok: true; abs: string } | { ok: false; error: string } {
  const wsRoot = getWorkspaceRoot();
  const abs = path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.normalize(path.join(/*turbopackIgnore: true*/ wsRoot, rawPath));

  const realAbs = resolveRealpathIfExtant(abs);

  const rel = path.relative(wsRoot, realAbs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, error: `Path outside workspace: ${abs}` };
  }

  const normalizedRel = rel.replace(/\\/g, '/');
  for (const pattern of DENIED_PATTERNS) {
    if (pattern.test(normalizedRel) || pattern.test(path.basename(realAbs))) {
      return { ok: false, error: `Access denied: ${rel}` };
    }
  }

  return { ok: true, abs: realAbs };
}

// ── Read ──────────────────────────────────────────────────────

export const filesystemReadAdapter: ToolAdapter = {
  key: 'filesystem.read',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const rawPath = (input.input as Record<string, unknown>)?.path as string ?? String(input.input ?? '');
    const safe = resolveSafe(rawPath);
    if (!safe.ok) return { success: false, error: (safe as { ok: false; error: string }).error, metadata: { adapter: 'filesystem.read' } };

    try {
      const stat = await fs.stat( /*turbopackIgnore: true*/ safe.abs);
      if (stat.isDirectory()) {
        return { success: false, error: `Path is a directory: ${rawPath}. Use filesystem.list instead.`, metadata: { adapter: 'filesystem.read' } };
      }
      if (stat.size > 1_000_000) {
        return { success: false, error: `File too large (${stat.size} bytes > 1MB limit)`, metadata: { adapter: 'filesystem.read' } };
      }
      const content = await fs.readFile(/*turbopackIgnore: true*/ safe.abs, 'utf-8');
      return {
        success: true,
        data: {
          path: rawPath,
          abs: safe.abs,
          content,
          size: stat.size,
          lines: content.split('\n').length,
        },
        metadata: { adapter: 'filesystem.read', real: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Read failed: ${msg}`, metadata: { adapter: 'filesystem.read' } };
    }
  },
};

// ── Write ─────────────────────────────────────────────────────

export const filesystemWriteAdapter: ToolAdapter = {
  key: 'filesystem.write',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const rawPath = inp.path as string ?? '';
    const content = inp.content as string ?? '';
    const overwrite = inp.overwrite === true; // explicit opt-in to overwrite

    if (!rawPath) return { success: false, error: 'Missing path', metadata: { adapter: 'filesystem.write' } };

    const safe = resolveSafe(rawPath);
    if (!safe.ok) return { success: false, error: (safe as { ok: false; error: string }).error, metadata: { adapter: 'filesystem.write' } };

    // If file exists and no explicit overwrite flag → surface for approval at ToolHub level
    const exists = fsSync.existsSync( /*turbopackIgnore: true*/ safe.abs);
    if (exists && !overwrite) {
      return {
        success: false,
        error: `File already exists: ${rawPath}. Set overwrite:true to overwrite, or this action requires human approval.`,
        metadata: { adapter: 'filesystem.write', requiresApproval: true, existingFile: true },
      };
    }

    try {
      await fs.mkdir(path.dirname( /*turbopackIgnore: true*/ safe.abs), { recursive: true });
      await fs.writeFile( /*turbopackIgnore: true*/ safe.abs, content, 'utf-8');
      const stat = await fs.stat( /*turbopackIgnore: true*/ safe.abs);
      return {
        success: true,
        data: {
          path: rawPath,
          abs: safe.abs,
          bytesWritten: stat.size,
          created: !exists,
          overwritten: exists,
        },
        metadata: { adapter: 'filesystem.write', real: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Write failed: ${msg}`, metadata: { adapter: 'filesystem.write' } };
    }
  },
};

// ── List ──────────────────────────────────────────────────────

export const filesystemListAdapter: ToolAdapter = {
  key: 'filesystem.list',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const rawPath = (input.input as Record<string, unknown>)?.path as string ?? String(input.input ?? '.');
    const safe = resolveSafe(rawPath);
    if (!safe.ok) return { success: false, error: (safe as { ok: false; error: string }).error, metadata: { adapter: 'filesystem.list' } };

    try {
      const entries = await fs.readdir( /*turbopackIgnore: true*/ safe.abs, { withFileTypes: true });
      const items = entries
        .filter(e => !e.name.startsWith('.git') && e.name !== 'node_modules')
        .map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'dir' : 'file',
          path: path.join(rawPath, e.name),
        }));
      return {
        success: true,
        data: { path: rawPath, items, count: items.length },
        metadata: { adapter: 'filesystem.list', real: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `List failed: ${msg}`, metadata: { adapter: 'filesystem.list' } };
    }
  },
};

// ── Exists ────────────────────────────────────────────────────

export const filesystemExistsAdapter: ToolAdapter = {
  key: 'filesystem.exists',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const rawPath = (input.input as Record<string, unknown>)?.path as string ?? String(input.input ?? '');
    const safe = resolveSafe(rawPath);
    if (!safe.ok) return { success: true, data: { exists: false, reason: (safe as { ok: false; error: string }).error }, metadata: { adapter: 'filesystem.exists' } };

    const exists = fsSync.existsSync( /*turbopackIgnore: true*/ safe.abs);
    let type: string | null = null;
    if (exists) {
      const stat = fsSync.statSync( /*turbopackIgnore: true*/ safe.abs);
      type = stat.isDirectory() ? 'dir' : 'file';
    }
    return {
      success: true,
      data: { path: rawPath, exists, type },
      metadata: { adapter: 'filesystem.exists', real: true },
    };
  },
};

// ── Search ────────────────────────────────────────────────────

const SEARCH_IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.turbo', 'coverage']);
const MAX_SEARCH_FILES = 500;

async function walkFiles(dir: string, results: string[]): Promise<void> {
  if (results.length >= MAX_SEARCH_FILES) return;
  let entries: fsSync.Dirent[];
  try { entries = await fs.readdir(dir, { withFileTypes: true }) as fsSync.Dirent[]; }
  catch { return; }

  for (const e of entries) {
    if (results.length >= MAX_SEARCH_FILES) break;
    if (e.isDirectory()) {
      if (!SEARCH_IGNORE_DIRS.has(e.name)) await walkFiles(path.join(dir, e.name), results);
    } else if (e.isFile()) {
      results.push(path.join(dir, e.name));
    }
  }
}

export const filesystemSearchAdapter: ToolAdapter = {
  key: 'filesystem.search',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const query = inp.query as string ?? String(input.input ?? '');
    const searchDir = inp.dir as string ?? '.';
    const caseSensitive = inp.caseSensitive === true;
    const isRegex = inp.regex === true;

    if (!query) return { success: false, error: 'Missing query', metadata: { adapter: 'filesystem.search' } };

    const safe = resolveSafe(searchDir);
    if (!safe.ok) return { success: false, error: (safe as { ok: false; error: string }).error, metadata: { adapter: 'filesystem.search' } };

    let pattern: RegExp;
    try {
      pattern = isRegex
        ? new RegExp(query, caseSensitive ? 'gm' : 'gim')
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'gm' : 'gim');
    } catch (err) {
      return { success: false, error: `Invalid regex: ${err}`, metadata: { adapter: 'filesystem.search' } };
    }

    const allFiles: string[] = [];
    await walkFiles( /*turbopackIgnore: true*/ safe.abs, allFiles);

    const matches: Array<{ file: string; line: number; text: string }> = [];
    const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.css', '.html', '.yaml', '.yml', '.toml', '.sh', '.py']);

    for (const filePath of allFiles) {
      if (matches.length >= 200) break;
      if (path.basename(filePath).startsWith('.env')) continue;
      if (!TEXT_EXTS.has(path.extname(filePath))) continue;
      let text: string;
      try { text = await fs.readFile(filePath, 'utf-8'); }
      catch { continue; }
      const lines = text.split('\n');
      lines.forEach((lineText, i) => {
        if (matches.length >= 200) return;
        if (pattern.test(lineText)) {
          pattern.lastIndex = 0;
          matches.push({
            file: path.relative(getWorkspaceRoot(), filePath),
            line: i + 1,
            text: lineText.trim().slice(0, 200),
          });
        }
        pattern.lastIndex = 0;
      });
    }

    return {
      success: true,
      data: { query, matches, totalFiles: allFiles.length, matchCount: matches.length },
      metadata: { adapter: 'filesystem.search', real: true },
    };
  },
};
