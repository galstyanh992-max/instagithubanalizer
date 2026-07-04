# API Hub

Structured registry of external API access. Stores **metadata only** — never real key values.

## Add an API safely
Register via `registerApi(item)` or `POST /api/api-hub`. Provide `secretRef` (ENV_VAR name), never the key.
- `secretRef: "OPENROUTER_API_KEY"` ✅
- `secretRef: "sk-..."` ❌ rejected

## secretRef policy (`secret-policy.ts`)
- `looksLikeSecret(v)` / `containsSecret(v)` — detect real keys (sk-, ghp_, JWT, AWS, PEM…).
- `validateSecretRef(ref)` — must be ENV_VAR_STYLE.
- `redactApiRegistryItem(item)` — output redacts any secret-shaped value.
- Registration rejects real secrets in any field; secret values never stored in Project Brain.

## Categories
ai, finance, news, social, content_generation, search, email, music, deployment, github, database, browser_data, analytics, custom.

## Capabilities
Each API lists capabilities with `riskLevel` + `requiresApproval` (e.g. GitHub write_repo=HIGH approval, Vercel deploy=CRITICAL approval).

## Connection test
`planConnectionTest(id)` returns a PLANNED/NOT_RUN plan. **No external call performed.**

## Command router
`api_task` intent → lists redacted registry (no external call). Real API use requires approval (future).

## Routes
- `GET /api/api-hub` — list redacted
- `POST /api/api-hub` — register metadata
- `POST /api/api-hub/test-plan` — connection plan (no network)

## NOT IMPLEMENTED
Real external calls, live health checks, secret-manager integration, finance automation, social posting, content-generation calls.
