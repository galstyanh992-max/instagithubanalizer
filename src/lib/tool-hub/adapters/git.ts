// src/lib/tool-hub/adapters/git.ts
// Real git adapter — read-only. Uses child_process.spawn, never exec/shell.

import { spawn } from 'child_process';
import * as path from 'path';
import type { ToolAdapter, ToolExecutionInput, ToolExecutionOutput } from '../types';
import { getWorkspaceRoot } from './filesystem';

// ── Spawn helper ──────────────────────────────────────────────

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runGit(args: string[], timeoutMs = 15_000): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    const proc = spawn('git', args, {
      cwd: getWorkspaceRoot(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        HOME: process.env.HOME ?? '',
        GIT_TERMINAL_PROMPT: '0', // never prompt
      } as unknown as NodeJS.ProcessEnv,
    });

    proc.stdout.on('data', (d: Buffer) => chunks.push(d));
    proc.stderr.on('data', (d: Buffer) => errChunks.push(d));

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ stdout: '', stderr: 'git command timed out', exitCode: 124 });
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(chunks).toString('utf-8').trim(),
        stderr: Buffer.concat(errChunks).toString('utf-8').trim(),
        exitCode: code ?? 1,
      });
    });
  });
}

// ── git status ────────────────────────────────────────────────

export const gitStatusAdapter: ToolAdapter = {
  key: 'git.status',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const result = await runGit(['status', '--porcelain', '-b']);
    if (result.exitCode !== 0) {
      return { success: false, error: `git status failed: ${result.stderr}`, metadata: { adapter: 'git.status' } };
    }

    const lines = result.stdout.split('\n').filter(Boolean);
    let branch = 'unknown';
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const m = line.slice(3).match(/^([^.]+)/);
        if (m) branch = m[1];
        continue;
      }
      const xy = line.slice(0, 2);
      const file = line.slice(3);
      if (xy[0] !== ' ' && xy[0] !== '?') staged.push(file);
      if (xy[1] !== ' ' && xy[1] !== '?') unstaged.push(file);
      if (xy === '??') untracked.push(file);
    }

    return {
      success: true,
      data: {
        branch,
        clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
        staged,
        unstaged,
        untracked,
        raw: result.stdout,
      },
      metadata: { adapter: 'git.status', real: true },
    };
  },
};

// ── git diff ──────────────────────────────────────────────────

export const gitDiffAdapter: ToolAdapter = {
  key: 'git.diff',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const args = ['diff'];
    if (inp.staged === true) args.push('--staged');
    else args.push('HEAD');
    if (inp.file) args.push('--', String(inp.file));

    const result = await runGit(args);
    if (result.exitCode !== 0 && result.stderr) {
      return { success: false, error: `git diff failed: ${result.stderr}`, metadata: { adapter: 'git.diff' } };
    }
    return {
      success: true,
      data: { diff: result.stdout, empty: result.stdout.length === 0 },
      metadata: { adapter: 'git.diff', real: true },
    };
  },
};

// ── git branch ────────────────────────────────────────────────

export const gitBranchAdapter: ToolAdapter = {
  key: 'git.branch',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const current = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    const all = await runGit(['branch', '-a', '--format=%(refname:short)']);
    if (current.exitCode !== 0) {
      return { success: false, error: `git branch failed: ${current.stderr}`, metadata: { adapter: 'git.branch' } };
    }
    return {
      success: true,
      data: {
        current: current.stdout,
        branches: all.stdout.split('\n').filter(Boolean),
      },
      metadata: { adapter: 'git.branch', real: true },
    };
  },
};

// ── git log ───────────────────────────────────────────────────

export const gitLogAdapter: ToolAdapter = {
  key: 'git.log',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    const inp = input.input as Record<string, unknown> ?? {};
    const limit = Math.min(Number(inp.limit ?? 20), 100);
    const oneline = inp.oneline !== false;
    const args = oneline
      ? ['log', `--max-count=${limit}`, '--oneline']
      : ['log', `--max-count=${limit}`, '--format=%H|%an|%ae|%ai|%s'];

    const result = await runGit(args);
    if (result.exitCode !== 0) {
      return { success: false, error: `git log failed: ${result.stderr}`, metadata: { adapter: 'git.log' } };
    }

    const commits = oneline
      ? result.stdout.split('\n').filter(Boolean).map(l => {
          const [hash, ...rest] = l.split(' ');
          return { hash, message: rest.join(' ') };
        })
      : result.stdout.split('\n').filter(Boolean).map(l => {
          const [hash, author, email, date, ...rest] = l.split('|');
          return { hash, author, email, date, message: rest.join('|') };
        });

    return {
      success: true,
      data: { commits, count: commits.length },
      metadata: { adapter: 'git.log', real: true },
    };
  },
};
