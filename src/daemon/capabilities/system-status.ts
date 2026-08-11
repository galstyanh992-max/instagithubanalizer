// Real system.status capability — replaces the fabricated GPU/VRAM/temp
// values previously only found in src/app/api/os-metrics/route.ts (which
// also reports whichever machine the Next.js process happens to be running
// on, not necessarily HOME-PC). This executor runs inside the daemon
// process itself, so every value is guaranteed to be HOME-PC's own state.
// Subsystem checks are best-effort and independently timed out — a slow or
// absent subsystem is reported as `unknown`, never fabricated as healthy.
import os from 'os';
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';
import { DaemonConfig } from '../config';

const SUBSYSTEM_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | { timedOut: true }> {
  return Promise.race([
    promise,
    new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), ms)),
  ]);
}

async function checkOllama(): Promise<{ state: string; message?: string }> {
  try {
    const { ollamaAdapter } = await import('@/local-runtime/platform/ollama-adapter');
    const result = await withTimeout(ollamaAdapter.health(), SUBSYSTEM_TIMEOUT_MS);
    if ('timedOut' in result) return { state: 'UNKNOWN', message: 'timeout' };
    return { state: result.state, message: result.message };
  } catch (error: any) {
    return { state: 'UNKNOWN', message: error?.message ?? String(error) };
  }
}

async function checkN8n(): Promise<{ state: string; message?: string }> {
  try {
    const { phaseBDockerServiceManager } = await import('@/local-runtime/jarvis/phase-b/docker-service-manager');
    const result = await withTimeout(phaseBDockerServiceManager.state('n8n'), SUBSYSTEM_TIMEOUT_MS);
    if ('timedOut' in result) return { state: 'UNKNOWN', message: 'timeout' };
    return { state: result.running ? 'RUNNING' : 'STOPPED', message: result.status };
  } catch (error: any) {
    return { state: 'UNKNOWN', message: error?.message ?? String(error) };
  }
}

async function checkBrowser(): Promise<{ state: string }> {
  try {
    const { camofoxBrowserService } = await import('@/services/camofox-browser.service');
    const result = await withTimeout(camofoxBrowserService.health(), SUBSYSTEM_TIMEOUT_MS);
    if (typeof result === 'object' && 'timedOut' in result) return { state: 'UNKNOWN' };
    return { state: result ? 'RUNNING' : 'STOPPED' };
  } catch {
    return { state: 'UNKNOWN' };
  }
}

async function checkMcp(): Promise<{ state: string; connectedCount?: number }> {
  try {
    const { mcpClientManager } = await import('@/lib/mcp/McpClientManager');
    const connections = mcpClientManager.listConnections();
    return { state: connections.length > 0 ? 'INITIALIZED' : 'NOT_INITIALIZED', connectedCount: connections.length };
  } catch (error: any) {
    return { state: 'UNKNOWN' };
  }
}

export const systemStatusExecutor: DaemonCapabilityExecutor = {
  id: 'system',
  canHandle: (capability) => capability === 'system',
  validate: () => ({ ok: true }),
  async execute(_envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');

      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const loadAvg = os.loadavg(); // [1m, 5m, 15m] — 0s on Windows (documented Node.js limitation, not fabricated)

      const [ollama, n8n, browser, mcp] = await Promise.all([
        checkOllama(),
        checkN8n(),
        checkBrowser(),
        checkMcp(),
      ]);

      const payload = {
        host: {
          platform: os.platform(),
          release: os.release(),
          hostname: os.hostname(),
          cpuModel: cpus[0]?.model ?? null,
          cpuCores: cpus.length,
          loadAvg1m: loadAvg[0],
          totalMemBytes: totalMem,
          freeMemBytes: freeMem,
          usedMemPercent: Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
          systemUptimeSeconds: Math.round(os.uptime()),
        },
        daemon: {
          deviceName: DaemonConfig.DEVICE_NAME,
          processUptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          pid: process.pid,
        },
        subsystems: { ollama, n8n, browser, mcp },
        checkedAt: new Date().toISOString(),
      };

      return ok(payload);
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
