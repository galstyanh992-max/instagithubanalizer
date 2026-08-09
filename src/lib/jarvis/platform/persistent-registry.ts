import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RegistrySnapshot } from './types';

export interface RegistryEntity { id: string; created_at: string; updated_at: string }

export class PersistentRegistry<T extends RegistryEntity> {
  private records = new Map<string, T>();
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storagePath: string,
    private readonly maxRecords = 5_000,
    private readonly maxSnapshotBytes = 10_485_760,
  ) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const fileInfo = await stat(this.storagePath);
      if (fileInfo.size > this.maxSnapshotBytes) throw new Error('Registry snapshot too large');
      const snapshot = JSON.parse(await readFile(this.storagePath, 'utf8')) as RegistrySnapshot<T>;
      if (!Array.isArray(snapshot.records) || snapshot.records.length > this.maxRecords) {
        throw new Error('Registry snapshot contains too many records');
      }
      for (const record of snapshot.records) this.records.set(record.id, record);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const snapshot: RegistrySnapshot<T> = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      records: Array.from(this.records.values()),
    };
    await mkdir(dirname(this.storagePath), { recursive: true });
    const temporaryPath = `${this.storagePath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = JSON.stringify(snapshot, null, 2);
    if (Buffer.byteLength(serialized, 'utf8') > this.maxSnapshotBytes) {
      throw new Error('Registry snapshot too large');
    }
    await writeFile(temporaryPath, serialized, 'utf8');
    await rename(temporaryPath, this.storagePath);
  }

  private enqueuePersist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.persist());
    return this.writeQueue;
  }

  async list(): Promise<T[]> {
    await this.ensureLoaded();
    return Array.from(this.records.values());
  }

  async get(id: string): Promise<T | undefined> {
    await this.ensureLoaded();
    return this.records.get(id);
  }

  async upsert(record: T): Promise<T> {
    await this.ensureLoaded();
    const existing = this.records.get(record.id);
    if (!existing && this.records.size >= this.maxRecords) throw new Error('Registry record limit reached');
    const now = new Date().toISOString();
    const next = { ...record, created_at: existing?.created_at ?? record.created_at ?? now, updated_at: now };
    this.records.set(record.id, next);
    await this.enqueuePersist();
    return next;
  }

  async upsertMany(records: T[]): Promise<T[]> {
    await this.ensureLoaded();
    const newIds = new Set(records.filter((record) => !this.records.has(record.id)).map((record) => record.id));
    if (this.records.size + newIds.size > this.maxRecords) throw new Error('Registry record limit reached');
    const now = new Date().toISOString();
    const next = records.map((record) => {
      const existing = this.records.get(record.id);
      const value = { ...record, created_at: existing?.created_at ?? record.created_at ?? now, updated_at: now };
      this.records.set(record.id, value);
      return value;
    });
    await this.enqueuePersist();
    return next;
  }

  async patch(id: string, changes: Partial<T>): Promise<T> {
    await this.ensureLoaded();
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Registry record not found: ${id}`);
    const next = { ...existing, ...changes, id, created_at: existing.created_at, updated_at: new Date().toISOString() };
    this.records.set(id, next);
    await this.enqueuePersist();
    return next;
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const removed = this.records.delete(id);
    if (removed) await this.enqueuePersist();
    return removed;
  }

  async replace(records: T[]): Promise<void> {
    await this.ensureLoaded();
    if (records.length > this.maxRecords) throw new Error('Registry record limit reached');
    this.records = new Map(records.map((record) => [record.id, record]));
    await this.enqueuePersist();
  }
}
