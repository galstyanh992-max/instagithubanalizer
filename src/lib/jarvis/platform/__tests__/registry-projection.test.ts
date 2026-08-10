import { describe, expect, it } from 'vitest';
import {
  buildRegistryProjection,
  markProjectionOffline,
  assertSnapshotWithinLimit,
  UNKNOWN_DEVICE_OFFLINE,
} from '../registry-projection';
import type { CapabilityRecord, ProgramRecord, RegistrySummary } from '../types';

function program(overrides: Partial<ProgramRecord> = {}): ProgramRecord {
  return {
    id: 'ollama',
    name: 'Ollama',
    type: 'ai-runtime',
    category: 'ai',
    description: 'Local model runtime',
    repository: null,
    source: 'jarvis',
    installed: true,
    enabled: true,
    running: true,
    status: 'ONLINE',
    health: 'HEALTHY',
    health_message: 'ok',
    version: '1.0.0',
    available_version: null,
    install_path: 'C:\\Users\\Admin\\AppData\\Local\\Ollama',
    executable: 'C:\\Users\\Admin\\AppData\\Local\\Ollama\\ollama.exe',
    command: 'ollama serve --port 11434',
    endpoint: 'http://127.0.0.1:11434',
    port: 11434,
    pid: 4242,
    docker_container_id: null,
    docker_image: null,
    capabilities: ['llm-chat'],
    dependencies: [],
    cpu_usage: 3.2,
    ram_usage: 512,
    disk_usage: 4096,
    last_seen: '2026-08-10T10:00:00.000Z',
    last_started: '2026-08-10T09:00:00.000Z',
    last_stopped: null,
    last_used: '2026-08-10T10:05:00.000Z',
    task_count: 10,
    success_count: 9,
    failure_count: 1,
    success_rate: 90,
    error: null,
    metadata: { secretToken: 'should-never-leave-the-machine' },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-08-10T10:00:00.000Z',
    ...overrides,
  };
}

function capability(overrides: Partial<CapabilityRecord> = {}): CapabilityRecord {
  return {
    id: 'llm-chat',
    name: 'LLM Chat',
    kind: 'model',
    category: 'ai',
    description: 'Chat completion',
    capabilities: [],
    best_for: [],
    not_for: [],
    inputs: { type: 'object', properties: {} },
    outputs: { type: 'object', properties: {} },
    side_effects: [],
    requirements: [],
    compatible_os: ['win32'],
    cpu_requirement: 'low',
    gpu_requirement: 'none',
    ram_requirement: 'low',
    dependencies: [],
    compatible_agents: ['jarvis'],
    compatible_providers: [],
    risk: 'low',
    trust_level: 'internal',
    installed: true,
    enabled: true,
    running: true,
    health: 'HEALTHY',
    version: '1.0.0',
    source: 'jarvis',
    repository: null,
    adapter: 'ollama',
    priority: 50,
    cost_class: 'local',
    latency_class: 'standard',
    success_rate: 90,
    task_count: 10,
    success_count: 9,
    failure_count: 1,
    last_used: '2026-08-10T10:05:00.000Z',
    last_error: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-08-10T10:00:00.000Z',
    ...overrides,
  };
}

const summary: RegistrySummary = {
  total: 1, installed: 1, enabled: 1, running: 1, healthy: 1, missing: 0, byCategory: { ai: 1 },
};

describe('registry-projection: sanitization', () => {
  it('never includes local paths, ports, endpoints, commands, pids, or metadata', () => {
    const payload = buildRegistryProjection([program()], [capability()], summary, summary);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('install_path');
    expect(serialized).not.toContain('C:\\Users');
    expect(serialized).not.toContain('11434');
    expect(serialized).not.toContain('ollama.exe');
    expect(serialized).not.toContain('secretToken');
    expect(serialized).not.toContain('4242');
    // Sanitized fields the dashboard actually needs must survive.
    expect(payload.programs[0]).toMatchObject({ id: 'ollama', name: 'Ollama', status: 'ONLINE', health: 'HEALTHY' });
    expect(payload.capabilities[0]).toMatchObject({ id: 'llm-chat', name: 'LLM Chat', health: 'HEALTHY' });
  });

  it('produces a deterministic revision for identical input and a different one when data changes', () => {
    const a = buildRegistryProjection([program()], [capability()], summary, summary);
    const b = buildRegistryProjection([program()], [capability()], summary, summary);
    expect(a.revision).toBe(b.revision);
    expect(a.programRegistryRevision).toBe(b.programRegistryRevision);

    const changed = buildRegistryProjection([program({ health: 'DEGRADED' })], [capability()], summary, summary);
    expect(changed.revision).not.toBe(a.revision);
    expect(changed.programRegistryRevision).not.toBe(a.programRegistryRevision);
    // Only the program changed, so the capability-side revision must be stable.
    expect(changed.capabilityRegistryRevision).toBe(a.capabilityRegistryRevision);
  });

  it('is insensitive to input array order (stable sort by id before hashing)', () => {
    const p1 = program({ id: 'aaa', name: 'A' });
    const p2 = program({ id: 'zzz', name: 'Z' });
    const forward = buildRegistryProjection([p1, p2], [capability()], summary, summary);
    const reversed = buildRegistryProjection([p2, p1], [capability()], summary, summary);
    expect(forward.revision).toBe(reversed.revision);
  });

  it('rejects an oversized payload', () => {
    const huge = buildRegistryProjection(
      Array.from({ length: 20 }, (_, i) => program({ id: `p-${i}`, description: 'x'.repeat(100_000) })),
      [capability()],
      summary,
      summary,
    );
    expect(() => assertSnapshotWithinLimit(huge)).toThrow(/too large/);
  });
});

describe('registry-projection: stale/offline semantics', () => {
  it('forces every program and capability health to UNKNOWN_DEVICE_OFFLINE when the device is not ONLINE', () => {
    const payload = buildRegistryProjection([program()], [capability()], summary, summary);
    const offline = markProjectionOffline(payload);
    expect(offline.programs[0].status).toBe(UNKNOWN_DEVICE_OFFLINE);
    expect(offline.programs[0].health).toBe(UNKNOWN_DEVICE_OFFLINE);
    expect(offline.programs[0].running).toBe(false);
    expect(offline.capabilities[0].health).toBe(UNKNOWN_DEVICE_OFFLINE);
    expect(offline.capabilities[0].running).toBe(false);
    // Structural identity/name data is preserved — only health/liveness is
    // overridden, so the dashboard can still show *what* is installed.
    expect(offline.programs[0].id).toBe('ollama');
    expect(offline.programs[0].name).toBe('Ollama');
  });

  it('never mutates the original payload', () => {
    const payload = buildRegistryProjection([program()], [capability()], summary, summary);
    markProjectionOffline(payload);
    expect(payload.programs[0].status).toBe('ONLINE');
    expect(payload.programs[0].health).toBe('HEALTHY');
  });
});
