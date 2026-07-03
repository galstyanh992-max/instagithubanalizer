/**
 * Browser Operator DB Persistence Layer
 *
 * Persists browser operator tasks, logs, and screenshots to the database.
 * Gracefully falls back to in-memory when Prisma is unavailable.
 *
 * Security: Does NOT log cookies, tokens, or passwords.
 */

import type { BrowserTaskInput, BrowserTaskStatus, BrowserLogEntry } from './BrowserOperatorTypes';
import { loggers } from '@/lib/logger';

// ── Lazy DB import with graceful fallback ──────────────────────
let db: any = null;
let dbLoadAttempted = false;

async function getDb(): Promise<any | null> {
  if (dbLoadAttempted) return db;
  dbLoadAttempted = true;
  try {
    const mod = await import('@/lib/db');
    db = mod.db;
    return db;
  } catch {
    loggers.browser.warn('[BrowserOperatorDbService] Prisma DB not available — running in memory-only mode');
    return null;
  }
}

// ── Create task input type ─────────────────────────────────────
interface CreateTaskInput {
  taskId: string;
  provider: string;
  prompt: string;
  url?: string;
  mode: string;
  priority?: string;
  agentId?: string;
  workspaceId?: string;
  toolExecutionId?: string;
}

// ── Update task extra fields ───────────────────────────────────
interface UpdateTaskExtra {
  result?: string;
  error?: string;
  needsHumanReason?: string;
  finalUrl?: string;
  toolExecutionId?: string;
  agentId?: string;
  workspaceId?: string;
}

// ── Provider config seed input ─────────────────────────────────
interface ProviderConfigSeed {
  providerId: string;
  name: string;
  description?: string;
  headless: boolean;
  profileDir?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  defaultTimeout?: number;
  maxSessions?: number;
  blockedDomains?: string[];
  allowedDomains?: string[];
  enabled?: boolean;
}

// ── List tasks filter ──────────────────────────────────────────
interface ListTasksFilter {
  status?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}

// ── Service ────────────────────────────────────────────────────
class BrowserOperatorDbService {
  private dbAvailable: boolean = false;
  private dbCheckPromise: Promise<void> | null = null;

  /** Ensure DB connection is checked (runs once) */
  private async ensureDb(): Promise<any | null> {
    if (this.dbCheckPromise) {
      await this.dbCheckPromise;
      return this.dbAvailable ? await getDb() : null;
    }

    this.dbCheckPromise = (async () => {
      try {
        const database = await getDb();
        if (database) {
          // Test connectivity
          await database.browserOperatorTask.count({ take: 1 });
          this.dbAvailable = true;
          loggers.browser.info('[BrowserOperatorDbService] DB available — persistence enabled');
        }
      } catch {
        this.dbAvailable = false;
        loggers.browser.warn('[BrowserOperatorDbService] DB unavailable — persistence disabled');
      }
    })();

    await this.dbCheckPromise;
    return this.dbAvailable ? await getDb() : null;
  }

  // ── Task CRUD ────────────────────────────────────────────────

  /** Create a BrowserOperatorTask record in the DB */
  async createTask(input: CreateTaskInput): Promise<string | null> {
    try {
      const database = await this.ensureDb();
      if (!database) return null;

      const record = await database.browserOperatorTask.create({
        data: {
          id: input.taskId,
          provider: input.provider,
          prompt: input.prompt,
          url: input.url,
          mode: input.mode,
          priority: input.priority ?? 'normal',
          agentId: input.agentId,
          workspaceId: input.workspaceId,
          toolExecutionId: input.toolExecutionId,
          status: 'queued',
        },
      });

      return record.id;
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] createTask failed:');
      return null;
    }
  }

  /** Update task status and optional fields */
  async updateTaskStatus(
    taskId: string,
    status: BrowserTaskStatus,
    extra?: UpdateTaskExtra,
  ): Promise<boolean> {
    try {
      const database = await this.ensureDb();
      if (!database) return false;

      const data: Record<string, unknown> = { status };

      if (extra?.result !== undefined) data.result = extra.result;
      if (extra?.error !== undefined) data.error = extra.error;
      if (extra?.needsHumanReason !== undefined) data.needsHumanReason = extra.needsHumanReason;
      if (extra?.finalUrl !== undefined) data.finalUrl = extra.finalUrl;
      if (extra?.toolExecutionId !== undefined) data.toolExecutionId = extra.toolExecutionId;
      if (extra?.agentId !== undefined) data.agentId = extra.agentId;
      if (extra?.workspaceId !== undefined) data.workspaceId = extra.workspaceId;

      // Set timestamps based on status
      if (status === 'running') {
        data.startedAt = new Date();
      }
      if (['completed', 'failed', 'cancelled'].includes(status)) {
        data.completedAt = new Date();
      }

      await database.browserOperatorTask.update({
        where: { id: taskId },
        data,
      });

      return true;
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] updateTaskStatus failed:');
      return false;
    }
  }

  /** Add a log entry for a task */
  async addLog(taskId: string, entry: BrowserLogEntry): Promise<string | null> {
    try {
      const database = await this.ensureDb();
      if (!database) return null;

      const record = await database.browserOperatorLog.create({
        data: {
          taskId,
          level: entry.level,
          message: entry.message,
          step: entry.step,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        },
      });

      return record.id;
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] addLog failed:');
      return null;
    }
  }

  /** Add multiple log entries for a task (batch insert) */
  async addLogs(taskId: string, entries: BrowserLogEntry[]): Promise<void> {
    try {
      const database = await this.ensureDb();
      if (!database) return;

      if (entries.length === 0) return;

      await database.browserOperatorLog.createMany({
        data: entries.map((entry) => ({
          taskId,
          level: entry.level,
          message: entry.message,
          step: entry.step,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        })),
      });
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] addLogs failed:');
    }
  }

  /** Add a screenshot record for a task */
  async addScreenshot(
    taskId: string,
    filename: string,
    label?: string,
    sizeBytes?: number,
  ): Promise<string | null> {
    try {
      const database = await this.ensureDb();
      if (!database) return null;

      const record = await database.browserOperatorScreenshot.create({
        data: {
          taskId,
          filename,
          label: label ?? null,
          sizeBytes: sizeBytes ?? 0,
        },
      });

      return record.id;
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] addScreenshot failed:');
      return null;
    }
  }

  /** Get a task with its logs and screenshots */
  async getTask(taskId: string): Promise<any | null> {
    try {
      const database = await this.ensureDb();
      if (!database) return null;

      return database.browserOperatorTask.findUnique({
        where: { id: taskId },
        include: {
          logs: { orderBy: { timestamp: 'asc' } },
          screenshots: { orderBy: { createdAt: 'asc' } },
        },
      });
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] getTask failed:');
      return null;
    }
  }

  /** List tasks with optional filters */
  async listTasks(filter?: ListTasksFilter): Promise<any[]> {
    try {
      const database = await this.ensureDb();
      if (!database) return [];

      const where: Record<string, unknown> = {};
      if (filter?.status) where.status = filter.status;
      if (filter?.provider) where.provider = filter.provider;

      return database.browserOperatorTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter?.limit ?? 50,
        skip: filter?.offset ?? 0,
        include: {
          logs: { take: 5, orderBy: { timestamp: 'desc' } },
          screenshots: { take: 3, orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] listTasks failed:');
      return [];
    }
  }

  // ── Provider Config ──────────────────────────────────────────

  /** Get all provider configs from DB */
  async getProviderConfigs(): Promise<any[]> {
    try {
      const database = await this.ensureDb();
      if (!database) return [];

      return database.browserOperatorProviderConfig.findMany({
        orderBy: { providerId: 'asc' },
      });
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] getProviderConfigs failed:');
      return [];
    }
  }

  /** Seed provider configs from JSON if not already in DB */
  async seedProviderConfigs(configs: ProviderConfigSeed[]): Promise<number> {
    try {
      const database = await this.ensureDb();
      if (!database) return 0;

      let seeded = 0;

      for (const config of configs) {
        try {
          const existing = await database.browserOperatorProviderConfig.findUnique({
            where: { providerId: config.providerId },
          });

          if (!existing) {
            await database.browserOperatorProviderConfig.create({
              data: {
                providerId: config.providerId,
                name: config.name,
                description: config.description ?? null,
                headless: config.headless,
                profileDir: config.profileDir ?? null,
                viewportWidth: config.viewportWidth ?? 1280,
                viewportHeight: config.viewportHeight ?? 720,
                defaultTimeout: config.defaultTimeout ?? 30000,
                maxSessions: config.maxSessions ?? 1,
                blockedDomains: config.blockedDomains
                  ? JSON.stringify(config.blockedDomains)
                  : null,
                allowedDomains: config.allowedDomains
                  ? JSON.stringify(config.allowedDomains)
                  : null,
                enabled: config.enabled ?? true,
              },
            });
            seeded++;
          }
        } catch {
          // Individual seed failure — continue with others
        }
      }

      if (seeded > 0) {
        loggers.browser.info(`[BrowserOperatorDbService] Seeded ${seeded} provider configs`);
      }
      return seeded;
    } catch (err) {
      loggers.browser.error({ err: err }, '[BrowserOperatorDbService] seedProviderConfigs failed:');
      return 0;
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────
export const browserOperatorDbService = new BrowserOperatorDbService();
export { BrowserOperatorDbService };
