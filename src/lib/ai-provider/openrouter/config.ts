import 'server-only';

export interface OpenRouterConfig {
  /** API key from openrouter.ai */
  apiKey: string;
  /** Base URL (defaults to https://openrouter.ai/api/v1) */
  baseUrl: string;
  /** Optional site URL for rankings on openrouter.ai */
  siteUrl?: string;
  /** Optional site name */
  siteName?: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of retry attempts for transient provider failures */
  maxRetries: number;
}

const DEFAULT_CONFIG = {
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 60_000,
  maxRetries: 1,
};

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Add it to your server environment.');
  }
  return apiKey;
}

function readBaseUrl(): string {
  const raw = (process.env.OPENROUTER_BASE_URL || DEFAULT_CONFIG.baseUrl).trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('OPENROUTER_BASE_URL must be a valid absolute URL.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('OPENROUTER_BASE_URL must use https.');
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Build OpenRouter config from environment variables.
 * Server-side only. Never expose the returned object in API responses.
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  return {
    apiKey: readApiKey(),
    baseUrl: readBaseUrl(),
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || undefined,
    siteName: process.env.OPENROUTER_SITE_NAME?.trim() || 'Agent OS',
    timeoutMs: parseBoundedInt(process.env.OPENROUTER_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs, 5_000, 180_000),
    maxRetries: parseBoundedInt(process.env.OPENROUTER_MAX_RETRIES, DEFAULT_CONFIG.maxRetries, 0, 3),
  };
}

/**
 * Check if OpenRouter is configured (non-throwing version).
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY?.trim();
}
