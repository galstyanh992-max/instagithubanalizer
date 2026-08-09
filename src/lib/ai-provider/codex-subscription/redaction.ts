const SENSITIVE_KEY = /(?:token|secret|password|cookie|authorization|api[_-]?key|auth[_-]?json|refresh)/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKENISH = /\b(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9._-]{20,})\b/g;

export function redactCodexText(value: string, maxLength = 1_000): string {
  return value
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(TOKENISH, '[REDACTED]')
    .slice(0, maxLength);
}

export function sanitizeCodexValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (typeof value === 'string') return redactCodexText(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeCodexValue(item, depth + 1));
  if (!value || typeof value !== 'object') return value;

  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
    safe[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeCodexValue(child, depth + 1);
  }
  return safe;
}
