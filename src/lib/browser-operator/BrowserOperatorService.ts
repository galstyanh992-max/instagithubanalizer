/**
 * Browser Operator Service
 *
 * Main orchestrator for the Browser Operator Module.
 * Connects the queue, provider registry, and adapters.
 * Runs a processing loop that dequeues and executes tasks.
 * Persists task data to the database (graceful fallback when DB unavailable).
 *
 * Security:
 * - Localhost-only (API key check on every request)
 * - Does NOT store passwords
 * - Does NOT log cookies/tokens
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 * - Does NOT reverse-engineer private APIs
 */

import type {
  BrowserTask,
  BrowserTaskInput,
  BrowserTaskOutput,
  BrowserTaskStatus,
  BrowserProvidersApiResponse,
  BrowserLogEntry,
} from './BrowserOperatorTypes';
import { BrowserOperatorQueue } from './BrowserOperatorQueue';
import { getBrowserProviderRegistry } from './BrowserOperatorProviderRegistry';
import { CustomAdapter } from './adapters/CustomAdapter';
import { ChatGPTAdapter } from './adapters/ChatGPTAdapter';
import { ClaudeAdapter } from './adapters/ClaudeAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { ZaiAdapter } from './adapters/ZaiAdapter';
import { BrowserSessionManager } from './playwright/BrowserSessionManager';
import { ScreenshotService } from './playwright/ScreenshotService';
import { BrowserOperatorToolBridge } from './BrowserOperatorToolBridge';
import { browserOperatorDbService } from './BrowserOperatorDbService';
import defaultProvidersConfig from './config/providers.config.json';
import { loggers } from '@/lib/logger';

// ── Service Config ─────────────────────────────────────────────
export interface BrowserOperatorConfig {
  /** Max concurrent browser tasks (default 1) */
  maxConcurrent: number;
  /** Process interval in ms (default 2000) */
  processInterval: number;
  /** Auto-cleanup age in ms (default 3600000 = 1h) */
  cleanupAge: number;
  /** Screenshots directory */
  screenshotsDir: string;
}

const DEFAULT_CONFIG: BrowserOperatorConfig = {
  maxConcurrent: 1,
  processInterval: 2000,
  cleanupAge: 3600_000,
  screenshotsDir: '/tmp/browser-operator/screenshots',
};

// ── Default providers config for DB seeding ────────────────────
const defaultProvidersSeedConfig = (defaultProvidersConfig.providers as any[]).map((p) => ({
  providerId: p.id,
  name: p.name,
  description: p.description,
  headless: p.headless ?? false,
  profileDir: p.profileDir,
  viewportWidth: p.viewport?.width ?? 1280,
  viewportHeight: p.viewport?.height ?? 720,
  defaultTimeout: p.defaultTimeout ?? 30000,
  maxSessions: p.maxSessions ?? 1,
  blockedDomains: p.blockedDomains ?? [],
  allowedDomains: p.allowedDomains ?? [],
  enabled: p.enabled ?? true,
}));

// ── Service ────────────────────────────────────────────────────
class BrowserOperatorService {
  private queue: BrowserOperatorQueue;
  private config: BrowserOperatorConfig;
  private sessionManager: BrowserSessionManager;
  private screenshotService: ScreenshotService;
  private toolBridge: BrowserOperatorToolBridge;
  private processing: boolean = false;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;

  constructor(config?: Partial<BrowserOperatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionManager = new BrowserSessionManager(this.config.screenshotsDir);
    this.screenshotService = new ScreenshotService(this.config.screenshotsDir);
    this.queue = new BrowserOperatorQueue(this.config.maxConcurrent);
    this.toolBridge = new BrowserOperatorToolBridge();
  }

  // ── Initialization ───────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const registry = getBrowserProviderRegistry();

    // Register built-in adapters
    const customAdapter = new CustomAdapter(this.sessionManager, this.screenshotService);
    const chatgptAdapter = new ChatGPTAdapter(this.sessionManager, this.screenshotService);
    const claudeAdapter = new ClaudeAdapter(this.sessionManager, this.screenshotService);
    const geminiAdapter = new GeminiAdapter(this.sessionManager, this.screenshotService);
    const zaiAdapter = new ZaiAdapter(this.sessionManager, this.screenshotService);

    registry.register(customAdapter);
    registry.register(chatgptAdapter);
    registry.register(claudeAdapter);
    registry.register(geminiAdapter);
    registry.register(zaiAdapter);

    // Initialize all providers
    await registry.initializeAll();

    // Seed provider configs to DB (don't block on DB failure)
    try {
      await browserOperatorDbService.seedProviderConfigs(defaultProvidersSeedConfig);
    } catch (err) {
      loggers.browser.warn({ data: err }, '[BrowserOperator] DB seed failed (non-critical):');
    }

    // Start processing loop
    this.startProcessing();

    // Attach ToolExecution bridge for DB sync
    this.toolBridge.attach(this.queue);

    this.initialized = true;
    loggers.browser.info('[BrowserOperator] Service initialized with 5 adapters (custom, chatgpt, claude, gemini, zai)');
  }

  // ── Task Submission ──────────────────────────────────────────

  /** Submit a new browser task */
  async submitTask(input: BrowserTaskInput): Promise<BrowserTask> {
    await this.ensureReady();

    // Validate provider exists
    const registry = getBrowserProviderRegistry();
    if (!registry.get(input.provider)) {
      throw new Error(`Unknown provider "${input.provider}". Available: ${registry.listIds().join(', ')}`);
    }

    // Validate URL is allowed
    if (input.url && !registry.isUrlAllowed(input.provider, input.url)) {
      throw new Error(`URL "${input.url}" is not allowed for provider "${input.provider}"`);
    }

    const task = this.queue.enqueue(input);
    loggers.browser.info(`[BrowserOperator] Task ${task.id} queued (${input.mode}, priority: ${input.priority ?? 'normal'})`);

    // Persist to DB (don't block on DB failure)
    try {
      await browserOperatorDbService.createTask({
        taskId: task.id,
        provider: input.provider,
        prompt: input.prompt,
        url: input.url,
        mode: input.mode,
        priority: input.priority,
        agentId: input.agentId,
        workspaceId: input.options?.workspaceId as string | undefined,
        toolExecutionId: input.options?.executionId as string | undefined,
      });
    } catch (err) {
      loggers.browser.warn({ data: err }, '[BrowserOperator] DB createTask failed (non-critical):');
    }

    // Phase 1 Refactor: Dual-Mode Queue
    if (process.env.USE_QUEUE === 'true') {
      try {
        const { addBrowserTask } = await import('@/lib/queue');
        await addBrowserTask(task.id, input);
        loggers.browser.info(`[BrowserOperator] Task ${task.id} pushed to BullMQ`);
        // We do NOT process locally if sent to external queue
        return task;
      } catch (err) {
        loggers.browser.error({ err }, '[BrowserOperator] Failed to push to BullMQ, falling back to local queue');
      }
    }

    // Try to process immediately (Local in-memory fallback)
    this.processQueue();

    return task;
  }

  /** Get task by ID */
  getTask(taskId: string): BrowserTask | undefined {
    return this.queue.get(taskId);
  }

  /** Get task or throw */
  getTaskOrThrow(taskId: string): BrowserTask {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    return task;
  }

  /** List tasks (optionally filtered by status) */
  listTasks(status?: BrowserTaskStatus): BrowserTask[] {
    return this.queue.list(status);
  }

  // ── Task Actions ─────────────────────────────────────────────

  /** Retry a failed task */
  async retryTask(taskId: string): Promise<BrowserTask> {
    await this.ensureReady();
    const task = this.queue.retry(taskId);
    if (!task) throw new Error(`Cannot retry task "${taskId}" (not found, not failed, or max retries reached)`);
    loggers.browser.info(`[BrowserOperator] Task ${taskId} retried (attempt ${task.retryCount})`);

    // Update DB (don't block on DB failure)
    try {
      await browserOperatorDbService.updateTaskStatus(taskId, 'queued');
    } catch (err) {
      loggers.browser.warn({ data: err }, '[BrowserOperator] DB updateTaskStatus (retry) failed (non-critical):');
    }

    this.processQueue();
    return task;
  }

  /** Resume a needs_human task (after manual intervention) */
  async resumeTask(taskId: string): Promise<BrowserTaskOutput> {
    await this.ensureReady();
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    if (task.output.status !== 'needs_human') {
      throw new Error(`Task "${taskId}" is not in needs_human state (current: ${task.output.status})`);
    }

    // Use the adapter's resume method
    const registry = getBrowserProviderRegistry();
    const adapter = registry.getOrThrow(task.input.provider);
    const result = await adapter.resume(taskId);

    // Update task in-memory
    this.queue.updateStatus(taskId, result.status, result);

    // Update DB (don't block on DB failure)
    try {
      await browserOperatorDbService.updateTaskStatus(taskId, result.status, {
        result: result.result,
        error: result.error,
        needsHumanReason: result.needsHumanReason,
        finalUrl: result.finalUrl,
      });

      // Sync logs to DB
      if (result.logs?.length) {
        await browserOperatorDbService.addLogs(taskId, result.logs);
      }
    } catch (err) {
      loggers.browser.warn({ data: err }, '[BrowserOperator] DB updateTaskStatus (resume) failed (non-critical):');
    }

    loggers.browser.info(`[BrowserOperator] Task ${taskId} resumed → ${result.status}`);
    return result;
  }

  /** Take a manual screenshot for a task */
  async takeScreenshot(taskId: string): Promise<string> {
    await this.ensureReady();
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);

    const registry = getBrowserProviderRegistry();
    const adapter = registry.getOrThrow(task.input.provider);
    const filename = await adapter.screenshot(taskId, 'manual');

    if (!filename) throw new Error('Failed to capture screenshot — no active browser session');

    // Add screenshot to task
    task.output.screenshots.push(filename);
    task.updatedAt = new Date().toISOString();

    // Persist screenshot to DB (don't block on DB failure)
    try {
      await browserOperatorDbService.addScreenshot(taskId, filename, 'manual');
    } catch (err) {
      loggers.browser.warn({ data: err }, '[BrowserOperator] DB addScreenshot failed (non-critical):');
    }

    return filename;
  }

  /** Cancel a task */
  cancelTask(taskId: string): boolean {
    return this.queue.cancel(taskId);
  }

  // ── Providers ────────────────────────────────────────────────

  /** Get provider list with status */
  getProviders(): BrowserProvidersApiResponse {
    const registry = getBrowserProviderRegistry();
    return { providers: registry.listAll() };
  }

  // ── Queue Processing ─────────────────────────────────────────

  private startProcessing(): void {
    if (this.processTimer) return;
    this.processTimer = setInterval(() => this.processQueue(), this.config.processInterval);
  }

  private stopProcessing(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;

    const task = this.queue.dequeue();
    if (!task) return;

    this.processing = true;

    try {
      this.queue.updateStatus(task.id, 'running');

      // Update DB status to running (don't block on DB failure)
      try {
        await browserOperatorDbService.updateTaskStatus(task.id, 'running');
      } catch (err) {
        loggers.browser.warn({ data: err }, '[BrowserOperator] DB updateTaskStatus (running) failed (non-critical):');
      }

      loggers.browser.info(`[BrowserOperator] Processing task ${task.id} (${task.input.mode})`);

      const registry = getBrowserProviderRegistry();
      const adapter = registry.getOrThrow(task.input.provider);
      const result = await adapter.execute(task.input, task);

      this.queue.updateStatus(task.id, result.status, result);

      // Update DB with result (don't block on DB failure)
      try {
        await browserOperatorDbService.updateTaskStatus(task.id, result.status, {
          result: result.result,
          error: result.error,
          needsHumanReason: result.needsHumanReason,
          finalUrl: result.finalUrl,
        });

        // Sync logs to DB
        if (result.logs?.length) {
          await browserOperatorDbService.addLogs(task.id, result.logs);
        }

        // Sync screenshots to DB
        if (result.screenshots?.length) {
          for (const ss of result.screenshots) {
            await browserOperatorDbService.addScreenshot(task.id, ss, 'auto');
          }
        }
      } catch (err) {
        loggers.browser.warn({ data: err }, '[BrowserOperator] DB sync after task completion failed (non-critical):');
      }

      loggers.browser.info(`[BrowserOperator] Task ${task.id} → ${result.status}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.queue.updateStatus(task.id, 'failed', {
        error: errorMsg,
        status: 'failed',
      });

      // Update DB with failure (don't block on DB failure)
      try {
        await browserOperatorDbService.updateTaskStatus(task.id, 'failed', {
          error: errorMsg,
        });
      } catch (dbErr) {
        loggers.browser.warn({ data: dbErr }, '[BrowserOperator] DB updateTaskStatus (failed) failed (non-critical):');
      }

      loggers.browser.error({ err: errorMsg }, `[BrowserOperator] Task ${task.id} failed:`);
    } finally {
      this.processing = false;
      // Process the next task in queue (if any)
      // Previously this dequeued+re-queued which lost tasks from the array.
      // Now we simply re-enter processQueue — dequeue is idempotent.
      this.processQueue();
    }
  }

  // ── Cleanup & Shutdown ───────────────────────────────────────

  /** Cleanup old tasks */
  cleanup(): number {
    return this.queue.cleanup(this.config.cleanupAge);
  }

  /** Get queue stats */
  getStats() {
    return this.queue.getStats();
  }

  /** Full shutdown */
  async shutdown(): Promise<void> {
    this.stopProcessing();
    this.toolBridge.detach();
    await this.sessionManager.closeAll();
    const registry = getBrowserProviderRegistry();
    await registry.shutdownAll();
    this.initialized = false;
    loggers.browser.info('[BrowserOperator] Service shut down');
  }

  // ── Internal ─────────────────────────────────────────────────

  private async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// ── Singleton (using globalThis for HMR consistency) ─────────────
const GLOBAL_KEY = '__browser_operator_service__';

export function getBrowserOperatorService(): BrowserOperatorService {
  if (!(globalThis as any)[GLOBAL_KEY]) {
    (globalThis as any)[GLOBAL_KEY] = new BrowserOperatorService();
  }
  return (globalThis as any)[GLOBAL_KEY];
}

export { BrowserOperatorService };
