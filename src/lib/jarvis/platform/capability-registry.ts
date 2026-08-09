import { join } from 'node:path';
import { PersistentRegistry } from './persistent-registry';
import type { CapabilityRecord, RegistrySummary } from './types';

function defaultStoragePath(): string {
  return join(process.cwd(), '.jarvis', 'state', 'capability-registry.json');
}

export function createCapabilityRecord(
  input: Pick<CapabilityRecord, 'id' | 'name' | 'kind' | 'category' | 'description'> & Partial<CapabilityRecord>,
): CapabilityRecord {
  const now = new Date().toISOString();
  const taskCount = input.task_count ?? 0;
  const successCount = input.success_count ?? 0;
  return {
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
    installed: false,
    enabled: true,
    running: false,
    health: 'UNKNOWN',
    version: null,
    source: 'jarvis',
    repository: null,
    adapter: 'none',
    priority: 50,
    cost_class: 'local',
    latency_class: 'standard',
    success_rate: taskCount > 0 ? Math.round((successCount / taskCount) * 10_000) / 100 : 0,
    task_count: taskCount,
    success_count: successCount,
    failure_count: input.failure_count ?? 0,
    last_used: null,
    last_error: null,
    created_at: now,
    updated_at: now,
    ...input,
  };
}

export class CapabilityRegistry {
  private readonly store: PersistentRegistry<CapabilityRecord>;
  constructor(storagePath = defaultStoragePath()) { this.store = new PersistentRegistry(storagePath); }

  list(): Promise<CapabilityRecord[]> { return this.store.list(); }
  get(id: string): Promise<CapabilityRecord | undefined> { return this.store.get(id); }
  upsert(record: CapabilityRecord): Promise<CapabilityRecord> { return this.store.upsert(record); }
  remove(id: string): Promise<boolean> { return this.store.remove(id); }

  async listEnabled(): Promise<CapabilityRecord[]> {
    return (await this.list()).filter((item) => item.enabled && item.installed && item.health !== 'MISSING' && item.health !== 'UNHEALTHY');
  }

  async setEnabled(id: string, enabled: boolean): Promise<CapabilityRecord> {
    return this.store.patch(id, { enabled } as Partial<CapabilityRecord>);
  }

  async mergeDiscovery(discovered: CapabilityRecord[]): Promise<CapabilityRecord[]> {
    const previous = new Map((await this.list()).map((record) => [record.id, record]));
    const discoveredDockerNames = new Set(
      discovered
        .filter((record) => record.source === 'docker-discovery')
        .map((record) => record.name.trim().toLocaleLowerCase()),
    );
    const merged = discovered.map((record) => {
      const existing = previous.get(record.id);
      previous.delete(record.id);
      return createCapabilityRecord({
        ...record,
        enabled: existing?.enabled ?? record.enabled,
        task_count: existing?.task_count ?? record.task_count,
        success_count: existing?.success_count ?? record.success_count,
        failure_count: existing?.failure_count ?? record.failure_count,
        success_rate: existing?.success_rate ?? record.success_rate,
        last_used: existing?.last_used ?? record.last_used,
        last_error: existing?.last_error ?? record.last_error,
        created_at: existing?.created_at ?? record.created_at,
      });
    });
    for (const missing of previous.values()) {
      if (
        missing.source === 'docker-discovery'
        && discoveredDockerNames.has(missing.name.trim().toLocaleLowerCase())
      ) continue;
      merged.push(createCapabilityRecord({ ...missing, installed: false, running: false, health: 'MISSING' }));
    }
    // Discovery is an authoritative snapshot. Replacing it atomically removes
    // legacy IDs instead of retaining them forever as synthetic MISSING rows.
    await this.store.replace(merged);
    return merged;
  }

  async summary(): Promise<RegistrySummary> {
    const records = await this.list();
    return {
      total: records.length,
      installed: records.filter((item) => item.installed).length,
      enabled: records.filter((item) => item.enabled).length,
      running: records.filter((item) => item.running).length,
      healthy: records.filter((item) => item.health === 'HEALTHY').length,
      missing: records.filter((item) => item.health === 'MISSING').length,
      byCategory: records.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}

const globalRegistry = globalThis as typeof globalThis & { __jarvisCapabilityRegistry?: CapabilityRegistry };
export const capabilityRegistry = globalRegistry.__jarvisCapabilityRegistry ??= new CapabilityRegistry();
