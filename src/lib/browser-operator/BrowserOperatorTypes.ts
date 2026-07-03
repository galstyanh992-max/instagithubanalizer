/**
 * Browser Operator Module — Type Definitions
 *
 * Provides browser automation capabilities via Playwright.
 * Operates as a standalone module, independent of agents/orchestrator/UI.
 */

// ── Task Status ────────────────────────────────────────────────
export type BrowserTaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'needs_human'
  | 'cancelled';

// ── Task Mode ──────────────────────────────────────────────────
export type BrowserTaskMode =
  | 'navigate'      // Just navigate to URL and screenshot
  | 'extract'       // Navigate + extract data from page
  | 'interact'      // Navigate + perform actions (click, type, submit)
  | 'automate';     // Multi-step automation sequence

// ── Task Priority ──────────────────────────────────────────────
export type BrowserTaskPriority = 'low' | 'normal' | 'high' | 'critical';

// ── Task Input ─────────────────────────────────────────────────
export interface BrowserTaskInput {
  /** Which browser provider to use (e.g. 'custom', 'playwright') */
  provider: string;
  /** Natural language prompt describing what to do */
  prompt: string;
  /** Starting URL (optional — some prompts don't need a URL) */
  url?: string;
  /** Task mode */
  mode: BrowserTaskMode;
  /** Agent ID that submitted this task (optional) */
  agentId?: string;
  /** Task ID from the task system (optional) */
  taskId?: string;
  /** Priority */
  priority?: BrowserTaskPriority;
  /** Max wait time in ms for page loads (default 30000) */
  timeout?: number;
  /** Extra provider-specific options */
  options?: Record<string, unknown>;
}

// ── Task Output ────────────────────────────────────────────────
export interface BrowserTaskOutput {
  status: BrowserTaskStatus;
  provider: string;
  /** Extracted data or result text */
  result?: string;
  /** Error message if failed */
  error?: string;
  /** Screenshot paths (relative to screenshots dir) */
  screenshots: string[];
  /** Execution log entries */
  logs: BrowserLogEntry[];
  /** Human intervention reason (when status=needs_human) */
  needsHumanReason?: string;
  /** Final URL after all actions */
  finalUrl?: string;
  /** Task creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// ── Log Entry ──────────────────────────────────────────────────
export interface BrowserLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  /** Step number in the automation sequence */
  step?: number;
}

// ── Task Record (internal) ─────────────────────────────────────
export interface BrowserTask {
  id: string;
  input: BrowserTaskInput;
  output: BrowserTaskOutput;
  /** Retry count */
  retryCount: number;
  /** Max retries */
  maxRetries: number;
  /** Created at */
  createdAt: string;
  /** Updated at */
  updatedAt: string;
  /** Started at */
  startedAt?: string;
  /** Completed at */
  completedAt?: string;
}

// ── Provider Config ────────────────────────────────────────────
export interface BrowserProviderConfig {
  id: string;
  name: string;
  description: string;
  /** Headless or headful mode */
  headless: boolean;
  /** Persistent profile directory name */
  profileDir: string;
  /** Default viewport */
  viewport: { width: number; height: number };
  /** Default timeout ms */
  defaultTimeout: number;
  /** Max concurrent sessions */
  maxSessions: number;
  /** Blocked domains (safety) */
  blockedDomains: string[];
  /** Allowed domains (empty = all except blocked) */
  allowedDomains: string[];
  /** Provider homepage URL (e.g. https://chatgpt.com) */
  url?: string;
  /** Whether this provider is enabled */
  enabled?: boolean;
  /** Default task mode for this provider */
  defaultMode?: BrowserTaskMode;
  /** How to submit prompts: 'enter' or 'ctrl+enter' */
  submitStrategy?: 'enter' | 'ctrl+enter';
  /** Ordered selectors for finding input elements */
  inputSelectors?: string[];
  /** Ordered selectors for finding response elements */
  responseSelectors?: string[];
}

// ── Provider Adapter Interface ─────────────────────────────────
export interface IBrowserProviderAdapter {
  readonly id: string;
  readonly name: string;

  /** Initialize the adapter (launch browser, create context) */
  initialize(config: BrowserProviderConfig): Promise<void>;

  /** Execute a browser task */
  execute(input: BrowserTaskInput, task: BrowserTask): Promise<BrowserTaskOutput>;

  /** Take a screenshot of current page */
  screenshot(taskId: string, label?: string): Promise<string>;

  /** Check if manual intervention is needed (login, captcha, 2FA) */
  checkNeedsHuman(): Promise<{ needed: boolean; reason?: string }>;

  /** Resume after human intervention */
  resume(taskId: string): Promise<BrowserTaskOutput>;

  /** Shut down browser */
  shutdown(): Promise<void>;

  /** Get current status */
  getStatus(): { active: boolean; currentUrl?: string; sessionCount: number };
}

// ── Queue Events ───────────────────────────────────────────────
export type BrowserQueueEventType =
  | 'task:queued'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:needs_human'
  | 'task:cancelled'
  | 'task:retried';

export interface BrowserQueueEvent {
  type: BrowserQueueEventType;
  taskId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export type BrowserQueueEventHandler = (event: BrowserQueueEvent) => void;

// ── API Response Types ─────────────────────────────────────────
export interface BrowserTaskApiResponse {
  task: BrowserTask;
}

export interface BrowserProvidersApiResponse {
  providers: Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    currentUrl?: string;
    sessionCount: number;
  }>;
}
