import { join } from 'node:path';
import { PersistentRegistry } from './persistent-registry';
import type { ProgramRecord, RegistrySummary } from './types';

function defaultStoragePath(): string {
  return join(process.cwd(), '.jarvis', 'state', 'program-registry.json');
}

export function createProgramRecord(
  input: Pick<ProgramRecord, 'id' | 'name' | 'type' | 'category' | 'description'> & Partial<ProgramRecord>,
): ProgramRecord {
  const now = new Date().toISOString();
  const taskCount = input.task_count ?? 0;
  const successCount = input.success_count ?? 0;
  return {
    repository: null,
    source: 'jarvis',
    installed: false,
    enabled: true,
    running: false,
    status: 'UNKNOWN',
    health: 'UNKNOWN',
    health_message: 'Состояние ещё не проверено',
    version: null,
    available_version: null,
    install_path: null,
    executable: null,
    command: null,
    endpoint: null,
    port: null,
    pid: null,
    docker_container_id: null,
    docker_image: null,
    capabilities: [],
    dependencies: [],
    cpu_usage: null,
    ram_usage: null,
    disk_usage: null,
    last_seen: null,
    last_started: null,
    last_stopped: null,
    last_used: null,
    task_count: taskCount,
    success_count: successCount,
    failure_count: input.failure_count ?? 0,
    success_rate: taskCount > 0 ? Math.round((successCount / taskCount) * 10_000) / 100 : 0,
    error: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...input,
  };
}

export class ProgramRegistry {
  private readonly store: PersistentRegistry<ProgramRecord>;

  constructor(storagePath = defaultStoragePath()) {
    this.store = new PersistentRegistry(storagePath);
  }

  list(): Promise<ProgramRecord[]> { return this.store.list(); }
  get(id: string): Promise<ProgramRecord | undefined> { return this.store.get(id); }
  upsert(record: ProgramRecord): Promise<ProgramRecord> { return this.store.upsert(record); }
  remove(id: string): Promise<boolean> { return this.store.remove(id); }

  async setEnabled(id: string, enabled: boolean): Promise<ProgramRecord> {
    const existing = await this.store.get(id);
    if (!existing) throw new Error(`Program not found: ${id}`);
    return this.store.patch(id, {
      enabled,
      status: enabled ? (existing.running ? 'ONLINE' : existing.installed ? 'OFFLINE' : 'MISSING') : 'DISABLED',
    } as Partial<ProgramRecord>);
  }

  async recordExecution(id: string, succeeded: boolean, error?: string): Promise<ProgramRecord> {
    const existing = await this.store.get(id);
    if (!existing) throw new Error(`Program not found: ${id}`);
    const taskCount = existing.task_count + 1;
    const successCount = existing.success_count + (succeeded ? 1 : 0);
    const failureCount = existing.failure_count + (succeeded ? 0 : 1);
    return this.store.patch(id, {
      task_count: taskCount,
      success_count: successCount,
      failure_count: failureCount,
      success_rate: Math.round((successCount / taskCount) * 10_000) / 100,
      last_used: new Date().toISOString(),
      error: succeeded ? null : error ?? 'Неизвестная ошибка выполнения',
    } as Partial<ProgramRecord>);
  }

  async mergeDiscovery(discovered: ProgramRecord[]): Promise<ProgramRecord[]> {
    const previous = new Map((await this.store.list()).map((record) => [record.id, record]));
    const discoveredDockerNames = new Set(
      discovered
        .filter((record) => record.source === 'docker-discovery')
        .map((record) => record.name.trim().toLocaleLowerCase()),
    );
    const now = new Date().toISOString();
    const merged = discovered.map((record) => {
      const existing = previous.get(record.id);
      previous.delete(record.id);
      return createProgramRecord({
        ...record,
        enabled: existing?.enabled ?? record.enabled,
        task_count: existing?.task_count ?? record.task_count,
        success_count: existing?.success_count ?? record.success_count,
        failure_count: existing?.failure_count ?? record.failure_count,
        success_rate: existing?.success_rate ?? record.success_rate,
        last_used: existing?.last_used ?? record.last_used,
        created_at: existing?.created_at ?? record.created_at,
      });
    });

    for (const missing of previous.values()) {
      // Docker container IDs change when a container is recreated. Docker names
      // are unique in one daemon, so a current record with the same discovered
      // name supersedes the old implementation instead of creating a fake
      // MISSING duplicate forever.
      if (
        missing.source === 'docker-discovery'
        && discoveredDockerNames.has(missing.name.trim().toLocaleLowerCase())
      ) continue;
      merged.push(createProgramRecord({
        ...missing,
        installed: false,
        running: false,
        status: missing.enabled ? 'MISSING' : 'DISABLED',
        health: 'MISSING',
        health_message: 'Компонент не найден при последнем сканировании',
        last_seen: missing.last_seen,
        updated_at: now,
      }));
    }
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
      missing: records.filter((item) => item.status === 'MISSING').length,
      byCategory: records.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}

const globalRegistry = globalThis as typeof globalThis & { __jarvisProgramRegistry?: ProgramRegistry };
export const programRegistry = globalRegistry.__jarvisProgramRegistry ??= new ProgramRegistry();
