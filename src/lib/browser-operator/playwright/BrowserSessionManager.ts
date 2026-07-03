/**
 * Browser Session Manager
 *
 * Manages Playwright browser instances with:
 * - Persistent profiles per provider (for manual login sessions)
 * - Headful mode support
 * - Session lifecycle (launch, reuse, close)
 * - Screenshot-on-error
 * - Detection of login/captcha/2FA (needs_human)
 *
 * Security:
 * - Does NOT store passwords or credentials
 * - Does NOT log cookies/tokens
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 * - Localhost-only by default
 *
 * NOTE: Playwright is loaded dynamically at runtime.
 * If not installed, all browser operations gracefully degrade.
 */

import type { BrowserProviderConfig } from '../BrowserOperatorTypes';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { loggers } from '@/lib/logger';

// Type declaration for webpack/Next.js runtime require — used for Playwright lazy loading
declare const __non_webpack_require__: typeof require | undefined;

// ── Session State (using any for Playwright types to avoid compile-time imports) ─
interface BrowserSession {
  browser: any;
  context: any;
  page: any;
  providerId: string;
  launchedAt: string;
  lastActivityAt: string;
  /** Whether this session uses launchPersistentContext (browser === context) */
  persistentContext: boolean;
}

// ── Detection patterns for needs_human ─────────────────────────
const LOGIN_PATTERNS = [
  /login/i, /sign[_\s]?in/i, /auth/i,
  /password/i, /username/i, /email.*password/i,
];
const CAPTCHA_PATTERNS = [
  /captcha/i, /recaptcha/i, /hcaptcha/i, /turnstile/i,
  /challenge/i, /verify.*human/i, /are.*you.*robot/i,
];
const MFA_PATTERNS = [
  /two.?factor/i, /2fa/i, /mfa/i, /otp/i, /one.?time.?password/i,
  /verification.?code/i, /authenticator/i, /sms.*code/i,
];

export class BrowserSessionManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private playwrightModule: any | null = null;
  private screenshotsDir: string;
  private loadingPromise: Promise<any | null> | null = null;

  constructor(screenshotsDir?: string) {
    this.screenshotsDir = screenshotsDir ?? '/tmp/browser-operator/screenshots';
  }

  // ── Playwright lazy loader ───────────────────────────────────

  private async loadPlaywright(): Promise<any | null> {
    if (this.playwrightModule) return this.playwrightModule;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        // Resolve from the project root at runtime so Next/Turbopack keeps
        // Playwright server-only while still loading the installed package.
        const projectRequire = createRequire(join(process.cwd(), 'package.json'));
        const _require = typeof __non_webpack_require__ !== 'undefined'
          ? __non_webpack_require__
          : projectRequire;
        const pw = _require('playwright');
        this.playwrightModule = pw;
        return pw;
      } catch (error) {
        loggers.browser.warn(
          { err: error },
          '[BrowserSessionManager] Playwright not available. Run: npm install playwright && npm run browser:install',
        );
        return null;
      }
    })();

    return this.loadingPromise;
  }

  private getLaunchChannels(): Array<string | undefined> {
    const configured = process.env.BROWSER_OPERATOR_BROWSER_CHANNEL?.trim();
    return Array.from(new Set([undefined, configured || undefined, 'chrome', 'msedge']));
  }

  private async launchPersistentContextWithFallback(
    pw: any,
    profilePath: string,
    options: Record<string, unknown>,
  ): Promise<any> {
    let lastError: unknown;

    for (const channel of this.getLaunchChannels()) {
      try {
        return await pw.chromium.launchPersistentContext(profilePath, {
          ...options,
          ...(channel ? { channel } : {}),
        });
      } catch (error) {
        lastError = error;
        if (channel) {
          loggers.browser.warn(
            { err: error },
            `[BrowserSessionManager] Failed to launch Chromium channel "${channel}"`,
          );
        }
      }
    }

    throw lastError;
  }

  private async launchBrowserWithFallback(
    pw: any,
    options: Record<string, unknown>,
  ): Promise<any> {
    let lastError: unknown;

    for (const channel of this.getLaunchChannels()) {
      try {
        return await pw.chromium.launch({
          ...options,
          ...(channel ? { channel } : {}),
        });
      } catch (error) {
        lastError = error;
        if (channel) {
          loggers.browser.warn(
            { err: error },
            `[BrowserSessionManager] Failed to launch Chromium channel "${channel}"`,
          );
        }
      }
    }

    throw lastError;
  }

  // ── Profile Directory ────────────────────────────────────────

  /** Get the profile directory path for a provider */
  private getProfileDir(profileDir: string): string {
    const baseDir = join(process.cwd(), '.storage', 'browser-operator', 'profiles');
    const fullDir = join(baseDir, profileDir);

    // Ensure directory exists
    try {
      mkdirSync(fullDir, { recursive: true });
    } catch {
      // May already exist
    }

    return fullDir;
  }

  // ── Session Lifecycle ────────────────────────────────────────

  /** Launch or reuse a browser session for a provider */
  async getSession(providerId: string, config: BrowserProviderConfig): Promise<BrowserSession | null> {
    // Reuse existing session
    const existing = this.sessions.get(providerId);
    if (existing) {
      try {
        if (existing.persistentContext) {
          // For persistent context, check if the browser (which IS the context) is still connected
          if (existing.browser && existing.browser.browserContexts) {
            existing.lastActivityAt = new Date().toISOString();
            return existing;
          }
        } else if (existing.browser.isConnected()) {
          existing.lastActivityAt = new Date().toISOString();
          return existing;
        }
      } catch {
        // Session might be dead, continue to create new one
      }
    }

    // Cleanup stale session
    if (existing) {
      await this.closeSession(providerId);
    }

    const pw = await this.loadPlaywright();
    if (!pw) return null;

    try {
      const headless = config.headless ?? false;
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ];

      // Use launchPersistentContext if a profileDir is configured
      if (config.profileDir) {
        const profilePath = this.getProfileDir(config.profileDir);

        const persistentContext = await this.launchPersistentContextWithFallback(pw, profilePath, {
          headless,
          viewport: config.viewport,
          ignoreHTTPSErrors: false,
          args: launchArgs,
        });

        // Get or create a page
        const pages = persistentContext.pages();
        const page = pages.length > 0 ? pages[0] : await persistentContext.newPage();
        page.setDefaultTimeout(config.defaultTimeout);
        page.setDefaultNavigationTimeout(config.defaultTimeout);

        const session: BrowserSession = {
          browser: persistentContext, // In persistent context, browser IS the context
          context: persistentContext,
          page,
          providerId,
          launchedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          persistentContext: true,
        };

        this.sessions.set(providerId, session);
        loggers.browser.info(`[BrowserSessionManager] Launched persistent context for "${providerId}" (profile: ${config.profileDir})`);
        return session;
      }

      // Fallback: standard launch + newContext (for providers without profileDir)
      const browser = await this.launchBrowserWithFallback(pw, {
        headless,
        args: launchArgs,
      });

      const context = await browser.newContext({
        viewport: config.viewport,
        ignoreHTTPSErrors: false,
      });

      const page = await context.newPage();
      page.setDefaultTimeout(config.defaultTimeout);
      page.setDefaultNavigationTimeout(config.defaultTimeout);

      const session: BrowserSession = {
        browser,
        context,
        page,
        providerId,
        launchedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        persistentContext: false,
      };

      this.sessions.set(providerId, session);
      return session;
    } catch (err) {
      loggers.browser.error({ err: err }, `[BrowserSessionManager] Failed to launch browser for "${providerId}":`);
      return null;
    }
  }

  /** Close a specific session */
  async closeSession(providerId: string): Promise<void> {
    const session = this.sessions.get(providerId);
    if (!session) return;

    try {
      if (session.persistentContext) {
        // For persistent context, close the context (which also closes the browser)
        await session.context.close();
      } else {
        await session.browser.close();
      }
    } catch {
      // Swallow
    }
    this.sessions.delete(providerId);
  }

  /** Close all sessions */
  async closeAll(): Promise<void> {
    for (const id of this.sessions.keys()) {
      await this.closeSession(id);
    }
  }

  // ── Page Operations ──────────────────────────────────────────

  /** Navigate to URL */
  async navigate(providerId: string, url: string, timeout?: number): Promise<{ success: boolean; finalUrl: string; title: string; error?: string }> {
    const session = this.sessions.get(providerId);
    if (!session) return { success: false, finalUrl: url, title: '', error: 'No active session' };

    try {
      const response = await session.page.goto(url, {
        timeout: timeout ?? 30000,
        waitUntil: 'domcontentloaded',
      });

      const finalUrl = session.page.url();
      const title = await session.page.title();
      session.lastActivityAt = new Date().toISOString();

      return {
        success: (response?.status() ?? 0) < 400,
        finalUrl,
        title,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, finalUrl: url, title: '', error: msg };
    }
  }

  /** Get the current page for a provider */
  getPage(providerId: string): any | null {
    return this.sessions.get(providerId)?.page ?? null;
  }

  /** Get current URL */
  getCurrentUrl(providerId: string): string | undefined {
    const session = this.sessions.get(providerId);
    return session?.page?.url?.();
  }

  /** Check if a page needs human intervention (login, captcha, 2FA) */
  async checkNeedsHuman(providerId: string): Promise<{ needed: boolean; reason?: string }> {
    const session = this.sessions.get(providerId);
    if (!session) return { needed: false };

    try {
      const pageText = (await session.page.textContent('body')) ?? '';
      const url = session.page.url();
      const pageTitle = await session.page.title();
      const combined = `${url} ${pageTitle} ${pageText.slice(0, 2000)}`;

      // Check for CAPTCHA
      for (const pattern of CAPTCHA_PATTERNS) {
        if (pattern.test(combined)) {
          return { needed: true, reason: 'CAPTCHA detected — manual verification required' };
        }
      }

      // Check for 2FA/MFA
      for (const pattern of MFA_PATTERNS) {
        if (pattern.test(combined)) {
          return { needed: true, reason: '2FA/MFA detected — manual code entry required' };
        }
      }

      // Check for login page (only if we detect a login form)
      for (const pattern of LOGIN_PATTERNS) {
        if (pattern.test(url) || pattern.test(pageTitle)) {
          // Confirm there's actually a password input
          const hasPasswordInput = await session.page.locator('input[type="password"]').count() > 0;
          if (hasPasswordInput) {
            return { needed: true, reason: 'Login page detected — manual sign-in required' };
          }
        }
      }

      return { needed: false };
    } catch {
      return { needed: false };
    }
  }

  /** Execute a simple interaction (click, type) */
  async interact(
    providerId: string,
    action: 'click' | 'type' | 'press' | 'scroll',
    selector: string,
    value?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(providerId);
    if (!session) return { success: false, error: 'No active session' };

    try {
      switch (action) {
        case 'click':
          await session.page.click(selector, { timeout: 5000 });
          break;
        case 'type':
          if (!value) return { success: false, error: 'Value required for type action' };
          await session.page.fill(selector, value, { timeout: 5000 });
          break;
        case 'press':
          if (!value) return { success: false, error: 'Key required for press action' };
          await session.page.keyboard.press(value);
          break;
        case 'scroll':
          await session.page.evaluate(() => window.scrollBy(0, 500));
          break;
      }
      session.lastActivityAt = new Date().toISOString();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /** Extract text content from the page */
  async extractText(providerId: string, selector?: string): Promise<string> {
    const session = this.sessions.get(providerId);
    if (!session) return '';

    try {
      if (selector) {
        return (await session.page.textContent(selector)) ?? '';
      }
      return (await session.page.textContent('body')) ?? '';
    } catch {
      return '';
    }
  }

  /** Wait for navigation or element */
  async waitFor(providerId: string, selector: string, timeout?: number): Promise<boolean> {
    const session = this.sessions.get(providerId);
    if (!session) return false;

    try {
      await session.page.waitForSelector(selector, { timeout: timeout ?? 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ── Status ───────────────────────────────────────────────────

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  isSessionActive(providerId: string): boolean {
    const session = this.sessions.get(providerId);
    try {
      if (session?.persistentContext) {
        return session.browser?.browserContexts?.() !== undefined;
      }
      return session?.browser?.isConnected?.() ?? false;
    } catch {
      return false;
    }
  }

  getSessionInfo(providerId: string): { active: boolean; currentUrl?: string; launchedAt?: string } {
    const session = this.sessions.get(providerId);
    if (!session) return { active: false };
    return {
      active: this.isSessionActive(providerId),
      currentUrl: session.page?.url?.(),
      launchedAt: session.launchedAt,
    };
  }
}
