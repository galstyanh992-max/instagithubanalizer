# JARVIS Vercel Preview — Real Remote E2E Results

Scope: "JARVIS REMOTE CONTROL — VERCEL PREVIEW + REAL REMOTE E2E" master prompt,
Sections 5-7 (boot test, HOME-PC reality, dashboard match). Companion to
`JARVIS_VERCEL_PREVIEW_DEPLOY_MANIFEST.md` (deploy record, Sections 1-4) and
`JARVIS_VERCEL_LOCAL_RUNTIME_MIGRATION.md` (earlier runtime-boundary work).
This record is additive; it does not replace prior reports.

**Live Preview URL at time of writing:**
`https://instagithubanalizer-jmz17e2w0-galstyanh992-8644s-projects.vercel.app`
(deployment `dpl_DLkAyCLPhb7YSV3CYaLPx9XUq6n7`, `target: null` i.e. Preview,
not production). Note this URL changes on every `vercel deploy` — see §3.

## Section 5 — Preview boot test: PASS

Via real Chrome browser tools against the live HTTPS URL (not a mock/local
server):
- Renders the correct login screen ("ДЖАРВИС / ВХОД В СИСТЕМУ") on first
  load, no blank page, no build-error page.
- Zero app-level console errors. The only console entries are
  `MaxListenersExceededWarning` / `ObjectMultiplex` warnings from the
  MetaMask browser extension (`chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/...`)
  — unrelated to the app.
- Login (email/password against real Supabase Auth) succeeds: `POST /login`
  → 200, redirects to `/`, loads the full "ДЖАРВИС OS" 3D dashboard
  (`dashboard/app.js`, `core3d.js`, `avatar3d.js`, three.js) with live
  data calls (`/api/os-metrics`, `/api/providers/status`, `/api/projects`,
  `/api/music/local`) all returning 200.
- Supabase session established and persisted (subsequent authenticated API
  calls succeed without re-prompting for login).
- One real, minor finding surfaced by Vercel's own toolbar: an **INP
  (Interaction to Next Paint) issue** — "Event handlers on this element
  blocked UI updates for 3,173.3ms" on the `<body>` element. Not a
  functional failure, but a real, worth-fixing performance issue (see
  Section 28 note below); not something to paper over.
- One unexplained observation: a `HEAD /` and `HEAD /login` request each
  returned `503` during initial page load, alongside the normal `200`
  responses for the actual page/asset requests. Likely a HEAD-method
  edge-case on a dynamic route (Next.js Server Actions / middleware don't
  always implement HEAD) rather than a real outage — the same URLs serve
  `200` via GET/POST throughout — but recorded here rather than silently
  dropped, since it wasn't root-caused.

## Section 2 correction (env vars) — logged here since it was discovered via E2E, not inspection

The manifest's original Section 2 write-up said `JARVIS_DAEMON_TOKEN` was
deliberately *not* set on Vercel, reasoning that "the web-control-plane
process must never hold the daemon bearer token." That reasoning was
**wrong** and caused a real failure during this E2E pass (§3). The rule that
actually matters is *never send the daemon token to the browser* — the
Next.js **server** (not the browser) legitimately needs
`JARVIS_DAEMON_TOKEN` to validate the daemon's Bearer token in
`requireDaemonAuth()` (`src/app/api/daemon/auth.ts`), exactly the same way
it needs `SUPABASE_SERVICE_ROLE_KEY` server-side. It is a plain (non-
`NEXT_PUBLIC_`) env var, so Next.js never bundles it into client-side code.
It has since been added to the Preview environment (server-only, `target:
["preview"]`) and a fresh deployment was made so the running Lambda picks
it up (Vercel bakes env vars into the deployment at build time — adding one
does **not** retroactively apply to an already-running deployment; this was
independently rediscovered in §3).

## Section 6 — HOME-PC reality: PASS (after fixing 3 real, distinct bugs)

Initial state: `GET /api/devices/status` (session-authenticated, real
endpoint, not mocked) showed the daemon `OFFLINE` with `lastHeartbeatAt`
~20 hours stale, **despite Windows Task Scheduler reporting the
`JARVIS-Daemon` task as "Running."** That mismatch was itself worth
surfacing: Task Scheduler's own state does not reflect whether the
underlying `node`/`tsx` process is actually alive.

Root-caused and fixed three independent, real problems, each verified by
reproducing the failure and then the fix:

1. **Daemon pointed at nothing.** `JARVIS_DAEMON_GATEWAY_URL` in
   `.env.local` was `http://localhost:3000` — no local dev server was
   running (`Get-NetTCPConnection -LocalPort 3000` found nothing listening).
   The daemon had never been pointed at any Vercel deployment, local or
   Preview. Fixed by pointing it at the live Preview URL.

2. **Vercel Deployment Protection (Vercel Authentication / SSO) blocked the
   daemon entirely**, independent of the daemon's own auth. This project
   has `ssoProtection.enabled: true, deploymentType: "all_except_custom_domains"`
   — every `*.vercel.app` URL requires a Vercel team session to reach *at
   all*, for *any* client, browser or not. The daemon's request got a
   `401` with a plain-text `"Unauthorized"` body — proven to be Vercel's
   edge, not the app, because the app's own `requireDaemonAuth()` always
   returns a JSON `{"error": "..."}` body and never plain text (verified by
   reading `src/app/api/daemon/auth.ts`). Fixed properly, not by disabling
   protection project-wide: generated a **Protection Bypass for Automation**
   secret via `PATCH /v1/projects/{id}/protection-bypass` (Vercel's
   documented mechanism for exactly this case — automated/server clients
   bypass Vercel Authentication via an `x-vercel-protection-bypass` header
   while browsers still require full Vercel SSO). Wired into the daemon:
   - `src/daemon/config/index.ts`: new optional
     `PROTECTION_BYPASS_SECRET` (`JARVIS_DAEMON_PROTECTION_BYPASS_SECRET`
     env var, empty by default — a no-op for local/self-hosted gateways).
   - `src/daemon/api/client.ts`: `fetchWithAuth()` now sends
     `x-vercel-protection-bypass` whenever that config value is set.

3. **`JARVIS_DAEMON_TOKEN` missing on Vercel** (see correction above) —
   after clearing the SSO wall, the app's own auth then failed with
   `500: Server misconfiguration: missing JARVIS_DAEMON_TOKEN`. Fixed by
   adding the variable and redeploying (env-var-only change, no code
   difference from the deployment already verified in the manifest).

After all three fixes and a redeploy, a direct `curl` to
`/api/daemon/register` with the real daemon token + bypass header returned
`200 {"status":"registered","deviceId":"cmsn2lqg00001iracv46u5oir"}`, and
the actual Task-Scheduler-managed daemon process (not a manual curl)
produced a **fresh heartbeat and a newly published registry snapshot**:

```
status: ONLINE
lastHeartbeatAt: 2026-08-11T15:41:56.989Z
registryProjection.revision: dd4f5045db7b79826a1fab3b3df990c710eb927dc66451cb4b5d7c880a3f4909  (changed from e0720b37...)
registryProjection.generatedAt: 2026-08-11T15:40:24.509Z
registryProjection.publishedAt: 2026-08-11T15:40:25.758Z
programsSummary.total: 67 (installed 45, enabled 50, running 17, healthy 29, missing 3)
capabilitiesSummary.total: 245 (installed 204, enabled 228, running 146, healthy 188, missing 33)
```

These are real counts from the real machine's registry projection, not
hardcoded placeholders — the revision hash changed between the stale and
fresh reads, proving a genuine new publish rather than a cached response.

**Known limitation, not yet resolved:** Preview URLs are per-deployment and
change on every `vercel deploy` (confirmed twice this session —
`...cfzqxy2hr...` then `...jmz17e2w0...`). The daemon's gateway URL is a
static config value, so every future Preview redeploy will require
manually updating `JARVIS_DAEMON_GATEWAY_URL` and restarting the daemon
again, exactly as done in this pass. A stable target (a Vercel deployment
alias/custom domain pointed at the latest Preview, or reading
`VERCEL_URL`-equivalent dynamically) would remove this friction for future
rounds — flagged here rather than solved, since changing the alias/domain
strategy is a product decision, not a bug fix.

## Section 7 — Dashboard match (≥20 real programs sampled): FAIL (real gap found, not a mock/workaround)

Checked directly rather than assumed: `grep -r "programsSummary|registryProjection|capabilitiesSummary"
src/` matches only `src/app/api/devices/status/route.ts` and the two
daemon/lib registry-projection modules — **zero matches under
`src/components` or any page**. Confirmed live by loading the real
dashboard (`/`) in a fresh, logged-in browser session and inspecting every
network request it fires: `/api/os-metrics`, `/api/providers/status`,
`/api/projects`, `/api/music/local`, `/api/translate` — never
`/api/devices/status` or anything registry-shaped. The "СИСТЕМА" nav item
opens an AI-routing/provider settings modal, not a device/program view;
its "МОЙ КОМПЬЮТЕР" tab is a static, user-editable PC-profile form (OS,
CPU, GPU, storage fields), unrelated to the daemon's live registry.

**Conclusion: there is currently no dashboard surface that displays the
daemon's real program/capability inventory at all**, so the master
prompt's literal ask (sample ≥20 real programs from the dashboard UI and
match them against the local registry) cannot be performed — not because
the data is wrong, but because no UI consumes it yet. Section 6 already
proved the data itself is real and reaches the backend correctly; this is
a distinct, real product gap (missing view), reported honestly rather than
declared passing on the strength of the API check alone.

**Second real finding from the same pass:** `POST /api/translate` returned
**500** on every dashboard load (reproduced 3 times across page loads at
15:39, 16:02, and this check). Not investigated further in this pass
(out of scope for daemon connectivity) but flagged here since it's a real,
reproducible server error on a route the dashboard calls unconditionally
on load.

## Product-gap repair pass (continuation, code-complete / deploy-pending)

Scope: master prompt "JARVIS VERCEL PREVIEW — PRODUCT-GAP REPAIR + REMOTE E2E
CONTINUATION," Sections 1-14. Fixes for the two Section-7/translate defects
found above are implemented, locally verified, committed (`49199b5`, pushed),
and additive to this report. **Live verification against a fresh Preview
deployment (Sections 6, 15+) is blocked** — see Blocker below — so the
statuses here are code-level, not yet deployment-confirmed.

### Root cause, confirmed with real evidence (not theory)

Pulled directly from Vercel's own runtime-error aggregation
(`get_runtime_errors`, not guessed): `[api] error: MockMode`, count=19,
route=`/api/translate`, `lastDeployment=dpl_DLkAyCLPhb7YSV3CYaLPx9XUq6n7`.
Traced through `AiProviderRouter.chat()`: when zero AI providers are
registered server-side (no `OPENROUTER_API_KEY`/etc. was ever set on this
Vercel Preview — only Supabase/DB/daemon-auth vars were), `getProviderForIntent`
returns `{isMock: true}` and `chat()` throws `Error("MockMode")` — a sentinel
the codebase's own comment says is meant to be caught by callers to produce a
mock reply, but `/api/translate/route.ts` never caught it, so it fell through
to `lib/api.ts`'s generic `safe()` → 500.

Trigger, confirmed by reading the render tree, not assumed: `RussianInterfaceTranslator`
is mounted globally in `src/app/layout.tsx`, but the actual visible dashboard
at `/` is a static HTML/JS "cockpit" (`public/dashboard/index.html` +
`live.js`) loaded via `<iframe>` in `src/app/page.tsx` — a separate document
the translator's `document.body` walk never touches. The English strings
actually triggering `/api/translate` come from `src/components/settings/pc-profile-settings.tsx`
("My PC Profile" — Profile name, CPU, GPU, VRAM (GB), etc.), a React
component rendered in the *outer* Next.js tree (opened from the cockpit's
"НАСТРОЙКИ"/Settings action) and therefore within the translator's reach.

### Fixes applied (all pure code; none require Vercel credentials to implement)

1. `src/app/api/translate/route.ts` — catches the `MockMode` sentinel and
   returns `{translations: {}}`-shaped originals-unchanged instead of an
   unhandled 500. Never fabricates a translation; matches what the client
   already tolerates on a non-200 response.
2. `src/components/i18n/russian-interface-translator.tsx` — added the ~19
   real PC-Profile field labels to the static `EXACT_TRANSLATIONS`
   dictionary (resolved locally, never reach the network again), and
   deferred the initial full-`document.body` `TreeWalker` pass to
   `requestIdleCallback` (setTimeout fallback) instead of running it
   synchronously at mount — a small, targeted mitigation for the
   previously-documented ~3.2s blocked-interaction INP finding, aimed at
   the one synchronous DOM-walk this component performs.
3. `public/dashboard/index.html` + `public/dashboard/live.js` — added a
   fourth "Устройства" (Devices) tab to the existing right-sidebar
   Projects/Tasks/Agents tab group (same component pattern, same 20s poll
   cadence via the existing `refreshEntities()` loop). Renders real device
   status/heartbeat/registry revision/program+capability counts straight
   from `/api/devices/status` — no hardcoded counts — and a full
   program-by-program detail view (installed/enabled/running/health) via
   the dashboard's existing `openText()` pattern, reused rather than
   building a second UI surface. OFFLINE handling (`UNKNOWN_DEVICE_OFFLINE`)
   needed no new client logic — `registry-projection.ts`'s
   `markProjectionOffline()` already forces it server-side; the UI just
   renders whatever the API honestly returns.

### Local verification (regression, Section 26)

- `npm run check:runtime-boundary` → `VERCEL_LOCAL_IMPORT_VIOLATIONS=0` (+8
  pre-existing documented false-positive exclusions, unchanged).
- `npx tsc --noEmit` (root config) → clean, 0 errors.
- `npx tsc --noEmit --project src/daemon/tsconfig.json` → clean, 0 errors.
- `npx eslint` on all 4 touched files → clean, 0 errors/warnings.
- `next build` and `vitest run` could **not** complete in this sandbox: both
  fail/hang on a pre-existing missing native binding
  (`@rolldown/binding-linux-x64-gnu`) unrelated to any file touched this
  pass — a sandbox toolchain gap, not a regression introduced here.
  Documented rather than silently skipped or worked around.

### Blocker: no live redeploy possible this session

Sections 6/7/15 (dashboard match, realtime online/offline, translate 500
count on the live Preview) and Sections 16-22 (remote text/tool E2E) all
require testing against a **freshly deployed** Preview carrying these code
changes. This session has no path to trigger that deploy:

- No Vercel PAT/token in the Linux sandbox environment (checked: no cached
  CLI auth, no `VERCEL*` env var).
- No Vercel CLI auth on the Windows side either (checked:
  `%LOCALAPPDATA%\com.vercel.cli` has only a `Cache` folder, no
  `auth.json`; `vercel env ls` there fails with "Could not retrieve
  Project Settings").
- The connected Vercel MCP tool (`c3c3a770-...`) is real and authenticated
  (used above for `get_runtime_errors`/`get_project`/`list_teams`,
  confirming project `prj_BqioTVaWMZyB9MHi0HFkj34T612R` /
  team `team_l9AKRwnO9Q4sSfcFgYdXMwZ1`) but exposes observability,
  deployment-protection, and greenfield file-upload deploys — no
  incremental "redeploy this existing git-linked project" or environment-variable
  management tool.
- `deploy_to_vercel` (file-tree upload) exists but is documented for
  shipping a freshly generated app; re-uploading this project's full
  several-hundred-file tree through it is impractical and was not
  attempted.

Net effect: the fixes are real, targeted, and locally verified, but
**unconfirmed live** until either a Vercel deploy token is provided again
or the deploy is run from a session/tool that has one.

## Code changes in this pass

- `src/daemon/config/index.ts`, `src/daemon/api/client.ts` — Protection
  Bypass wiring (see §6.2). Additive, backward-compatible (no-op unless the
  new env var is set).
- `.env.local` — `JARVIS_DAEMON_GATEWAY_URL` updated to the current live
  Preview URL; `JARVIS_DAEMON_PROTECTION_BYPASS_SECRET` added. Local-only
  file, not committed to git (already gitignored).
