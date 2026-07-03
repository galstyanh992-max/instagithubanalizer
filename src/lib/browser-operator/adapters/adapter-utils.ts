/**
 * Adapter Utilities — Shared helpers for browser provider adapters
 *
 * Provides common interaction patterns for AI provider adapters:
 * - Finding input elements with resilient selector chains
 * - Filling prompts via clipboard (with safe fill fallback)
 * - Submitting prompts (Enter or Ctrl+Enter)
 * - Waiting for responses with resilient selector chains
 * - Extracting the last assistant response text
 *
 * Security:
 * - Does NOT log cookies, tokens, or passwords
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 */

// ── Types ──────────────────────────────────────────────────────
type Page = any; // Playwright Page — uses any to avoid compile-time imports

export interface AdapterHelperConfig {
  /** Ordered list of selectors to try for the input element */
  inputSelectors: string[];
  /** Ordered list of selectors to try for the response element */
  responseSelectors: string[];
  /** How to submit the prompt: 'enter' or 'ctrl+enter' */
  submitStrategy: 'enter' | 'ctrl+enter';
  /** Default timeout for waiting for response (ms) */
  defaultTimeout: number;
}

// ── Helper Functions ───────────────────────────────────────────

/**
 * Find an input element on the page using a resilient selector chain.
 * Tries each selector until one is found and visible.
 * Returns the selector that worked, or null if none found.
 */
export async function findInput(
  page: Page,
  selectors: string[],
  timeout: number = 5000,
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        // Check if at least one is visible
        const isVisible = await locator.first().isVisible().catch(() => false);
        if (isVisible) {
          return selector;
        }
      }
    } catch {
      // Continue to next selector
    }
  }
  return null;
}

/**
 * Fill a prompt into the input element.
 * Uses clipboard (navigator.clipboard.writeText + document.execCommand('paste'))
 * as primary method to avoid triggering React/Vue change detection issues,
 * with a safe page.fill fallback.
 */
export async function fillPrompt(
  page: Page,
  selectors: string[],
  prompt: string,
): Promise<boolean> {
  const inputSelector = await findInput(page, selectors);
  if (!inputSelector) {
    return false;
  }

  try {
    // Primary: clipboard fill — works better with SPAs (React, etc.)
    try {
      await page.evaluate(({ sel, text }) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) return false;

        // Focus the element
        el.focus();

        // For contenteditable, use clipboard approach
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
          // Clear existing content
          if (el instanceof HTMLElement) {
            const selection = window.getSelection();
            if (selection) {
              selection.selectAllChildren(el);
            }
          }
          document.execCommand('insertText', false, text);
          return true;
        }

        // For textarea/input, set value directly and dispatch events
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype ?? window.HTMLInputElement.prototype,
            'value',
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, text);
          } else {
            el.setAttribute('value', text);
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        // Generic fallback: try clipboard API
        return false;
      }, { sel: inputSelector, text: prompt });

      // Small delay to let SPA react
      await page.waitForTimeout(300);
      return true;
    } catch {
      // Clipboard fill failed — try safe fill
    }

    // Fallback: page.fill (works for standard inputs/textareas)
    try {
      await page.fill(inputSelector, prompt, { timeout: 3000 });
      return true;
    } catch {
      // page.fill failed too
    }

    // Last resort: click and type character by character
    try {
      await page.click(inputSelector, { timeout: 2000 });
      // Select all existing text and delete it
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(prompt, { delay: 10 });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Submit the prompt using the configured strategy.
 * Default: Enter key. Some providers need Ctrl+Enter.
 */
export async function submitPrompt(
  page: Page,
  strategy: 'enter' | 'ctrl+enter' = 'enter',
): Promise<void> {
  if (strategy === 'ctrl+enter') {
    await page.keyboard.press('Control+Enter');
  } else {
    await page.keyboard.press('Enter');
  }
}

/**
 * Wait for a new response to appear after submitting a prompt.
 * Uses resilient selector chains with fallbacks.
 * Returns the selector that matched, or null on timeout.
 */
export async function waitForResponse(
  page: Page,
  selectors: string[],
  timeout: number = 30000,
): Promise<string | null> {
  const deadline = Date.now() + timeout;

  // First wait a bit for the request to be sent
  await page.waitForTimeout(2000);

  // Poll for response elements
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      try {
        const locator = page.locator(selector);
        const count = await locator.count();
        if (count > 0) {
          // Wait for the last response element to have meaningful content
          const lastElement = locator.last();
          const text = await lastElement.textContent({ timeout: 3000 }).catch(() => '');
          if (text && text.trim().length > 5) {
            return selector;
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    // Wait before polling again
    await page.waitForTimeout(1500);
  }

  return null;
}

/**
 * Extract the last assistant response text from the page.
 * Uses resilient selector chains — tries each selector and returns
 * the text content of the last matching element.
 */
export async function extractLastResponse(
  page: Page,
  selectors: string[],
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        // Get text from the last matching element (most recent response)
        const lastElement = locator.last();
        const text = await lastElement.textContent({ timeout: 5000 }).catch(() => '');
        if (text && text.trim().length > 0) {
          // Clean up the text — remove excessive whitespace
          return text.trim().replace(/\s+/g, ' ').slice(0, 10000);
        }
      }
    } catch {
      // Continue to next selector
    }
  }
  return null;
}

/**
 * Complete interaction flow: navigate → check human → fill → submit → wait → extract
 * This is the common pattern shared by all AI provider adapters.
 */
export async function executeProviderInteraction(
  page: Page,
  config: AdapterHelperConfig,
  url: string,
  prompt: string,
  taskId: string,
): Promise<{
  success: boolean;
  response: string | null;
  error?: string;
  needsHuman?: string;
}> {
  // Navigate to the provider URL
  try {
    await page.goto(url, {
      timeout: config.defaultTimeout,
      waitUntil: 'domcontentloaded',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, response: null, error: `Navigation failed: ${msg}` };
  }

  // Wait for page to settle
  await page.waitForTimeout(2000);

  // Check for needs_human (login, captcha, 2FA)
  try {
    const pageText = (await page.textContent('body')) ?? '';
    const pageUrl = page.url();
    const pageTitle = await page.title();
    const combined = `${pageUrl} ${pageTitle} ${pageText.slice(0, 2000)}`;

    // CAPTCHA patterns
    const captchaPatterns = [/captcha/i, /recaptcha/i, /hcaptcha/i, /turnstile/i, /verify.*human/i];
    for (const pattern of captchaPatterns) {
      if (pattern.test(combined)) {
        return { success: false, response: null, needsHuman: 'CAPTCHA detected — manual verification required' };
      }
    }

    // 2FA/MFA patterns
    const mfaPatterns = [/two.?factor/i, /2fa/i, /mfa/i, /otp/i, /verification.?code/i];
    for (const pattern of mfaPatterns) {
      if (pattern.test(combined)) {
        return { success: false, response: null, needsHuman: '2FA/MFA detected — manual code entry required' };
      }
    }

    // Login patterns (with password input confirmation)
    const loginPatterns = [/login/i, /sign[_\s]?in/i];
    for (const pattern of loginPatterns) {
      if (pattern.test(pageUrl) || pattern.test(pageTitle)) {
        const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
        if (hasPasswordInput) {
          return { success: false, response: null, needsHuman: 'Login page detected — manual sign-in required' };
        }
      }
    }
  } catch {
    // Check failed — continue anyway
  }

  // Find and fill the input
  const fillSuccess = await fillPrompt(page, config.inputSelectors, prompt);
  if (!fillSuccess) {
    return { success: false, response: null, error: 'Could not find or fill input element' };
  }

  // Small delay before submit
  await page.waitForTimeout(500);

  // Submit the prompt
  await submitPrompt(page, config.submitStrategy);

  // Wait for response
  const responseSelector = await waitForResponse(page, config.responseSelectors, config.defaultTimeout);

  // Extract the response
  const response = await extractLastResponse(page, config.responseSelectors);

  if (!response) {
    // Even if we couldn't extract text, the task might still be "completed"
    // if we found a response element
    if (responseSelector) {
      return {
        success: true,
        response: '[Response detected but text extraction failed — try screenshot]',
      };
    }
    return { success: false, response: null, error: 'No response detected within timeout' };
  }

  return { success: true, response };
}
