/**
 * Custom Browser Provider Adapter
 *
 * Headful browser with persistent profile for manual login + automation.
 * This is the primary adapter for general browser tasks:
 * - Navigate to URLs
 * - Extract page content
 * - Perform simple interactions (click, type)
 * - Screenshot pages
 * - Detect login/captcha/2FA and pause for human
 *
 * Security:
 * - Does NOT store or auto-fill passwords
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 * - Does NOT log cookies, tokens, or sensitive data
 * - Does NOT reverse-engineer private APIs
 */

import type {
  BrowserTaskInput,
  BrowserTask,
  BrowserTaskOutput,
  BrowserLogEntry,
} from '../BrowserOperatorTypes';
import { BaseBrowserProviderAdapter } from './BaseBrowserProviderAdapter';
import { BrowserSessionManager } from '../playwright/BrowserSessionManager';
import { ScreenshotService } from '../playwright/ScreenshotService';

export class CustomAdapter extends BaseBrowserProviderAdapter {
  readonly id = 'custom';
  readonly name = 'Custom Browser';

  constructor(sessionManager?: BrowserSessionManager, screenshotService?: ScreenshotService) {
    super(sessionManager, screenshotService);
  }

  async execute(input: BrowserTaskInput, task: BrowserTask): Promise<BrowserTaskOutput> {
    this.ensureInitialized();
    const logs: BrowserLogEntry[] = [];
    const screenshots: string[] = [];
    const startTime = Date.now();

    logs.push(this.log('info', `Starting ${input.mode} task: ${input.prompt.slice(0, 100)}`, 0));

    // Step 1: Get or create browser session
    const session = await this.sessionManager.getSession(this.config!.id, this.config!);
    if (!session) {
      return {
        status: 'failed',
        provider: this.id,
        error: 'Failed to launch browser session. Is Playwright installed?',
        screenshots: [],
        logs,
        createdAt: task.output.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }

    // SSRF Network Filter (Security Guardrail)
    try {
      // Remove any existing identical listener to avoid duplicates on reused sessions
      session.page.removeAllListeners('request');
      session.page.on('request', request => {
        try {
          const urlStr = request.url();
          // skip data URIs or blob URIs
          if (urlStr.startsWith('data:') || urlStr.startsWith('blob:')) return;
          
          const url = new URL(urlStr);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.')) {
            // Block local network requests to prevent SSRF
            request.abort('accessdenied').catch(() => {});
          } else {
            // We can't always call continue() if intercept is not enabled globally,
            // but for simple filtering in Playwright if interception is on.
            // If interception is not enabled via page.route, we just abort matched ones.
          }
        } catch (e) {
          // ignore parsing errors
        }
      });
    } catch (e) {
      // ignore listener attachment errors
    }

    // Step 2: Navigate (if URL provided)
    if (input.url) {
      logs.push(this.log('info', `Navigating to: ${input.url}`, 1));
      const navResult = await this.safeNavigate(input.url, task.id, logs);
      if (!navResult.success) {
        return {
          status: 'failed',
          provider: this.id,
          error: navResult.error,
          screenshots,
          logs,
          finalUrl: navResult.finalUrl,
          createdAt: task.output.createdAt,
          updatedAt: new Date().toISOString(),
        };
      }

      // Screenshot after navigation
      const ss = await this.screenshotService.capture(session.page, task.id, 'after_nav');
      if (ss) screenshots.push(ss);
    }

    // Step 3: Check for needs_human (login, captcha, 2FA)
    const humanReason = await this.checkAndLogHuman(task.id, logs);
    if (humanReason) {
      return {
        status: 'needs_human',
        provider: this.id,
        needsHumanReason: humanReason,
        screenshots,
        logs,
        finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
        createdAt: task.output.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }

    // Step 4: Execute mode-specific logic
    let result: string;
    switch (input.mode) {
      case 'navigate':
        result = await this.executeNavigate(input, task, logs, screenshots);
        break;
      case 'extract':
        result = await this.executeExtract(input, task, logs, screenshots);
        break;
      case 'interact':
        result = await this.executeInteract(input, task, logs, screenshots);
        break;
      case 'automate':
        result = await this.executeAutomate(input, task, logs, screenshots);
        break;
      default:
        result = await this.executeExtract(input, task, logs, screenshots);
    }

    // Step 5: Final check for needs_human after actions
    const postHumanReason = await this.checkAndLogHuman(task.id, logs);
    if (postHumanReason) {
      return {
        status: 'needs_human',
        provider: this.id,
        needsHumanReason: postHumanReason,
        screenshots,
        logs,
        finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
        createdAt: task.output.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }

    // Final screenshot
    const page = this.sessionManager.getPage(this.config!.id);
    if (page) {
      const ss = await this.screenshotService.capture(page, task.id, 'final');
      if (ss) screenshots.push(ss);
    }

    const elapsed = Date.now() - startTime;
    logs.push(this.log('info', `Task completed in ${elapsed}ms`));

    return {
      status: 'completed',
      provider: this.id,
      result,
      screenshots,
      logs,
      finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
      createdAt: task.output.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Mode handlers ────────────────────────────────────────────

  private async executeNavigate(
    input: BrowserTaskInput,
    _task: BrowserTask,
    logs: BrowserLogEntry[],
    _screenshots: string[],
  ): Promise<string> {
    const page = this.sessionManager.getPage(this.config!.id);
    if (!page) return 'No active page';

    const url = this.sessionManager.getCurrentUrl(this.config!.id) ?? input.url ?? '';
    const title = await page.title().catch(() => '');
    logs.push(this.log('info', `Page title: ${title}`));

    return `Navigated to ${url}. Title: "${title}"`;
  }

  private async executeExtract(
    _input: BrowserTaskInput,
    _task: BrowserTask,
    logs: BrowserLogEntry[],
    _screenshots: string[],
  ): Promise<string> {
    const page = this.sessionManager.getPage(this.config!.id);
    if (!page) return 'No active page';

    logs.push(this.log('info', 'Extracting page content', 2));

    // Extract visible text (limited to avoid massive outputs)
    const text = await page.evaluate(() => {
      const body = document.body;
      if (!body) return '';
      // Get visible text, limited to 5000 chars
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const texts: string[] = [];
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent?.trim();
        if (t) texts.push(t);
      }
      return texts.join('\n').slice(0, 5000);
    });

    logs.push(this.log('info', `Extracted ${text.length} chars of text`));
    return text || 'No text content found on page';
  }

  private async executeInteract(
    input: BrowserTaskInput,
    _task: BrowserTask,
    logs: BrowserLogEntry[],
    screenshots: string[],
  ): Promise<string> {
    logs.push(this.log('info', `Interaction mode — prompt: ${input.prompt}`, 2));

    // For MVP: parse simple commands from prompt
    // Format: "click <selector>" | "type <selector> <value>" | "scroll"
    const prompt = input.prompt.toLowerCase().trim();
    const actions: string[] = [];

    // Click action
    const clickMatch = prompt.match(/click\s+(.+)/);
    if (clickMatch) {
      const selector = clickMatch[1].trim();
      const result = await this.sessionManager.interact(this.config!.id, 'click', selector);
      actions.push(`click "${selector}": ${result.success ? 'OK' : result.error}`);
      logs.push(this.log(result.success ? 'info' : 'warn', `Click ${selector}: ${result.success ? 'success' : result.error}`, 3));
    }

    // Type action
    const typeMatch = prompt.match(/type\s+(.+?)\s+["'](.+?)["']/);
    if (typeMatch) {
      const selector = typeMatch[1].trim();
      const value = typeMatch[2];
      const result = await this.sessionManager.interact(this.config!.id, 'type', selector, value);
      actions.push(`type "${selector}": ${result.success ? 'OK' : result.error}`);
      logs.push(this.log(result.success ? 'info' : 'warn', `Type into ${selector}: ${result.success ? 'success' : result.error}`, 3));
    }

    // Scroll action
    if (prompt.includes('scroll')) {
      const result = await this.sessionManager.interact(this.config!.id, 'scroll', '');
      actions.push(`scroll: ${result.success ? 'OK' : result.error}`);
    }

    // Wait action
    const waitMatch = prompt.match(/wait\s+(.+)/);
    if (waitMatch) {
      const selector = waitMatch[1].trim();
      const found = await this.sessionManager.waitFor(this.config!.id, selector);
      actions.push(`wait "${selector}": ${found ? 'found' : 'timeout'}`);
    }

    if (actions.length === 0) {
      actions.push('No recognized actions in prompt. Supported: click <selector>, type <selector> "value", scroll, wait <selector>');
    }

    // Screenshot after interaction
    const page = this.sessionManager.getPage(this.config!.id);
    if (page) {
      const ss = await this.screenshotService.capture(page, _task.id, 'after_interact');
      if (ss) screenshots.push(ss);
    }

    return `Actions performed:\n${actions.join('\n')}`;
  }

  private async executeAutomate(
    input: BrowserTaskInput,
    task: BrowserTask,
    logs: BrowserLogEntry[],
    screenshots: string[],
  ): Promise<string> {
    logs.push(this.log('info', `Automate mode — multi-step prompt: ${input.prompt.slice(0, 100)}`, 2));

    // For MVP: treat as extract mode since full automation requires AI
    // In production, this would use LLM to interpret prompt and generate actions
    logs.push(this.log('warn', 'Full automation requires AI integration (future). Falling back to extract mode.', 3));
    return this.executeExtract(input, task, logs, screenshots);
  }
}
