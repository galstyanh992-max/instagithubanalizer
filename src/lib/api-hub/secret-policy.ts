import type { ApiRegistryItem } from "./types";

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /^sk-[A-Za-z0-9]{10,}/,
  /^ghp_[A-Za-z0-9]{20,}/,
  /^gho_[A-Za-z0-9]{20,}/,
  /^xox[baprs]-[A-Za-z0-9-]{10,}/,
  /^eyJ[A-Za-z0-9_-]{15,}\./, // JWT
  /^AKIA[0-9A-Z]{16}$/,       // AWS access key id
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

/** True if value looks like a real secret (not an env-var reference name). */
export function looksLikeSecret(value: string): boolean {
  if (!value) return false;
  return SECRET_VALUE_PATTERNS.some((re) => re.test(value.trim()));
}

const EMBEDDED_SECRET = /\b(sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{6,})/;

/** True if a secret appears anywhere inside the value (embedded). */
export function containsSecret(value: string): boolean {
  if (!value) return false;
  return looksLikeSecret(value) || EMBEDDED_SECRET.test(value);
}

/**
 * A valid secretRef is an ENV_VAR_STYLE name, not a real key value.
 * Returns { ok, reason }.
 */
export function validateSecretRef(secretRef?: string): { ok: boolean; reason: string } {
  if (!secretRef) return { ok: true, reason: "no secretRef" };
  if (looksLikeSecret(secretRef)) return { ok: false, reason: "secretRef looks like a real secret value" };
  if (!/^[A-Z][A-Z0-9_]{2,}$/.test(secretRef)) {
    return { ok: false, reason: "secretRef must be an ENV_VAR_STYLE name (e.g. OPENROUTER_API_KEY)" };
  }
  return { ok: true, reason: "valid env-style ref" };
}

/** Redact for output: never expose secret values (secretRef name is safe). */
export function redactApiRegistryItem(item: ApiRegistryItem): ApiRegistryItem {
  const secretRef = item.secretRef && looksLikeSecret(item.secretRef) ? "[REDACTED]" : item.secretRef;
  return { ...item, secretRef };
}
