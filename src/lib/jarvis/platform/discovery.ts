// Thin shared-tree proxy for platform discovery. The real implementation
// (PATH walking, execFile version checks, Docker CLI, MCP tool discovery,
// per-adapter health/status/metrics polling) lives at
// src/local-runtime/platform/discovery.ts and is local-runtime only.
//
// In web-control-plane mode this never runs local discovery — Vercel must
// never attempt to discover installed programs against its own serverless
// environment for the HOME-PC device. It only returns the last persisted
// program/capability projection (local-JSON-backed registries; see
// program-registry.ts / persistent-registry.ts). That projection is honest:
// on Vercel it is empty until a real Supabase-backed device projection sync
// exists (tracked separately, out of scope for this pass — see
// reports/JARVIS_VERCEL_LOCAL_RUNTIME_MIGRATION.md).
import { env } from '@/lib/env';
import { capabilityRegistry } from './capability-registry';
import { programRegistry } from './program-registry';
import type { CapabilityRecord, ProgramRecord } from './types';

export async function refreshPlatformDiscovery(force = false): Promise<{ programs: ProgramRecord[]; capabilities: CapabilityRecord[] }> {
  if (env.JARVIS_RUNTIME_ROLE === 'web-control-plane') {
    return { programs: await programRegistry.list(), capabilities: await capabilityRegistry.list() };
  }
  const { refreshPlatformDiscovery: realRefresh } = await import('@/local-runtime/platform/discovery');
  return realRefresh(force);
}
