export interface DbConfigStatus {
  provider: "postgresql";
  databaseUrlConfigured: boolean;
  directUrlConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  liveCheckPossible: boolean;
}

const REAL_SECRET_PATTERNS = [
  /^postgresql:\/\/[^:]+:[^@]+@(?!HOST)/i, // has actual host/creds beyond placeholder
  /eyJ[A-Za-z0-9_-]{15,}\./, // JWT
];

function looksConfigured(value: string | undefined, placeholder: RegExp): boolean {
  if (!value) return false;
  if (placeholder.test(value)) return false; // still a placeholder
  return value.length > 0;
}

/** Never returns or logs the actual values — booleans only. */
export function getDbConfigStatus(): DbConfigStatus {
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const placeholderUrl = /USER:PASSWORD@HOST:PORT|your-project\.supabase\.co/i;
  const placeholderKey = /replace-with-your-anon-key/i;

  return {
    provider: "postgresql",
    databaseUrlConfigured: looksConfigured(dbUrl, placeholderUrl),
    directUrlConfigured: looksConfigured(directUrl, placeholderUrl),
    supabaseUrlConfigured: looksConfigured(supaUrl, placeholderUrl),
    supabaseAnonKeyConfigured: looksConfigured(supaKey, placeholderKey),
    liveCheckPossible: looksConfigured(dbUrl, placeholderUrl),
  };
}

/** Redact any string that looks like a connection string/secret for safe logging. */
export function redactIfSecretLike(value: string): string {
  if (!value) return value;
  if (REAL_SECRET_PATTERNS.some((re) => re.test(value)) || /^postgresql:\/\//i.test(value)) return "[REDACTED]";
  return value;
}
