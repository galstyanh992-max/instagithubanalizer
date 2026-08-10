// Sanitized registry-projection payload shape shared between the HOME-PC
// daemon (which computes and publishes it) and the Vercel-safe API/frontend
// (which reads and displays it). Pure data transforms only — no local
// resource access here, so this file is safe to import from web-control-plane
// code. See docs/jarvis/remote-architecture.md ("registry projection").
//
// Architecture: HOME-PC's programRegistry/capabilityRegistry (local JSON
// files) remain the sole canonical registry. This module only shapes a
// sanitized, revision-hashed *projection* of that data for storage in
// Device.capabilitiesSnapshot (an existing, previously-unused Prisma field —
// reused here instead of introducing a second authoritative registry or a
// new table/migration).
import { createHash } from 'node:crypto';
import type { CapabilityRecord, ProgramRecord, RegistrySummary } from './types';

export interface SanitizedProgram {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  source: string;
  installed: boolean;
  enabled: boolean;
  running: boolean;
  status: string;
  health: string;
  health_message: string;
  version: string | null;
  capabilities: string[];
  success_rate: number;
  task_count: number;
  last_used: string | null;
}

export interface SanitizedCapability {
  id: string;
  name: string;
  kind: string;
  category: string;
  description: string;
  risk: string;
  trust_level: string;
  installed: boolean;
  enabled: boolean;
  running: boolean;
  health: string;
  version: string | null;
  priority: number;
  cost_class: string;
  latency_class: string;
  success_rate: number;
}

export interface RegistryProjectionPayload {
  schemaVersion: 1;
  generatedAt: string;
  revision: string;
  programRegistryRevision: string;
  capabilityRegistryRevision: string;
  programsSummary: RegistrySummary;
  capabilitiesSummary: RegistrySummary;
  programs: SanitizedProgram[];
  capabilities: SanitizedCapability[];
}

export interface StoredRegistrySnapshot {
  revision: string;
  publishedAt: string;
  payload: RegistryProjectionPayload;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

// Deliberately excludes fields that may embed local machine detail or raw
// execution arguments: repository, install_path, executable, command,
// endpoint, port, pid, docker_container_id, docker_image, dependencies,
// cpu/ram/disk_usage, metadata, error, and all timestamps except last_used.
export function sanitizeProgram(record: ProgramRecord): SanitizedProgram {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    category: record.category,
    description: record.description,
    source: record.source,
    installed: record.installed,
    enabled: record.enabled,
    running: record.running,
    status: record.status,
    health: record.health,
    health_message: record.health_message,
    version: record.version,
    capabilities: record.capabilities,
    success_rate: record.success_rate,
    task_count: record.task_count,
    last_used: record.last_used,
  };
}

// Deliberately excludes: inputs/outputs JSON schemas, requirements,
// dependencies, compatible_providers, adapter, last_error (may embed local
// paths or stack traces), repository.
export function sanitizeCapability(record: CapabilityRecord): SanitizedCapability {
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    category: record.category,
    description: record.description,
    risk: record.risk,
    trust_level: record.trust_level,
    installed: record.installed,
    enabled: record.enabled,
    running: record.running,
    health: record.health,
    version: record.version,
    priority: record.priority,
    cost_class: record.cost_class,
    latency_class: record.latency_class,
    success_rate: record.success_rate,
  };
}

export function buildRegistryProjection(
  programs: ProgramRecord[],
  capabilities: CapabilityRecord[],
  programsSummary: RegistrySummary,
  capabilitiesSummary: RegistrySummary,
): RegistryProjectionPayload {
  const sanitizedPrograms = programs.map(sanitizeProgram).sort((a, b) => a.id.localeCompare(b.id));
  const sanitizedCapabilities = capabilities.map(sanitizeCapability).sort((a, b) => a.id.localeCompare(b.id));
  const programRegistryRevision = createHash('sha256').update(stableStringify(sanitizedPrograms)).digest('hex');
  const capabilityRegistryRevision = createHash('sha256').update(stableStringify(sanitizedCapabilities)).digest('hex');
  const revision = createHash('sha256').update(`${programRegistryRevision}:${capabilityRegistryRevision}`).digest('hex');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    revision,
    programRegistryRevision,
    capabilityRegistryRevision,
    programsSummary,
    capabilitiesSummary,
    programs: sanitizedPrograms,
    capabilities: sanitizedCapabilities,
  };
}

const MAX_SNAPSHOT_BYTES = 1_048_576; // 1 MiB — generous headroom over the current ~67/245-record baseline.

export function assertSnapshotWithinLimit(payload: RegistryProjectionPayload): void {
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (bytes > MAX_SNAPSHOT_BYTES) {
    throw new Error(`Registry projection payload too large: ${bytes} bytes (max ${MAX_SNAPSHOT_BYTES})`);
  }
}

// Applied on the read side (devices/status route) when a device's heartbeat
// is stale. A stored snapshot from before the device went offline must never
// be presented as live green health — see docs/jarvis/remote-architecture.md
// ("stale remote state").
export const UNKNOWN_DEVICE_OFFLINE = 'UNKNOWN_DEVICE_OFFLINE' as const;

export function markProjectionOffline(payload: RegistryProjectionPayload): RegistryProjectionPayload {
  return {
    ...payload,
    programs: payload.programs.map((program) => ({
      ...program,
      status: UNKNOWN_DEVICE_OFFLINE,
      health: UNKNOWN_DEVICE_OFFLINE,
      running: false,
    })),
    capabilities: payload.capabilities.map((capability) => ({
      ...capability,
      health: UNKNOWN_DEVICE_OFFLINE,
      running: false,
    })),
  };
}
