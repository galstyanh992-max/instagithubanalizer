// Real filesystem.list capability. Reuses the daemon's existing safety
// primitive (PathGuard, already used by HEALTH_CHECK/WRITE_TEST_ARTIFACT/
// READ_METADATA) rather than the web-only route logic in
// src/app/api/files/list/route.ts, which is inline in a Next.js request
// handler (not a separately importable function) and gated to
// localhost-only web requests — not reachable from a daemon process anyway.
// Scope is intentionally narrow: one level, read-only, resolves under an
// allowed root (project root via process.cwd(), or an explicit safe
// sub-path the caller supplies), matching "Do NOT send an unrestricted
// absolute-path executor from the frontend."
import fs from 'fs';
import path from 'path';
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';
import { PathGuard } from '../sandbox/path-guard';

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.jarvis', 'vendor', '.playwright-mcp', '.playwright-cli']);
const MAX_ENTRIES = 500;

function isHidden(name: string): boolean {
  return name.startsWith('.') && name !== '.' && name !== '..';
}

export const filesystemExecutor: DaemonCapabilityExecutor = {
  id: 'filesystem',
  canHandle: (capability) => capability === 'filesystem',
  validate: (envelope) => {
    if (envelope.operation !== 'list') {
      return { ok: false, reason: `Неподдерживаемая операция filesystem: ${envelope.operation}` };
    }
    return { ok: true };
  },
  async execute(envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');

      const requestedRelative = typeof envelope.arguments?.path === 'string' ? envelope.arguments.path : '';
      // Base is always the project root (process.cwd() — one of
      // PathGuard's allowed roots); a caller-supplied path is a relative
      // sub-path under it, never an absolute filesystem path.
      const projectRoot = process.cwd();
      const target = requestedRelative
        ? path.resolve(projectRoot, requestedRelative.replace(/^[/\\]+/, ''))
        : projectRoot;

      let safeTarget: string;
      try {
        safeTarget = PathGuard.assertSafePath(target, true);
      } catch (error: any) {
        return fail(`Путь запрещён политикой безопасности: ${error?.message ?? String(error)}`);
      }

      const stat = await fs.promises.stat(safeTarget);
      if (!stat.isDirectory()) {
        return fail('Указанный путь не является папкой');
      }

      const entries = await fs.promises.readdir(safeTarget, { withFileTypes: true });
      const items: Array<{ name: string; isDirectory: boolean; size: number | null }> = [];
      let truncated = false;

      for (const entry of entries) {
        if (isHidden(entry.name)) continue;
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
        if (items.length >= MAX_ENTRIES) { truncated = true; break; }
        let size: number | null = null;
        if (!entry.isDirectory()) {
          try {
            const entryStat = await fs.promises.stat(path.join(safeTarget, entry.name));
            size = entryStat.size;
          } catch { /* transient — omit size rather than fail the whole listing */ }
        }
        items.push({ name: entry.name, isDirectory: entry.isDirectory(), size });
      }

      items.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));

      return ok({ root: projectRoot, path: safeTarget, count: items.length, truncated, items });
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
