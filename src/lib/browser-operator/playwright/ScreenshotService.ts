/**
 * Screenshot Service
 *
 * Handles screenshot capture, storage, and retrieval for browser tasks.
 * Screenshots are stored as PNG files in a configurable directory.
 */

import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { loggers } from '@/lib/logger';

type Page = any; // Playwright Page — uses any to avoid compile-time import

// ── Screenshot metadata ────────────────────────────────────────
export interface ScreenshotInfo {
  filename: string;
  path: string;
  taskId: string;
  label: string;
  timestamp: string;
  sizeBytes: number;
}

export class ScreenshotService {
  private baseDir: string;
  private maxAge: number; // ms
  private maxFiles: number;

  constructor(baseDir?: string, maxAge: number = 86_400_000, maxFiles: number = 500) {
    this.baseDir = baseDir ?? '/tmp/browser-operator/screenshots';
    this.maxAge = maxAge;
    this.maxFiles = maxFiles;
    this.ensureDir();
  }

  // ── Capture ──────────────────────────────────────────────────

  /** Take a screenshot of a page and save it */
  async capture(
    page: Page,
    taskId: string,
    label: string = 'screenshot',
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${taskId}_${label}_${timestamp}.png`;
    const filepath = join(this.baseDir, filename);

    try {
      await page.screenshot({
        path: filepath,
        type: 'png',
        fullPage: false, // Viewport only for speed
      });
    } catch (err) {
      loggers.browser.error({ err: err }, '[ScreenshotService] Failed to capture:');
      // Return empty path on failure
      return '';
    }

    // Cleanup old screenshots
    this.cleanup();

    return filename;
  }

  /** Take an error screenshot with error context */
  async captureError(
    page: Page,
    taskId: string,
    error: string,
  ): Promise<string> {
    const sanitized = error.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
    return this.capture(page, taskId, `error_${sanitized}`);
  }

  /** Take a full-page screenshot */
  async captureFullPage(
    page: Page,
    taskId: string,
    label: string = 'fullpage',
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${taskId}_${label}_full_${timestamp}.png`;
    const filepath = join(this.baseDir, filename);

    try {
      await page.screenshot({
        path: filepath,
        type: 'png',
        fullPage: true,
      });
    } catch {
      return '';
    }

    return filename;
  }

  // ── Retrieval ────────────────────────────────────────────────

  /** Get the full path for a screenshot filename */
  getPath(filename: string): string {
    return join(this.baseDir, filename);
  }

  /** Check if a screenshot file exists */
  exists(filename: string): boolean {
    return existsSync(join(this.baseDir, filename));
  }

  /** List all screenshots for a task */
  listForTask(taskId: string): string[] {
    try {
      return readdirSync(this.baseDir)
        .filter((f) => f.startsWith(taskId) && f.endsWith('.png'))
        .sort();
    } catch {
      return [];
    }
  }

  /** Delete a screenshot */
  delete(filename: string): boolean {
    try {
      const path = join(this.baseDir, filename);
      if (existsSync(path)) {
        unlinkSync(path);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────

  /** Remove old/oversized screenshot files */
  cleanup(): void {
    try {
      const files = readdirSync(this.baseDir)
        .filter((f) => f.endsWith('.png'))
        .map((f) => ({
          name: f,
          path: join(this.baseDir, f),
          mtime: this.getFileMtime(f),
        }))
        .sort((a, b) => b.mtime - a.mtime); // Newest first

      const cutoff = Date.now() - this.maxAge;

      let removed = 0;
      for (let i = 0; i < files.length; i++) {
        // Remove if too old or exceeds max count
        if (files[i].mtime < cutoff || i >= this.maxFiles) {
          try {
            unlinkSync(files[i].path);
            removed++;
          } catch {
            // Swallow
          }
        }
      }

      if (removed > 0) {
        loggers.browser.debug(`[ScreenshotService] Cleaned up ${removed} old screenshots`);
      }
    } catch {
      // Swallow
    }
  }

  // ── Internal ─────────────────────────────────────────────────

  private ensureDir(): void {
    try {
      mkdirSync(this.baseDir, { recursive: true });
    } catch {
      // May already exist
    }
  }

  private getFileMtime(filename: string): number {
    try {
      return statSync(join(this.baseDir, filename)).mtimeMs;
    } catch {
      return 0;
    }
  }
}
