/**
 * Base Browser Provider Adapter
 *
 * Abstract base class for browser provider adapters.
 * Handles common lifecycle, logging, and error handling.
 * Subclasses override execute() for provider-specific logic.
 */

import type {
  IBrowserProviderAdapter,
  BrowserProviderConfig,
  BrowserTaskInput,
  BrowserTask,
  BrowserTaskOutput,
  BrowserLogEntry,
} from '../BrowserOperatorTypes';
import { BrowserSessionManager } from '../playwright/BrowserSessionManager';
import { ScreenshotService } from '../playwright/ScreenshotService';

export abstract class BaseBrowserProviderAdapter implements IBrowserProviderAdapter {
  abstract readonly id: string;
  abstract readonly name: string;

  protected config: BrowserProviderConfig | null = null;
  protected sessionManager: BrowserSessionManager;
  protected screenshotService: ScreenshotService;
  protected initialized: boolean = false;

  constructor(sessionManager?: BrowserSessionManager, screenshotService?: ScreenshotService) {
    this.sessionManager = sessionManager ?? new BrowserSessionManager();
    this.screenshotService = screenshotService ?? new ScreenshotService();
  }

  // ── Lifecycle ────────────────────────────────────────────────

  async initialize(config: BrowserProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    await this.sessionManager.closeAll();
    this.initialized = false;
  }

  getStatus(): { active: boolean; currentUrl?: string; sessionCount: number } {
    if (!this.config) return { active: false, sessionCount: 0 };
    const info = this.sessionManager.getSessionInfo(this.config.id);
    return {
      active: info.active,
      currentUrl: info.currentUrl,
      sessionCount: this.sessionManager.getActiveSessionCount(),
    };
  }

  // ── Execute (abstract) ───────────────────────────────────────

  abstract execute(input: BrowserTaskInput, task: BrowserTask): Promise<BrowserTaskOutput>;

  // ── Screenshot ───────────────────────────────────────────────

  async screenshot(taskId: string, label?: string): Promise<string> {
    if (!this.config) return '';
    const page = this.sessionManager.getPage(this.config.id);
    if (!page) return '';
    return this.screenshotService.capture(page, taskId, label ?? 'manual');
  }

  // ── Needs Human Check ────────────────────────────────────────

  async checkNeedsHuman(): Promise<{ needed: boolean; reason?: string }> {
    if (!this.config) return { needed: false };
    return this.sessionManager.checkNeedsHuman(this.config.id);
  }

  // ── Resume ───────────────────────────────────────────────────

  async resume(taskId: string): Promise<BrowserTaskOutput> {
    // Default: check if human intervention resolved, then re-run
    const needsHuman = await this.checkNeedsHuman();

    if (needsHuman.needed) {
      return {
        status: 'needs_human',
        provider: this.id,
        result: undefined,
        error: undefined,
        screenshots: [],
        logs: [this.log('warn', `Still needs human: ${needsHuman.reason}`)],
        needsHumanReason: needsHuman.reason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Human resolved the issue — take screenshot of current state
    const page = this.sessionManager.getPage(this.config!.id);
    const screenshots: string[] = [];
    if (page) {
      const ss = await this.screenshotService.capture(page, taskId, 'after_resume');
      if (ss) screenshots.push(ss);
    }

    const currentUrl = this.sessionManager.getCurrentUrl(this.config!.id);

    return {
      status: 'completed',
      provider: this.id,
      result: `Human intervention resolved. Current URL: ${currentUrl}`,
      screenshots,
      logs: [this.log('info', 'Resumed after human intervention')],
      finalUrl: currentUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  protected log(level: BrowserLogEntry['level'], message: string, step?: number): BrowserLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      step,
    };
  }

  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(`Provider "${this.id}" not initialized`);
    }
  }

  /** Navigate and check for human intervention */
  protected async safeNavigate(
    url: string,
    taskId: string,
    logs: BrowserLogEntry[],
  ): Promise<{ success: boolean; finalUrl: string; error?: string }> {
    const result = await this.sessionManager.navigate(this.config!.id, url, this.config!.defaultTimeout);

    if (!result.success) {
      logs.push(this.log('error', `Navigation failed: ${result.error}`));
      // Screenshot on error
      const page = this.sessionManager.getPage(this.config!.id);
      if (page) {
        const ss = await this.screenshotService.captureError(page, taskId, result.error ?? 'nav_failed');
        if (ss) logs.push(this.log('debug', `Error screenshot: ${ss}`));
      }
    } else {
      logs.push(this.log('info', `Navigated to: ${result.finalUrl}`));
    }

    return result;
  }

  /** Check for needs_human and add to logs */
  protected async checkAndLogHuman(taskId: string, logs: BrowserLogEntry[]): Promise<string | null> {
    const needsHuman = await this.sessionManager.checkNeedsHuman(this.config!.id);
    if (needsHuman.needed) {
      logs.push(this.log('warn', `Needs human: ${needsHuman.reason}`));
      // Take screenshot showing what needs intervention
      const page = this.sessionManager.getPage(this.config!.id);
      if (page) {
        const ss = await this.screenshotService.capture(page, taskId, 'needs_human');
        if (ss) logs.push(this.log('debug', `Needs-human screenshot: ${ss}`));
      }
      return needsHuman.reason ?? 'Manual intervention required';
    }
    return null;
  }
}
