// src/lib/preview/PreviewService.ts
// Thin service layer over PreviewProcessManager.
// Validates input, resolves project path, delegates to manager.

import * as path from 'path';
import * as fs from 'fs';
import { previewProcessManager } from './PreviewProcessManager';
import type { PreviewState, PreviewLogEntry, StartPreviewInput } from './types';

const DEFAULT_PORT = 3100;

/** Workspace root — all preview paths must be under here */
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

class PreviewService {
  private static instance: PreviewService | null = null;
  static getInstance(): PreviewService {
    if (!PreviewService.instance) PreviewService.instance = new PreviewService();
    return PreviewService.instance;
  }

  /** Start a preview for the given project path (relative or absolute). */
  async start(rawPath: string, port = DEFAULT_PORT): Promise<{ ok: boolean; state: PreviewState; error?: string }> {
    const resolved = this.resolveSafe(rawPath);
    if (!resolved.ok) return { ok: false, state: previewProcessManager.getState(), error: resolved.error };

    // Check node_modules exists
    const nmDir = path.join(resolved.path, 'node_modules');
    if (!fs.existsSync(nmDir)) {
      return {
        ok: false,
        state: previewProcessManager.getState(),
        error: `node_modules not found at ${resolved.path}. Run npm install first.`,
      };
    }

    const input: StartPreviewInput = { projectPath: resolved.path, port };
    const state = await previewProcessManager.start(input);
    const ok = state.status === 'running' || state.status === 'starting';
    return { ok, state, error: state.lastError ?? undefined };
  }

  async stop(): Promise<{ ok: boolean; state: PreviewState }> {
    const state = await previewProcessManager.stop();
    return { ok: true, state };
  }

  async restart(rawPath: string, port = DEFAULT_PORT): Promise<{ ok: boolean; state: PreviewState; error?: string }> {
    const resolved = this.resolveSafe(rawPath);
    if (!resolved.ok) return { ok: false, state: previewProcessManager.getState(), error: resolved.error };
    const input: StartPreviewInput = { projectPath: resolved.path, port };
    const state = await previewProcessManager.restart(input);
    const ok = state.status === 'running';
    return { ok, state, error: state.lastError ?? undefined };
  }

  getState(): PreviewState {
    return previewProcessManager.getState();
  }

  getLogs(lastN?: number): PreviewLogEntry[] {
    return previewProcessManager.getLogs(lastN);
  }

  // ── Private ──────────────────────────────────────────────

  private resolveSafe(rawPath: string): { ok: true; path: string } | { ok: false; error: string } {
    const abs = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(WORKSPACE_ROOT, rawPath);
    const normalized = path.normalize(abs);

    if (!normalized.startsWith(WORKSPACE_ROOT)) {
      return { ok: false, error: `Path outside workspace root: ${normalized}` };
    }
    if (!fs.existsSync(normalized)) {
      return { ok: false, error: `Path does not exist: ${normalized}` };
    }
    const pkgJson = path.join(normalized, 'package.json');
    if (!fs.existsSync(pkgJson)) {
      return { ok: false, error: `No package.json at ${normalized}` };
    }
    return { ok: true, path: normalized };
  }
}

export const previewService = PreviewService.getInstance();
