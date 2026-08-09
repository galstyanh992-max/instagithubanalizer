# Auth Credential Handoff

**Дата:** 2026-07-24  
**Статус:** `BLOCKED_CREDENTIAL_STATUS` — no values were requested, read, or written.

## Safe storage and readiness matrix

| Setting | Required when | Safe storage | Validation | Status |
| --- | --- | --- | --- | --- |
| `NEXTAUTH_SECRET` | Every active NextAuth runtime | Local: ignored env file; preview/production: platform secret manager | Non-empty server-only loader check | BLOCKED |
| `NEXTAUTH_URL` | Every browser-accessible NextAuth runtime | Environment configuration, not source control | Required valid URL | BLOCKED |
| `JARWISYAN_AUTH_ENABLED` | Every environment; set explicitly | Environment configuration | Strict boolean | BLOCKED |
| `JARWISYAN_ADMIN_PASSWORD` | Credentials auth enabled | Local ignored env file or platform secret manager | Required only when auth enabled | BLOCKED |
| `OAUTH_PROVIDER` | Only if added to `authOptions` | Provider secret manager | Current Credentials flow has none | NOT_NEEDED |

## Repository storage evidence

- `.env`, `.env.local`, and `.env.production` are ignored by `.gitignore`.
- `.env.example` is the only tracked env template. It was already modified in the user worktree and was not changed in this loop.
- No secret values were inspected. Therefore readiness cannot be inferred from a successful local build.

## URL policy

- **Local standalone:** set `NEXTAUTH_URL` to the exact origin reached by the browser, such as `http://localhost:3001` only when the server is actually reached there.
- **Preview:** use that deployment's exact public HTTPS origin.
- **Production:** use the canonical public HTTPS origin; it must agree with reverse-proxy host/proto forwarding and registered callbacks.
- Do not reuse a local URL for preview/production or guess an undeclared deployment domain.

## Required response before runtime smoke

Return only the following statuses; do not include values, URLs, credentials, cookies, or `.env` contents:

```text
NEXTAUTH_SECRET: READY | BLOCKED
NEXTAUTH_URL: READY | BLOCKED
JARWISYAN_AUTH_ENABLED: READY | BLOCKED
JARWISYAN_ADMIN_PASSWORD: READY | BLOCKED | NOT_NEEDED
OAUTH_PROVIDER: READY | BLOCKED | NOT_NEEDED
```

Until required entries are `READY`, Prompt 6 (runtime smoke), Prompt 7 (Supervisor), Prompt 8 (MCP), Prompt 9 (Telegram browser playback), and the final release gate must not claim PASS.

