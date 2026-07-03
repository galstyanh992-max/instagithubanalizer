// src/lib/tool-hub/adapters/project.ts
// Real project tool adapters — build, typecheck, lint, test.
// Uses child_process.spawn only (no exec, no shell:true).

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ToolAdapter, ToolExecutionInput, ToolExecutionOutput } from '../types';
import { getWorkspaceRoot, resolveSafe } from './filesystem';

// ── Spawn helper ──────────────────────────────────────────────

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

function runNpm(args: string[], cwd: string, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    let timedOut = false;

    const proc = spawn('npm', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/usr/local/bin:/bin',
        HOME: process.env.HOME ?? '',
        ...(process.env.npm_config_cache ? { npm_config_cache: process.env.npm_config_cache } : {}),
      } as unknown as NodeJS.ProcessEnv,
    });

    proc.stdout.on('data', (d: Buffer) => outChunks.push(d));
    proc.stderr.on('data', (d: Buffer) => errChunks.push(d));

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 5000);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(outChunks).toString('utf-8'),
        stderr: Buffer.concat(errChunks).toString('utf-8'),
        durationMs: Date.now() - start,
        timedOut,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: `Spawn error: ${err.message}`,
        durationMs: Date.now() - start,
        timedOut: false,
      });
    });
  });
}

// ── Shared validation ─────────────────────────────────────────

function validateProjectDir(rawDir?: string): { ok: true; cwd: string } | { ok: false; error: string } {
  const dir = rawDir ?? '.';
  const safe = resolveSafe(dir);
  if (!safe.ok) return { ok: false, error: (safe as { ok: false; error: string }).error };

  if (!fs.existsSync(path.join(safe.abs, 'package.json'))) {
    return { ok: false, error: `No package.json found in ${dir}` };
  }
  if (!fs.existsSync(path.join(safe.abs, 'node_modules'))) {
    return { ok: false, error: `node_modules not found in ${dir}. Run npm install first.` };
  }
  return { ok: true, cwd: safe.abs };
}

// ── Truncate large output ─────────────────────────────────────

function truncate(s: string, maxChars = 20_000): string {
  if (s.length <= maxChars) return s;
  const half = Math.floor(maxChars / 2);
  return s.slice(0, half) + '\n\n[... truncated ...]\n\n' + s.slice(-half);
}

// ── project.build ─────────────────────────────────────────────

export const projectBuildAdapter: ToolAdapter = {
  key: 'project.build',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const dir = inp.dir as string | undefined;
    const validated = validateProjectDir(dir);
    if (!validated.ok) return { success: false, error: (validated as { ok: false; error: string }).error, metadata: { adapter: 'project.build' } };

    const TIMEOUT = 5 * 60_000; // 5 min
    const result = await runNpm(['run', 'build'], validated.cwd, TIMEOUT);

    return {
      success: result.exitCode === 0 && !result.timedOut,
      data: {
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdout: truncate(result.stdout),
        stderr: truncate(result.stderr),
        timedOut: result.timedOut,
      },
      error: result.timedOut
        ? `Build timed out after ${TIMEOUT}ms`
        : result.exitCode !== 0 ? `Build failed with exit code ${result.exitCode}` : undefined,
      metadata: { adapter: 'project.build', real: true },
    };
  },
};

// ── project.typecheck ─────────────────────────────────────────

export const projectTypecheckAdapter: ToolAdapter = {
  key: 'project.typecheck',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const validated = validateProjectDir(inp.dir as string | undefined);
    if (!validated.ok) return { success: false, error: (validated as { ok: false; error: string }).error, metadata: { adapter: 'project.typecheck' } };

    const pkg = JSON.parse(fs.readFileSync(path.join(validated.cwd, 'package.json'), 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;

    let args: string[];
    if (scripts.typecheck) {
      args = ['run', 'typecheck'];
    } else {
      // Fall back to npx tsc --noEmit
      return runTscDirect(validated.cwd);
    }

    const TIMEOUT = 3 * 60_000;
    const result = await runNpm(args, validated.cwd, TIMEOUT);
    return {
      success: result.exitCode === 0,
      data: { exitCode: result.exitCode, stdout: truncate(result.stdout), stderr: truncate(result.stderr), durationMs: result.durationMs },
      error: result.exitCode !== 0 ? `Typecheck failed (${result.exitCode})` : undefined,
      metadata: { adapter: 'project.typecheck', real: true },
    };
  },
};

async function runTscDirect(cwd: string): Promise<ToolExecutionOutput> {
  const TIMEOUT = 3 * 60_000;
  const result = await runNpm(['exec', 'tsc', '--', '--noEmit'], cwd, TIMEOUT);
  return {
    success: result.exitCode === 0,
    data: { exitCode: result.exitCode, stdout: truncate(result.stdout), stderr: truncate(result.stderr), durationMs: result.durationMs },
    error: result.exitCode !== 0 ? `Typecheck failed (${result.exitCode})` : undefined,
    metadata: { adapter: 'project.typecheck', real: true, via: 'npx tsc' },
  };
}

// ── project.lint ──────────────────────────────────────────────

export const projectLintAdapter: ToolAdapter = {
  key: 'project.lint',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const validated = validateProjectDir(inp.dir as string | undefined);
    if (!validated.ok) return { success: false, error: (validated as { ok: false; error: string }).error, metadata: { adapter: 'project.lint' } };

    const TIMEOUT = 2 * 60_000;
    const result = await runNpm(['run', 'lint'], validated.cwd, TIMEOUT);
    return {
      success: result.exitCode === 0,
      data: { exitCode: result.exitCode, stdout: truncate(result.stdout), stderr: truncate(result.stderr), durationMs: result.durationMs },
      error: result.exitCode !== 0 ? `Lint failed (${result.exitCode})` : undefined,
      metadata: { adapter: 'project.lint', real: true },
    };
  },
};

// ── project.test ──────────────────────────────────────────────

export const projectTestAdapter: ToolAdapter = {
  key: 'project.test',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const validated = validateProjectDir(inp.dir as string | undefined);
    if (!validated.ok) return { success: false, error: (validated as { ok: false; error: string }).error, metadata: { adapter: 'project.test' } };

    const pkg = JSON.parse(fs.readFileSync(path.join(validated.cwd, 'package.json'), 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;
    if (!scripts.test) {
      return { success: false, error: 'No test script found in package.json', metadata: { adapter: 'project.test' } };
    }

    const TIMEOUT = 5 * 60_000;
    const result = await runNpm(['run', 'test', '--', '--passWithNoTests'], validated.cwd, TIMEOUT);
    return {
      success: result.exitCode === 0,
      data: { exitCode: result.exitCode, stdout: truncate(result.stdout), stderr: truncate(result.stderr), durationMs: result.durationMs },
      error: result.exitCode !== 0 ? `Tests failed (${result.exitCode})` : undefined,
      metadata: { adapter: 'project.test', real: true },
    };
  },
};
