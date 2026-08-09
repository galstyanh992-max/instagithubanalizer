# 05ZLPR — Database Identity and Antigravity Model Reconciliation

Narrow, read-only audit of the two remaining release blockers from 05ZLP: (1) proving Prisma
is connected to the expected production Supabase project, and (2) establishing the actual
Antigravity model configuration against owner-approved policy. No code edited, no commit, no
push, no database or environment change.

## Stage 1 — Baseline

```
REPOSITORY_ROOT=D:/АГЕНТ/ДЖАРВИС
BRANCH=feat/jarvis-agent-hub
AUDIT_HEAD=ac4550ab169c901087d1c95491c0c988d87260f6  (matches expected)
GIT_INDEX_STATUS=EMPTY
```
`git status --short` shows 278 lines — one more than 05ZLP's 277, accounted for entirely by
`docs/jarvis/05ZLP_final_post_repair_audit.md` now existing as an additional untracked file.
Nothing else changed. Nothing modified during this audit itself.

## Stage 2 — Prisma Connection Source

| Setting | Source file | Variable | Active source | Secret exposed |
|---|---|---|---|---|
| datasource `db`, provider `postgresql` | `prisma/schema.prisma:7-11` | — | static declaration | No |
| pooled URL | `prisma/schema.prisma:9` | `DATABASE_URL` | `env("DATABASE_URL")`, read at Prisma Client/CLI runtime | No |
| direct URL | `prisma/schema.prisma:10` | `DIRECT_URL` | `env("DIRECT_URL")`, used by Prisma for migrations | No |
| custom Prisma config | — | — | **no `prisma.config.ts` exists** — Prisma CLI uses its built-in default `.env` auto-load | No |
| `.env` template | `.env.example` | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | placeholders only (`user:password@host:5432/postgres`, `your-project.supabase.co`) | No |
| runtime status check | `src/lib/db-config/config.ts` | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | reads `process.env`, returns **booleans only** (`looksConfigured`), includes a `redactIfSecretLike()` helper that never returns a real connection string | No |
| package.json scripts | `package.json` | — | standard `prisma generate/migrate dev/reset/deploy/status` — no custom connection override logic | No |

**Multiple environment files exist:** `.env`, `.env.example`, `.env.local` were all found in
the project root. This matters because Next.js loads `.env.local` with priority over `.env`
for variables `.env.local` actually defines, while the Prisma CLI (`npx prisma ...`) only
auto-loads `.env` (confirmed by its own output: "Environment variables loaded from .env").
If `.env.local` had defined a *different* `DATABASE_URL`, the running Next.js app and the
Prisma CLI could silently target two different databases. Checked directly: **`.env.local`
does not define `DATABASE_URL` or `DIRECT_URL` at all** (its variable names were enumerated —
`GITHUB_TOKEN`, `NEXT_PUBLIC_SUPABASE_*`, `TELEGRAM_*`, `OPENROUTER_API_KEY`,
`NEXTAUTH_SECRET`, `JARWISYAN_ADMIN_PASSWORD`, `OPENAI_API_KEY`, `JARVIS_DAEMON_*` — none of
them database-connection variables). Both the app and the Prisma CLI therefore resolve
`DATABASE_URL`/`DIRECT_URL` from the same single source: `.env`. No split-environment risk.

## Stage 3 — Database Project Identity

Extracted the redacted structure of the active `DATABASE_URL`/`DIRECT_URL` (from `.env`,
which is what both Prisma CLI and the running app actually use per Stage 2) via a regex that
captures only username/host/port/dbname — password never read into any output.

```
DATABASE_CONNECTION_CLASS=SUPABASE_POOLER (both DATABASE_URL and DIRECT_URL resolve to the
  same pooler host:port in this configuration — note: DIRECT_URL is conventionally a
  non-pooled connection in Prisma's docs, but here both variables point at the same pooler
  endpoint; this is an existing configuration detail, not something this audit was asked to
  fix, and it does not affect the project-identity proof below)
DATABASE_HOST_REDACTED=aws-0-eu-west-3.pooler.supabase.com:5432
DATABASE_USERNAME_FORMAT=postgres.<project-ref>  (Supabase pooler convention)
EXTRACTED_PROJECT_REF=vlvwjhyuxsuqwitrpdju
EXPECTED_PROJECT_REF=vlvwjhyuxsuqwitrpdju
DATABASE_PROJECT_REF_MATCH=TRUE
```

The project ref was extracted directly from the username segment of the active connection
string (`postgres.vlvwjhyuxsuqwitrpdju@aws-0-eu-west-3.pooler.supabase.com`), which is
Supabase's documented pooler-username convention (`postgres.<project-ref>`) — not inferred
from a successful migration status alone. This is a direct structural proof, independent of
whether any external MCP tool can reach the project.

```
DATABASE_TARGET_IDENTITY_STATUS=PASS
```

## Stage 4 — Read-Only Database Check

Since the project ref was proven to match exactly, proceeded with:

```
npx prisma validate       → "The schema at prisma\schema.prisma is valid" (exit 0)
npx prisma migrate status → Datasource "db": PostgreSQL database "postgres", schema "public"
                             at "aws-0-eu-west-3.pooler.supabase.com:5432" (same host as
                             Stage 3's extraction — consistent)
                             5 migrations found; "Database schema is up to date!" (exit 0)
```

Supabase MCP was also re-checked for transparency: `get_project("vlvwjhyuxsuqwitrpdju")` →
`MCP error -32600: You do not have permission to perform this action` (same result as the
05ZLP audit). Per this prompt's explicit instruction, this was **not** treated as disproof,
no substitute project was queried, and the database gate was passed on the direct
connection-string proof from Stage 3 alone, as permitted.

```
MCP_ACCESS_STATUS=UNAVAILABLE_FOR_EXPECTED_PROJECT
PRISMA_VALIDATE_STATUS=PASS
PRISMA_MIGRATE_STATUS=UP_TO_DATE
PENDING_MIGRATION_COUNT=0
```

## Stage 5 — Antigravity Model String Inventory

`git grep -n -i -E "gemini-2\.5|gemini-3\.1|gemini-3\.6|Gemini 2\.5|Gemini 3\.1|Gemini 3\.6" -- src tests scripts docs package.json`

| File | Value(s) | Production | Test | Documentation | Purpose |
|---|---|---|---|---|---|
| `src/lib/agent-configs/*.ts` (37 files) | `google/gemini-2.5-flash` | Yes, but **unrelated subsystem** | No | No | OpenRouter model ID for the general-purpose orchestrator "agent-configs" system — a completely different code path from the Antigravity CLI worker. Not `agy.exe`-related. |
| `src/lib/env.ts:35` | `google/gemini-3.1-flash-lite-image` | Yes, but **unrelated subsystem** | No | No | Default for `OPENROUTER_IMAGE_MODEL` (image generation via OpenRouter) — not the Antigravity primary/fast text model. The only "3.1" string found anywhere in the repo. |
| `src/lib/worker-registry/adapters/antigravity-cli.ts:7-19` | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-1.5-pro` | **Yes — the actual Antigravity worker adapter** | No | No | `ALLOWED_ANTIGRAVITY_MODELS`, `DEFAULT_ANTIGRAVITY_MODEL`, `MODEL_PROFILE_MAP` |
| `src/lib/worker-registry/__tests__/antigravity-worker.test.ts:123` | `gemini-2.5-pro` | No | Yes | No | Asserts `adapter.resolveModel('UNKNOWN')` falls back to the default |

**No occurrence of `gemini-3.6` anywhere in the repository** (zero matches for that pattern in
any of `src`, `tests`, `scripts`, `docs`, `package.json`). No occurrence of the label strings
"Gemini 3.1 Pro" or "Gemini 3.6 Flash" anywhere either.

## Stage 6 — Model Configuration Flow

| Layer | Primary model | Fast model | Source | Runtime effect |
|---|---|---|---|---|
| UI state | — | — | `workers-ui-state.ts`: `selectedModelProfile: ModelProfile`, default `'BALANCED'` | Only a UI selection; not proven to reach the adapter |
| Task payload type | — | — | `types.ts:30`: `TaskPayload.requestedProfile?: ModelProfile` | Field exists on the type, but... |
| Worker router | — | — | `worker-router.ts` | **No reference to `ModelProfile` or `requestedProfile` anywhere** — the router does not read or forward this field at all |
| Adapter constants | `gemini-2.5-pro` | `gemini-2.5-flash` | `antigravity-cli.ts`: `DEFAULT_ANTIGRAVITY_MODEL`, `MODEL_PROFILE_MAP` | Real, exported production constants |
| Adapter method | `resolveModel(profile)` | same | `antigravity-cli.ts:146-154` | Computes a model string from the map above — **but is never called by `prepareExecutionPlan()` or `execute()`** |
| Actual CLI args sent to `agy.exe` | **none** | **none** | `antigravity-cli.ts:176`: `agyArgs = ['--add-dir', workspaceRoot, '--mode', 'plan', '-p', task.instructions]` | **No `--model` flag is ever included**, despite `agy.exe --help` confirming `--model` is a real, supported flag |

**Finding:** the model-profile plumbing exists end-to-end at the type/UI-state level
(`selectedModelProfile` → `requestedProfile` → `resolveModel()`), but the chain is broken at
two points: the router never forwards `requestedProfile`, and the adapter's own
`prepareExecutionPlan()` never calls `resolveModel()` or emits a `--model` argument at all.
Consequently:

- `gemini-2.5-*` are **real, hardcoded production constants**, not test/doc-only strings —
  but they are currently **disconnected from the actual spawned process**.
- The model that `agy.exe` actually runs with is **not determined by this codebase at all**;
  it is whatever `agy.exe` itself defaults to when no `--model` flag is supplied.
- Neither `gemini-2.5-*` nor the owner-approved `Gemini 3.1 Pro` / `Gemini 3.6 Flash` is
  provably the model actually used at runtime, from the codebase alone.

## Stage 7 — Local Antigravity CLI Check

```
& "C:\Users\Admin\AppData\Local\agy\bin\agy.exe" --version → 1.1.7
& "C:\Users\Admin\AppData\Local\agy\bin\agy.exe" --help    → full usage text (below)
```

Relevant flags/subcommands confirmed present in `--help` output: `--model` ("Model for the
current CLI session"), `--sandbox`, `--mode` (`accept-edits`, `plan`),
`--dangerously-skip-permissions` (present as a CLI capability, but confirmed absent from
`agyArgs` in the adapter — see Stage 9), and subcommands `models` ("List available models")
and `agent`/`agents` ("List available agents").

| Capability | Supported | Evidence |
|---|---|---|
| `--version` | Yes | Returned `1.1.7` immediately |
| `--help` | Yes | Full usage text returned immediately |
| `--model <id>` (explicit model override) | Yes, per `--help` | Not currently used by this adapter (Stage 6) |
| `models` subcommand (read-only model listing) | Listed in `--help`, but **could not be exercised** | Invoked twice (`agy.exe models`, `agy.exe agents`); both produced **no output** within ~35s in this non-interactive session and were terminated rather than left running or retried indefinitely. Honest limitation — not fabricated as a pass. |
| Model configuration file inspection | Not attempted beyond `--help` | `--help` does not document a config-file-inspection flag; guessing further commands was avoided per instruction |

```
ANTIGRAVITY_EXECUTABLE=C:\Users\Admin\AppData\Local\agy\bin\agy.exe
ANTIGRAVITY_VERSION=1.1.7
```

## Stage 8 — Owner-Approved Policy Comparison

Owner policy: `ANTIGRAVITY_PRIMARY_MODEL_LABEL=Gemini 3.1 Pro`,
`ANTIGRAVITY_FAST_MODEL_LABEL=Gemini 3.6 Flash`.

None of the five clean categories fit perfectly, and forcing one would overstate certainty
either way, so this is reported precisely:

- Not **A (EXACT_MATCH)** — no `gemini-3.1`/`gemini-3.6` model ID is ever passed to `agy.exe`
  by this codebase.
- Not **B (LABEL_ID_MAPPING_VALID)** — no mapping from "Gemini 3.1 Pro"/"Gemini 3.6 Flash" to
  any CLI-accepted ID exists anywhere in the repository.
- Closest to **C (STALE_MODEL_CONSTANTS)** at the code-plumbing level — the adapter's own
  `MODEL_PROFILE_MAP`/`DEFAULT_ANTIGRAVITY_MODEL`, which exist specifically to serve this
  purpose, encode only the `gemini-2.5-*` family and have never been updated to reference
  `gemini-3.1`/`gemini-3.6` at all.
- Also has properties of **E (UNVERIFIED)** at the process-invocation level — because no
  `--model` flag is sent at all, the *actual* runtime model is determined solely by
  `agy.exe`'s own internal default, which this audit could not directly enumerate (Stage 7's
  `models` subcommand did not return output in this session).

Net effect for release purposes: **owner-approved models are not provably in use, and the
codebase's own model-selection constants are demonstrably stale relative to owner policy**,
regardless of which precise taxonomy label is applied. This is treated as
`STALE_MODEL_CONSTANTS` for the decision matrix, since it is the classification that
correctly routes to a required repair rather than a false pass.

```
ANTIGRAVITY_PRIMARY_MODEL_CONFIGURED=gemini-2.5-pro (adapter constant; not confirmed as what agy.exe actually runs — see Stage 6/7)
ANTIGRAVITY_FAST_MODEL_CONFIGURED=gemini-2.5-flash (adapter constant; same caveat)
ANTIGRAVITY_PRIMARY_MODEL_EXPECTED=Gemini 3.1 Pro
ANTIGRAVITY_FAST_MODEL_EXPECTED=Gemini 3.6 Flash
ANTIGRAVITY_MODEL_CLASSIFICATION=C_STALE_MODEL_CONSTANTS_WITH_E_UNVERIFIED_RUNTIME_INVOCATION
ANTIGRAVITY_MODEL_CONFIGURATION_STATUS=STALE_MODEL_CONSTANTS
```

## Stage 9 — Security Policy Preservation

Independent of the model mismatch, re-confirmed directly from the full adapter source
(`antigravity-cli.ts`, read in full this session):

- `validateTask()` returns `policy: 'READ_ONLY_FAIL_CLOSED'` and rejects any task requesting
  `requiresFilesystemWrite` or `requiresCommandExecution`.
- `capabilities()` returns `FILES_CREATE: false`, `FILES_MODIFY: false`,
  `PROCESS_RUN_TESTS: false`.
- No code path in the adapter writes to `agy.exe`'s global settings, config, or credential
  store anywhere in the file.
- `agyArgs` never includes `--dangerously-skip-permissions` (confirmed present as a supported
  flag in `agy.exe --help`, but absent from every array literal in the adapter).

```
ANTIGRAVITY_READ_ONLY_POLICY_STATUS=PASS
ANTIGRAVITY_WRITE_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_COMMAND_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_SETTINGS_MUTATION_STATUS=DISABLED
ANTIGRAVITY_BYPASS_FLAG_STATUS=ABSENT
```

## Stage 10 — Decision Matrix

Database identity: **proven** (direct connection-string project-ref match, plus live
`prisma validate`/`migrate status` PASS). Model configuration: **not proven to match owner
policy** — stale constants, and the actual runtime model is unverified because no `--model`
flag is ever sent. This is the "MODEL REPAIR REQUIRED" outcome.

---

## FINAL BLOCK

```
AUDIT_HEAD=ac4550ab169c901087d1c95491c0c988d87260f6
BRANCH=feat/jarvis-agent-hub

DATABASE_CONNECTION_CLASS=SUPABASE_POOLER
DATABASE_HOST_REDACTED=aws-0-eu-west-3.pooler.supabase.com:5432
DATABASE_USERNAME_FORMAT=postgres.<project-ref>
EXTRACTED_PROJECT_REF=vlvwjhyuxsuqwitrpdju
EXPECTED_PROJECT_REF=vlvwjhyuxsuqwitrpdju
DATABASE_PROJECT_REF_MATCH=TRUE
DATABASE_TARGET_IDENTITY_STATUS=PASS
MCP_ACCESS_STATUS=UNAVAILABLE_FOR_EXPECTED_PROJECT
PRISMA_VALIDATE_STATUS=PASS
PRISMA_MIGRATE_STATUS=UP_TO_DATE
PENDING_MIGRATION_COUNT=0

ANTIGRAVITY_EXECUTABLE=C:\Users\Admin\AppData\Local\agy\bin\agy.exe
ANTIGRAVITY_VERSION=1.1.7
ANTIGRAVITY_PRIMARY_MODEL_CONFIGURED=gemini-2.5-pro
ANTIGRAVITY_FAST_MODEL_CONFIGURED=gemini-2.5-flash
ANTIGRAVITY_PRIMARY_MODEL_EXPECTED=Gemini 3.1 Pro
ANTIGRAVITY_FAST_MODEL_EXPECTED=Gemini 3.6 Flash
ANTIGRAVITY_MODEL_CLASSIFICATION=C_STALE_MODEL_CONSTANTS_WITH_E_UNVERIFIED_RUNTIME_INVOCATION
ANTIGRAVITY_MODEL_CONFIGURATION_STATUS=STALE_MODEL_CONSTANTS

ANTIGRAVITY_READ_ONLY_POLICY_STATUS=PASS
ANTIGRAVITY_WRITE_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_COMMAND_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_SETTINGS_MUTATION_STATUS=DISABLED
ANTIGRAVITY_BYPASS_FLAG_STATUS=ABSENT

FILES_MODIFIED_BY_THIS_AUDIT=1
GIT_INDEX_CHANGED=FALSE
COMMITS_CREATED=FALSE
GIT_PUSH_EXECUTED=FALSE
DATABASE_MODIFIED=FALSE

P0_FINDINGS=0
P1_FINDINGS=1 (Antigravity model routing: owner-approved models not provably in use; the
  adapter's own model-profile plumbing is disconnected from the actual `agy.exe` invocation,
  which never receives a `--model` flag at all — a repair needs to both update the stale
  `gemini-2.5-*` constants and decide whether/how to actually wire model selection into
  `prepareExecutionPlan()`)

PHASE_05_RECONCILIATION_STATUS=BLOCKED
PHASE_05_RELEASE_STATUS=BLOCKED_ON_MODEL_ROUTING_REPAIR
NEXT_ALLOWED_ACTION=RUN_TARGETED_ANTIGRAVITY_MODEL_ROUTING_REPAIR
```

STOP. No push performed. No model constants changed. No environment changed. Phase 06 not
started.
