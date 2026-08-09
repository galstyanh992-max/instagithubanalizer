import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ExecutionFeedback } from './types';

interface Snapshot { schemaVersion: 1; records: ExecutionFeedback[] }

function defaultPath() { return join(process.cwd(), '.jarvis', 'state', 'capability-feedback.json'); }

function safeMetadata(value?: ExecutionFeedback['metadata']): ExecutionFeedback['metadata'] {
  if (!value) return undefined;
  const identifierKey = /^(?:agentId|provider|model|region|fallback)$/i;
  const enumKey = /^(?:verification|status)$/i;
  const sensitiveValue = /(?:bearer\s+|(?:token|secret|password|api[_-]?key)\s*[:=]|\b(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-)[a-z0-9_-]{8,}|:\/\/[^/@\s]+:[^/@\s]+@)/i;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
    if (key === 'attempt') return typeof item === 'number' && Number.isSafeInteger(item) && item >= 0;
    if (/^(?:onDemand)$/i.test(key)) return typeof item === 'boolean';
    if (identifierKey.test(key)) return typeof item === 'string' && item.length <= 80 && /^[a-z0-9][a-z0-9._:/-]*$/i.test(item) && !sensitiveValue.test(item);
    if (enumKey.test(key)) return typeof item === 'string' && item.length <= 40 && /^[a-z][a-z0-9_-]*$/i.test(item);
    return false;
  }).slice(0, 16));
}

export class ExecutionFeedbackStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly path = defaultPath(), private readonly maxRecords = 2000) {}

  private async read(): Promise<Snapshot> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as Snapshot;
      return parsed.schemaVersion === 1 && Array.isArray(parsed.records) ? parsed : { schemaVersion: 1, records: [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, records: [] };
      if (error instanceof SyntaxError) return { schemaVersion: 1, records: [] };
      throw error;
    }
  }

  async list(): Promise<ExecutionFeedback[]> { return (await this.read()).records; }

  private async withFileLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.path}.lock`;
    await mkdir(dirname(this.path), { recursive: true });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const handle = await open(lockPath, 'wx', 0o600);
        try {
          return await operation();
        } finally {
          await handle.close();
          await unlink(lockPath).catch(() => undefined);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const ageMs = Date.now() - (await stat(lockPath).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs;
        if (ageMs > 30_000) await unlink(lockPath).catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    throw new Error('Timed out acquiring capability feedback lock');
  }

  async record(input: Omit<ExecutionFeedback, 'id' | 'occurredAt'> & Partial<Pick<ExecutionFeedback, 'id' | 'occurredAt'>>): Promise<ExecutionFeedback> {
    const record: ExecutionFeedback = {
      ...input,
      id: input.id ?? `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      durationMs: Math.max(0, Math.round(input.durationMs)),
      metadata: safeMetadata(input.metadata),
    };
    const operation = this.queue.catch(() => undefined).then(() => this.withFileLock(async () => {
      const snapshot = await this.read();
      snapshot.records = [...snapshot.records, record].slice(-this.maxRecords);
      const temporary = `${this.path}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      await writeFile(temporary, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.path);
    }));
    this.queue = operation.catch(() => undefined);
    await operation;
    return record;
  }

  async stats(capabilityId: string, taskClass?: string) {
    const matching = (await this.list()).filter((record) => record.capabilityId === capabilityId && (!taskClass || record.taskClass === taskClass));
    const successes = matching.filter((record) => record.success).length;
    return {
      attempts: matching.length,
      successes,
      failures: matching.length - successes,
      successRate: matching.length ? successes / matching.length : 0.5,
      averageDurationMs: matching.length ? Math.round(matching.reduce((sum, record) => sum + record.durationMs, 0) / matching.length) : 0,
    };
  }
}

export class CapabilityCircuitBreaker {
  constructor(private readonly failureThreshold = 3, private readonly cooldownMs = 60_000) {}

  evaluate(records: ExecutionFeedback[], capabilityId: string, now = Date.now()): { open: boolean; retryAt: string | null; reason: string } {
    const recent = records.filter((record) => record.capabilityId === capabilityId).slice(-this.failureThreshold);
    if (recent.length < this.failureThreshold || recent.some((record) => record.success)) return { open: false, retryAt: null, reason: 'closed' };
    const last = Date.parse(recent.at(-1)?.occurredAt ?? '');
    const retryAt = last + this.cooldownMs;
    return retryAt > now
      ? { open: true, retryAt: new Date(retryAt).toISOString(), reason: `${this.failureThreshold} consecutive failures` }
      : { open: false, retryAt: null, reason: 'cooldown elapsed' };
  }
}
