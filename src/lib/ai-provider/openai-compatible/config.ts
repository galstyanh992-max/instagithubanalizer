// Agent OS — OpenAI-compatible provider configuration
// Shared base for all providers exposing the OpenAI chat/completions schema.

import 'server-only';

export interface OpenAICompatibleConfig {
  /** Provider identifier used in the registry */
  id: string;
  /** Human-readable name */
  name: string;
  /** API key (may be empty for local providers) */
  apiKey: string;
  /** Base URL ending optionally with /v1 */
  baseUrl: string;
  /** Default model when caller does not specify one */
  defaultModel: string;
  /** Optional site URL for rankings (OpenRouter-style) */
  siteUrl?: string;
  /** Optional site name for rankings (OpenRouter-style) */
  siteName?: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of retry attempts for transient failures */
  maxRetries: number;
  /** Additional headers appended to every request */
  extraHeaders?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_RETRIES = 1;

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeBaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Provider base URL must be absolute: ${raw}`);
  }
  return url;
}

export function buildOpenAICompatibleConfig(options: {
  id: string;
  name: string;
  apiKeyEnv: string;
  baseUrlEnv?: string;
  defaultBaseUrl: string;
  defaultModelEnv: string;
  fallbackModel: string;
  siteUrlEnv?: string;
  siteNameEnv?: string;
  timeoutMsEnv?: string;
  maxRetriesEnv?: string;
  extraHeaders?: Record<string, string>;
}): OpenAICompatibleConfig {
  const apiKey = process.env[options.apiKeyEnv]?.trim() ?? '';
  const baseUrl = normalizeBaseUrl(options.baseUrlEnv ? (process.env[options.baseUrlEnv] ?? options.defaultBaseUrl) : options.defaultBaseUrl);
  const defaultModel = process.env[options.defaultModelEnv]?.trim() || options.fallbackModel;
  const siteUrl = options.siteUrlEnv ? process.env[options.siteUrlEnv]?.trim() : undefined;
  const siteName = options.siteNameEnv ? process.env[options.siteNameEnv]?.trim() : undefined;
  const timeoutMs = parseBoundedInt(options.timeoutMsEnv ? process.env[options.timeoutMsEnv] : undefined, DEFAULT_TIMEOUT, 5_000, 180_000);
  const maxRetries = parseBoundedInt(options.maxRetriesEnv ? process.env[options.maxRetriesEnv] : undefined, DEFAULT_RETRIES, 0, 3);

  return {
    id: options.id,
    name: options.name,
    apiKey,
    baseUrl,
    defaultModel,
    siteUrl,
    siteName,
    timeoutMs,
    maxRetries,
    extraHeaders: options.extraHeaders,
  };
}

export function isOpenAICompatibleConfigured(config: OpenAICompatibleConfig): boolean {
  return Boolean(config.apiKey);
}
