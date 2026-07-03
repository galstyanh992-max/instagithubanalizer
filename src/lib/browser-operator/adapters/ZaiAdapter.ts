/**
 * ZAI Provider Adapter
 *
 * Browser automation for Z.AI via chat.z.ai.
 * Uses resilient selector chains with fallbacks for UI changes.
 *
 * Security:
 * - Does NOT store or auto-fill passwords
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 * - Does NOT log cookies, tokens, or sensitive data
 * - Does NOT reverse-engineer private APIs
 * - Only legal UI automation via Playwright
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
import {
  findInput,
  fillPrompt,
  submitPrompt,
  waitForResponse,
  extractLastResponse,
  type AdapterHelperConfig,
} from './adapter-utils';

export class ZaiAdapter extends BaseBrowserProviderAdapter {
  readonly id = 'zai';
  readonly name = 'ZAI';

  private readonly helperConfig: AdapterHelperConfig = {
    inputSelectors: [
      'textarea',
      "[contenteditable='true']",
      "[role='textbox']",
    ],
    responseSelectors: [
      "[data-message-role='assistant']",
      '.assistant-message',
      'main',
    ],
    submitStrategy: 'enter',
    defaultTimeout: 30000,
  };

  constructor(sessionManager?: BrowserSessionManager, screenshotService?: ScreenshotService) {
    super(sessionManager, screenshotService);
  }

  async execute(input: BrowserTaskInput, task: BrowserTask): Promise<BrowserTaskOutput> {
    this.ensureInitialized();
    const logs: BrowserLogEntry[] = [];
    const screenshots: string[] = [];
    const startTime = Date.now();

    logs.push(this.log('info', `Starting ZAI interaction: ${input.prompt.slice(0, 100)}`, 0));

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

    // Step 2: Navigate to ZAI
    const targetUrl = input.url ?? this.config!.url ?? 'https://chat.z.ai';
    logs.push(this.log('info', `Navigating to: ${targetUrl}`, 1));
    const navResult = await this.safeNavigate(targetUrl, task.id, logs);
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

    // Step 3: Check for needs_human
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

    // Step 4: Find input, fill prompt, submit
    logs.push(this.log('info', 'Finding input element', 2));
    const inputSelector = await findInput(session.page, this.helperConfig.inputSelectors);
    if (!inputSelector) {
      return {
        status: 'failed',
        provider: this.id,
        error: 'Could not find input element on ZAI page',
        screenshots,
        logs,
        finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
        createdAt: task.output.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
    logs.push(this.log('info', `Found input via selector: ${inputSelector}`, 3));

    const fillSuccess = await fillPrompt(session.page, this.helperConfig.inputSelectors, input.prompt);
    if (!fillSuccess) {
      return {
        status: 'failed',
        provider: this.id,
        error: 'Could not fill prompt into ZAI input',
        screenshots,
        logs,
        finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
        createdAt: task.output.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
    logs.push(this.log('info', 'Prompt filled successfully', 4));

    // Submit
    await submitPrompt(session.page, this.helperConfig.submitStrategy);
    logs.push(this.log('info', 'Prompt submitted', 5));

    // Step 5: Wait for response
    logs.push(this.log('info', 'Waiting for response...', 6));
    const responseSelector = await waitForResponse(
      session.page,
      this.helperConfig.responseSelectors,
      input.timeout ?? this.helperConfig.defaultTimeout,
    );

    if (responseSelector) {
      logs.push(this.log('info', `Response detected via selector: ${responseSelector}`, 7));
    }

    // Step 6: Extract response
    const responseText = await extractLastResponse(session.page, this.helperConfig.responseSelectors);

    // Post-interaction needs_human check
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
      const finalSs = await this.screenshotService.capture(page, task.id, 'final');
      if (finalSs) screenshots.push(finalSs);
    }

    const elapsed = Date.now() - startTime;
    logs.push(this.log('info', `Task completed in ${elapsed}ms`));

    return {
      status: 'completed',
      provider: this.id,
      result: responseText ?? '[No response text extracted]',
      screenshots,
      logs,
      finalUrl: this.sessionManager.getCurrentUrl(this.config!.id),
      createdAt: task.output.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  // resume() inherited from BaseBrowserProviderAdapter —
  // checks needs_human, takes post-resume screenshot, returns completed/needs_human
}
