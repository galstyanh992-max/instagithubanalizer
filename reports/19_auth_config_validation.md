# Centralized Auth Configuration Validation

**Дата:** 2026-07-24  
**Статус:** `PASS` for source-level validation; runtime verification remains blocked pending credential-status handoff.

## Single source of truth

Created `src/lib/auth-config.ts`, a server-only loader consumed by `src/lib/auth.ts` before `authOptions` is created. It owns validation for settings actually used by the current Credentials/NextAuth flow:

| Setting | Classification | Validation |
| --- | --- | --- |
| `NEXTAUTH_SECRET` | REQUIRED | Non-empty server-only value |
| `NEXTAUTH_URL` | REQUIRED | Non-empty, syntactically valid URL |
| `JARWISYAN_AUTH_ENABLED` | REQUIRED policy input | `true` or `false`; production defaults enabled only when omitted, matching existing middleware policy |
| `JARWISYAN_ADMIN_PASSWORD` | REQUIRED when auth is enabled; NOT_NEEDED when explicitly disabled | Non-empty only in enabled mode |
| OAuth provider settings | NOT_NEEDED | No OAuth provider is configured in current `authOptions` |

The loader exposes a typed configuration and uses generic errors with setting names only. It contains no logging, JSON serialization, client imports, telemetry, static fallback, or generated secrets.

## Validation matrix

`src/lib/auth-config.test.ts` covers ready configuration, missing secret, missing URL, invalid/non-HTTP(S) URL, invalid boolean, and disabled auth without password. `src/lib/auth.test.ts` covers integration with Credentials provider, including enabled-auth missing password and invalid/valid test input.

| Command | Result |
| --- | --- |
| Targeted auth/config tests | exit 0, 10 passed |
| Changed-file lint | exit 0 |
| Typecheck | exit 0 |
| Full tests | exit 0, 333 passed |
| Production build | exit 0 |

No circular import is introduced: `auth.ts` imports `auth-config.ts`; the loader does not import NextAuth or client modules.

## Remaining boundary

Validation proves code behavior but not a deployed runtime. `NEXTAUTH_URL` is validated against the runtime environment at module initialization; a future standalone/preview/prod smoke must use the canonical externally requested URL and the secret store of that environment.
