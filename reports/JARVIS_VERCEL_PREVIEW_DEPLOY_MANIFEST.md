# JARVIS Vercel Preview Deploy Manifest

Scope: "APPROVED: VERCEL PREVIEW DEPLOY ONLY" — Section 1/4/31 of the
"JARVIS REMOTE CONTROL — VERCEL PREVIEW + REAL REMOTE E2E" master prompt.

**This record is additive.** It documents the Preview deploy performed on
2026-08-11; it does not replace or erase earlier audit reports in this
directory (see `JARVIS_VERCEL_LOCAL_RUNTIME_MIGRATION.md`,
`JARVIS_REMOTE_ARCHITECTURE_SECURITY_REVIEW.md`).

## 1. Pre-deploy state

- Repo: `D:\АГЕНТ\ДЖАРВИС`, branch `feat/vercel-local-runtime`.
- Vercel project: `instagithubanalizer` (`prj_BqioTVaWMZyB9MHi0HFkj34T612R`),
  team `team_l9AKRwnO9Q4sSfcFgYdXMwZ1` (galstyanh992-8644s-projects).
- Squash commit of accumulated multi-round work: `ed61390961a46e94423eeed0302198918dd86db6`
  — "feat: JARVIS remote control plane and runtime-boundary finalization"
  (105 files, +3707/-4876). Staged deliberately: `git add -A` followed by an
  explicit `git reset --` of every large/irrelevant/scratch path (see §2),
  never a blind `git add -A && git commit`. The staged diff was grepped for
  the real daemon token, the real Supabase service-role key signature, PEM
  private-key headers, `service_role`, `sk-ant-`, `sk-proj-`, an AWS key
  pattern, and the real `JARVIS_OWNER_ID` UUID — zero matches before commit.
- Vercel-compat fix commit: `7b42ae449657fdf93ee464896faf0bcae4b5465d` —
  "fix: make Next.js build Vercel-compatible for Preview deploy" (see §4).
- Both commits pushed to `origin/feat/vercel-local-runtime` and verified via
  `git ls-remote` to match local `HEAD`.
- No DB migrations were run or altered in this pass.

## 2. What was excluded from the deploy (and why it's still on disk)

`.vercelignore` was created (deploy-only; does not affect git tracking) to
stop `vercel deploy` from scanning the entire disk-resident project tree —
without it, the CLI falls back to `.gitignore`, which only excludes select
`.jarvis/*` subdirectories, not the whole tree. First attempt scanned
**59,908 files** (multi-GB Python venvs under `.jarvis`, the vendored
`camofox` browser binary, editor/tool caches). None of these paths are
deleted from the machine — only excluded from the upload:

- `/.jarvis` — local runtime state, caches, and multiple Python venvs
  (transformers/openai site-packages) not needed by the deployed Next.js app.
- `/vendor` — vendored Camofox browser binary (local browser-automation tool,
  not a web dependency).
- `/.playwright-cli`, `/.playwright-mcp`, `/.vscode`, `/.agents` — editor/tool
  caches and local agent-skill scratch dirs.
- `/architecture`, `/artifacts` — local design/audit scratch notes (root-level
  only — see incident below).
- One-off root files/binaries (`JARVIS_Live_Model_UI_v9.zip`,
  `JARVIS_VOLUMETRIC_SILENCE.png`, `_prisma_migrations_dump.json`,
  `.agent.md`) and five one-off `scripts/_find-importers*.ps1` scratch
  scripts.
- `/.tmp-*` — scratch files from this deploy session itself.

**Incident and fix:** the first version of `.vercelignore` used bare
(unanchored) patterns like `artifacts`, which — exactly like `.gitignore`
semantics — match a directory of that name *anywhere* in the tree, not just
at the root. This silently excluded the real, needed
`src/app/api/daemon/artifacts/route.ts` (the daemon's artifact-upload route),
which broke the build (`TS2307: Cannot find module '../artifacts/route'` in
`src/app/api/daemon/__tests__/auth-inventory.test.ts`, since that test's
`DAEMON_ROUTES_TOTAL=9` inventory imports every daemon route by relative
path). Fixed by anchoring every root-level exclusion with a leading `/` in
the commit above, and re-verified the file uploaded (`src/app/api/daemon/artifacts`
appears in the final deployment's route list, see §5).

## 3. Preview environment variables (Section 2)

`vercel env ls preview` showed **zero** environment variables configured for
this project before this pass — not a partial gap, nothing at all. This is
why the build failed at `NEXTAUTH_SECRET is required` even after the file
exclusion issue was fixed. The following 10 variables were created via the
Vercel REST API (`POST /v10/projects/{id}/env`, `target: ["preview"]` only —
never `production` or `development`), sourced from the values already used
locally for `local-full-dev` in `.env` / `.env.local`:

| Variable | Exposure | Purpose |
|---|---|---|
| `JARVIS_RUNTIME_ROLE` | server-only | **Set to `web-control-plane`** (not the local default `local-full-dev`) — this is the actual enforced runtime-boundary flag read by `src/lib/env.ts` and checked by `scripts/check-runtime-boundary.mjs`. |
| `JARWISYAN_AUTH_ENABLED` | server-only | Set to `false`. `src/lib/auth-config.ts` defaults this legacy NextAuth admin-password path to **enabled** in any `NODE_ENV=production` build (which Vercel always sets) unless explicitly disabled — leaving it on would have required pushing `JARWISYAN_ADMIN_PASSWORD` to Vercel for a legacy auth surface unrelated to this project's real security model (Supabase session + RLS). Disabled to keep the exposed surface minimal. |
| `NEXT_PUBLIC_SUPABASE_URL` | **browser** (by design) | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **browser** (by design) | Public/anon (publishable) Supabase key — RLS-governed, the only Supabase credential the browser ever holds. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Required by `src/lib/supabase-server.ts` for legitimate elevated server-side operations (e.g. Realtime broadcast to the owner channel). Never `NEXT_PUBLIC_`-prefixed, never sent to the browser. |
| `DATABASE_URL`, `DIRECT_URL` | server-only | Prisma/Postgres connection strings (Supabase pooler). |
| `JARVIS_OWNER_ID` | server-only | The single JARVIS owner's UUID, used for ownership-scoped queries. |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | server-only | Required unconditionally by `loadAuthConfig()` even though the auth path itself is disabled (`requiredValue()` throws before `authEnabled` is even checked) — without these two, page-data collection for `/api/auth/[...nextauth]` fails the build outright. `NEXTAUTH_URL` set to a stable placeholder (`https://instagithubanalizer.vercel.app`); functionally inert since `JARWISYAN_AUTH_ENABLED=false`. |

**Not set** (deliberately, per the master prompt's explicit exclusion list):
`JARVIS_DAEMON_TOKEN`, `JARVIS_DAEMON_GATEWAY_URL`, `JARVIS_WORKSPACES_ROOT`,
and other daemon/local-machine-only variables. The web-control-plane process
must never hold the daemon bearer token.

**Discrepancy noted, not fabricated:** the master prompt's Section 2 also
names a `JARVIS_LOCAL_EXECUTION=false` variable. A repo-wide grep found this
exact name is **not referenced anywhere in the codebase** — the real,
implemented enforcement mechanism is the `JARVIS_RUNTIME_ROLE` enum
(`web-control-plane` / `local-worker` / `local-full-dev`) in `src/lib/env.ts`
and `scripts/check-runtime-boundary.mjs`. No such variable was set, since
doing so would be a no-op that could misleadingly look like compliance.

**Handling note:** these values already exist in the user's own local
`.env`/`.env.local` files; they were read locally and pushed directly to
Vercel's encrypted env store via authenticated API calls. They were not
echoed into any other file, commit, or persisted memory.

## 4. Build fixes required to get a working Preview (code changes)

Two real, pre-existing incompatibilities with Vercel's build pipeline
(unrelated to the runtime-boundary work) were found and fixed — both
gated on Vercel's own `VERCEL` build-time environment variable, so local/
self-hosted behavior (Docker etc.) is unchanged:

1. `next.config.ts` set `output: "standalone"` unconditionally. Vercel's
   builder produces its own serverless output and does not support
   `"standalone"` cleanly — it broke Next's file-tracing output
   (`ENOENT: .next/next-server.js.nft.json` during "Finalizing page
   optimization"). Now: `output: process.env.VERCEL ? undefined : "standalone"`.
2. `scripts/prepare-standalone.mjs` (a postbuild step that copies static
   assets into `.next/standalone` for self-hosted deploys) now exits
   immediately as a no-op when `process.env.VERCEL` is set, since there is
   no `.next/standalone` directory to populate under Vercel's builder.

Both changes are in commit `7b42ae4`.

## 5. Deployment record

- Attempts 1–2: failed at file-upload with transient Vercel API errors
  (`500 Internal Server Error`, then `ECONNRESET`) — both mid-upload of the
  ~39MB initial payload, before any `.vercelignore` existed. Not
  configuration bugs; resolved by retrying (Vercel's file store is
  content-addressed, so retries only re-upload what didn't land).
- Attempt 3 (first with `.vercelignore`): upload succeeded (1601 files
  scanned, down from 59,908) but build failed — the unanchored-`artifacts`
  bug in §2 (`TS2307` in the daemon auth-inventory test).
- Attempt 4 (anchored `.vercelignore`): upload + typecheck succeeded, build
  failed later — `NEXTAUTH_SECRET is required` (§3, zero env vars existed).
- Attempt 5 (env vars set): typecheck + static generation succeeded (105
  pages), build failed at `Finalizing page optimization` — the
  `output: "standalone"` incompatibility (§4).
- **Attempt 6 (final): succeeded.**

| Field | Value |
|---|---|
| Deployment ID | `dpl_A8mAeifXP4tt8xctQQS6NRnitSrp` |
| Preview URL | `https://instagithubanalizer-cfzqxy2hr-galstyanh992-8644s-projects.vercel.app` |
| Inspector | `https://vercel.com/galstyanh992-8644s-projects/instagithubanalizer/A8mAeifXP4tt8xctQQS6NRnitSrp` |
| State | `READY` |
| Target | `null` (Preview — **not** `"production"`; confirmed via `get_deployment` API, distinct from this project's 4 pre-existing `target:"production"` deployments) |
| Alias | `[]` (no production domain attached) |
| Source | `cli` (`vercel deploy`, no `--prod` flag ever used) |
| Git ref deployed | `feat/vercel-local-runtime` @ `ed61390961a46e94423eeed0302198918dd86db6` (app code) + local working-tree changes from `7b42ae4` uploaded in the same deploy |
| Build duration | ~2m (CLI total runtime 196.56s including upload) |
| Region | `iad1` (Washington, D.C.) |

The CLI's own closing line confirms the guardrail held:
`To deploy to production (instagithubanalizer.vercel.app), run 'vercel --prod'`
— i.e. production deploy is a distinct, un-taken action.

**VERCEL_PRODUCTION_DEPLOYED=NO.** No `--prod` flag, no promotion, no alias
change, no production domain touched at any point in this pass.

## 6. Next steps (tracked separately)

Preview boot test, HOME-PC/dashboard reality checks, remote text/tool E2E,
approval/cancel/reload/offline E2E, the voice pipeline gate, Realtime
fallback + security + performance checks, final regression re-run, and the
Section 32 status block are tracked in the active task list and reported in
`JARVIS_VERCEL_PREVIEW_E2E.md` / `JARVIS_REMOTE_VOICE_E2E.md`.
