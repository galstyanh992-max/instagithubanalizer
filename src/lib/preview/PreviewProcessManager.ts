// src/lib/preview/PreviewProcessManager.ts
// Manages a single child process running a preview dev server.
// Designed for local-only use — no Docker, no Vercel.

import { spawn, type ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import type { PreviewState, PreviewStatus, PreviewLogEntry, StartPreviewInput } from './types';

// ── Constants ─────────────────────────────────────────────────

const MAX_LOG_LINES = 500;
const PORT_CHECK_TIMEOUT_MS = 30_000;   // 30s to confirm port open
const PORT_CHECK_INTERVAL_MS = 500;
const DEFAULT_PORT = 3100;

// Only these env keys are forwarded to the child process
const ENV_WHITELIST = new Set([
  'PATH', 'HOME', 'USER', 'LANG', 'LC_ALL', 'TERM',
  'NODE_ENV', 'npm_config_cache',
]);

// ── Port utilities ────────────────────────────────────────────

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => { socket.destroy(); resolve(false); };
    socket.setTimeout(300);
    socket.on('error', onError);
    socket.on('timeout', onError);
    socket.connect(port, '127.0.0.1', () => {
      socket.destroy();
      resolve(true);
    });
  });
}

function isPortBound(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));   // port already in use
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port)) return true;
    await new Promise(r => setTimeout(r, PORT_CHECK_INTERVAL_MS));
  }
  return false;
}

// ── Manager ───────────────────────────────────────────────────

class PreviewProcessManager {
  private static instance: PreviewProcessManager | null = null;

  private proc: ChildProcess | null = null;
  private logs: PreviewLogEntry[] = [];
  private state: PreviewState = {
    status: 'idle',
    port: DEFAULT_PORT,
    pid: null,
    startedAt: null,
    stoppedAt: null,
    lastError: null,
    previewDir: null,
    url: null,
  };

  private constructor() {}

  static getInstance(): PreviewProcessManager {
    if (!PreviewProcessManager.instance) {
      PreviewProcessManager.instance = new PreviewProcessManager();
    }
    return PreviewProcessManager.instance;
  }

  // ── Public API ────────────────────────────────────────────

  getState(): PreviewState {
    return { ...this.state };
  }

  getLogs(lastN?: number): PreviewLogEntry[] {
    return lastN ? this.logs.slice(-lastN) : [...this.logs];
  }

  async start(input: StartPreviewInput): Promise<PreviewState> {
    if (this.state.status === 'starting' || this.state.status === 'running') {
      return this.getState();
    }

    const port = input.port ?? DEFAULT_PORT;
    const projectPath = path.resolve(input.projectPath);

    // ── Safety: validate project path ────────────────────────
    const workspaceRoot = process.env.WORKSPACE_ROOT ?? path.join(process.cwd());
    if (!projectPath.startsWith(workspaceRoot)) {
      this.setState({ status: 'error', lastError: `Path outside workspace root: ${projectPath}` });
      return this.getState();
    }

    // ── Check package.json exists ─────────────────────────────
    const pkgJson = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgJson)) {
      this.setState({ status: 'error', lastError: `No package.json found at ${projectPath}` });
      return this.getState();
    }

    // ── Check if port already bound by someone else ───────────
    if (await isPortBound(port)) {
      this.setState({ status: 'port_in_use', lastError: `Port ${port} is already in use` });
      return this.getState();
    }

    // ── Kill existing process if any ──────────────────────────
    await this.kill();

    // ── Build safe env ────────────────────────────────────────
    const safeEnv: Record<string, string> = {};
    for (const key of ENV_WHITELIST) {
      if (process.env[key]) safeEnv[key] = process.env[key]!;
    }
    safeEnv['PORT'] = String(port);
    // Apply whitelisted overrides from caller
    if (input.env) {
      for (const [k, v] of Object.entries(input.env)) {
        if (ENV_WHITELIST.has(k)) safeEnv[k] = v;
      }
    }

    // ── Spawn ─────────────────────────────────────────────────
    this.clearLogs();
    this.setState({
      status: 'starting',
      port,
      pid: null,
      startedAt: Date.now(),
      stoppedAt: null,
      lastError: null,
      previewDir: projectPath,
      url: null,
    });

    // Detect package manager
    const hasBunLock = fs.existsSync(path.join(projectPath, 'bun.lock'));
    const cmd = hasBunLock ? 'bun' : 'npm';
    const args = hasBunLock
      ? ['run', 'dev', '--', '-p', String(port)]
      : ['run', 'dev', '--', '-p', String(port)];

    try {
      this.proc = spawn(cmd, args, {
        cwd: projectPath,
        env: safeEnv as NodeJS.ProcessEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setState({ status: 'error', lastError: `Failed to spawn: ${msg}` });
      return this.getState();
    }

    this.state.pid = this.proc.pid ?? null;

    // ── Wire stdout/stderr ────────────────────────────────────
    this.proc.stdout?.on('data', (chunk: Buffer) => {
      this.appendLogs('stdout', chunk.toString());
    });
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      this.appendLogs('stderr', chunk.toString());
    });

    // ── Handle exit ───────────────────────────────────────────
    this.proc.on('exit', (code, signal) => {
      const wasRunning = this.state.status === 'running' || this.state.status === 'starting';
      this.proc = null;
      this.setState({
        status: code === 0 || signal === 'SIGTERM' ? 'stopped' : 'error',
        pid: null,
        stoppedAt: Date.now(),
        lastError: code !== 0 && code !== null ? `Exited with code ${code}` : null,
        url: null,
      });
      if (wasRunning && code !== 0 && signal !== 'SIGTERM') {
        this.appendLogs('stderr', `[preview] Process exited with code ${code}`);
      }
    });

    this.proc.on('error', (err) => {
      this.setState({ status: 'error', lastError: err.message, url: null });
      this.appendLogs('stderr', `[preview] Spawn error: ${err.message}`);
    });

    // ── Wait for port ─────────────────────────────────────────
    const ready = await waitForPort(port, PORT_CHECK_TIMEOUT_MS);
    if (!ready) {
      if (this.state.status !== 'stopped' && this.state.status !== 'error') {
        this.setState({ status: 'error', lastError: `Port ${port} never opened within ${PORT_CHECK_TIMEOUT_MS}ms` });
      }
      return this.getState();
    }

    const currentStatus = this.state.status as string;
    if (currentStatus === 'starting') {
      this.setState({ status: 'running', url: `http://localhost:${port}` });
    }

    return this.getState();
  }

  async stop(): Promise<PreviewState> {
    await this.kill();
    return this.getState();
  }

  async restart(input: StartPreviewInput): Promise<PreviewState> {
    await this.kill();
    return this.start(input);
  }

  // ── Private helpers ───────────────────────────────────────

  private async kill(): Promise<void> {
    if (!this.proc) return;
    this.setState({ status: 'stopping' });
    const proc = this.proc;
    this.proc = null;
    return new Promise((resolve) => {
      proc.once('exit', () => {
        this.setState({ status: 'stopped', pid: null, stoppedAt: Date.now(), url: null });
        resolve();
      });
      try {
        proc.kill('SIGTERM');
        // Force SIGKILL after 5s if still alive
        setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch {}
          resolve();
        }, 5000);
      } catch {
        resolve();
      }
    });
  }

  private setState(partial: Partial<PreviewState>): void {
    this.state = { ...this.state, ...partial };
  }

  private appendLogs(stream: 'stdout' | 'stderr', raw: string): void {
    const lines = raw.split('\n').filter(l => l.trim());
    const ts = Date.now();
    for (const line of lines) {
      this.logs.push({ ts, stream, line });
    }
    // Enforce max buffer
    if (this.logs.length > MAX_LOG_LINES) {
      this.logs = this.logs.slice(-MAX_LOG_LINES);
    }
  }

  private clearLogs(): void {
    this.logs = [];
  }
}

export const previewProcessManager = PreviewProcessManager.getInstance();
