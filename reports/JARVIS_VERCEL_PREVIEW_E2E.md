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

### Deploy blocker — resolved

The Linux sandbox and the Windows-side Vercel CLI both had zero cached
Vercel auth (confirmed by inspection, not assumption — see git history of
this report for the original blocker writeup). Surfaced honestly to the
user via `AskUserQuestion`; user supplied a Vercel PAT, used transiently
(never written to any file, report, or commit) to run
`npx vercel deploy --token=<redacted> --scope=<redacted> --yes` from the
Windows side via a persistent Desktop Commander process (the sandboxed
bash tool's ~180s call cap is shorter than this project's build+deploy
time).

Resulting deployment, confirmed via the Vercel MCP tool (`get_deployment`):

```
deploymentId: dpl_4Vj8656CsdLnzRTebbN4916rMnC1
url: https://instagithubanalizer-h0iyevf0p-galstyanh992-8644s-projects.vercel.app
state: READY
target: null   (Preview — confirmed NOT production; no alias assigned)
githubCommitSha: dba259d...  (carries all 4 files from the repair pass)
```

`JARVIS_DAEMON_GATEWAY_URL` in `.env.local` was updated to the new URL and
the local daemon (Task-Scheduler-managed) restarted to point at it.

## Live verification against the redeployed Preview (Sections 6, 7, 11, 12, real device E2E continuation)

All of the below was observed directly — real authenticated Chrome session
(logged in as a real Supabase user), real network trace, real Vercel
runtime-error query, real process kill/restart on HOME-PC — not asserted
from the code alone.

### Section 7 — Dashboard registry match: now PASS

- Devices tab ("Устройства") added to the existing right-sidebar tab group
  renders live: device card shows `JARVIS-PC`, status, last-heartbeat
  timestamp, and `Программы 46/67 · Возможности 204/245 · ревизия
  d64f10454b...` — all read verbatim from `/api/devices/status`, no
  hardcoded 67/245.
- Clicking the card opens the full per-program detail view: all **67**
  real programs listed individually with real, varied per-program
  `installed`/`enabled`/`running`/`health` values (e.g. `Agent Reach`,
  `Antigravity`, `Browser Use`, `Docker`, `Claude Code`, `Crawl4AI`,
  `MCP: desktop-commander`, `supabase_db_...`, `chatbot-ragflow-...` and
  more) — far exceeding the master prompt's ≥20-sample requirement, and
  matching the real registry rather than a sample/mock subset.

### Section 7 continued — realtime ONLINE → OFFLINE → ONLINE, no page reload: PASS

Full round-trip performed against a single, never-reloaded browser tab:

1. **Baseline (ONLINE).** Card read: `12.08.2026, 00:42:12 ·  Программы
   46/67 · Возможности 204/245 · ревизия d64f10454b...`.
2. **Killed the daemon for real.** `Stop-ScheduledTask -TaskName
   'JARVIS-Daemon'` alone did *not* stop the underlying process — a real,
   separate finding: `Get-CimInstance Win32_Process -Filter
   "Name='node.exe'"` showed **two full duplicate daemon process trees**
   (6 node.exe PIDs total) still running `src\daemon\index.ts`. Killed all
   6 explicitly (`Stop-Process -Id <6 literal PIDs> -Force`), then
   confirmed via a follow-up process list that zero daemon-related
   processes remained (only unrelated MCP-server node processes).
3. **Waited past `STALE_MS` (90s).**
4. **Re-screenshotted the same open tab (no navigation, no reload).**
   Sidebar card flipped to `OFFLINE`. Zoomed capture confirms the exact
   badge text and that the **last-known** heartbeat timestamp
   (`12.08.2026, 00:49:32`) is preserved, not fabricated fresh. Clicking
   into the detail view showed all 67 programs' `health` forced to
   `UNKNOWN_DEVICE_OFFLINE` — exactly the master prompt's requirement
   ("Never display stale READY/ONLINE state for programs belonging to an
   offline device"). This offline-forcing was pre-existing server-side
   logic (`registry-projection.ts`'s `markProjectionOffline()`); the UI
   simply renders what the API honestly returns.
5. **Restarted the daemon** (`Stop-ScheduledTask` → `Start-ScheduledTask`
   on `JARVIS-Daemon`), waited 35s for a fresh heartbeat cycle
   (`HEARTBEAT_INTERVAL_MS=30000`).
6. **Re-screenshotted the same tab again (still no reload).** Card flipped
   back to `ONLINE` with a fresh heartbeat (`12.08.2026, 00:58:17`) and
   the **same** registry revision `d64f10454b...` and counts
   (`46/67`, `204/245`) restored — correct, since nothing changed in the
   local registry itself, only the daemon process restarted.

Transition mechanism is the dashboard's existing 20s `refreshEntities()`
poll (`public/dashboard/live.js`) — a polling fallback, not Supabase
Realtime, but it satisfies the master prompt's stated acceptance
("Realtime (or polling-fallback) online/offline transition without page
reload").

**REMOTE_DASHBOARD_REALITY=PASS.**

### Section 11 — `/api/translate` 500 count: PASS, count = 0

- Network trace filtered on `translate`: 5 `POST /api/translate` calls
  during this session's live testing (triggered by opening Settings →
  "МОЙ КОМПЬЮТЕР" and other panels), all `statusCode: 200`.
- `get_runtime_errors` for the deployment's runtime, checked directly:
  zero errors attributable to `dpl_4Vj8656CsdLnzRTebbN4916rMnC1` (the only
  entry present is one unrelated pre-existing error tied to the *old*
  deployment, from before this pass).
- PC-Profile field labels (Profile name, CPU, GPU, VRAM (GB), etc.) now
  render fully in Russian with **zero** related network calls — resolved
  locally from `EXACT_TRANSLATIONS`, confirming the spam-reduction fix
  works as intended, not just the error-handling fix.

**DASHBOARD_TRANSLATE_500_COUNT=0.**

### Section 12 — Secret exposure check: PASS

Grepped the client-shipped bundle surface (component/page source under
`src/app`, `src/components`, and `public/dashboard/*.js`) for both
`JARVIS_DAEMON_PROTECTION_BYPASS_SECRET`/`x-vercel-protection-bypass` and
`JARVIS_DAEMON_TOKEN` by variable name and by their literal values — zero
matches outside server-only files (`src/daemon/**`, `src/app/api/**` route
handlers, `.env.local`). Both remain plain (non-`NEXT_PUBLIC_`) env vars,
so Next.js's build never bundles them into client code by construction;
the grep confirms no code path additionally leaks them (e.g. via a debug
log or an API response body).

### HEAD `/` → 503 (Section 5 finding) — investigated, root cause: Vercel platform, not app

Unauthenticated `curl -I` against the Preview URL returns the same
Vercel-SSO redirect/challenge behavior for both `GET` and `HEAD` requests
(deployment protection intercepts at the edge before the app runs).
`get_runtime_errors` shows zero application-level log entries correlating
with any `503` for this deployment. Conclusion: this is Vercel Deployment
Protection's edge behavior on `HEAD` requests, not a defect in
`src/middleware.ts` or any route handler (`middleware.ts` has no
HEAD-specific branching to begin with — see file). No code change applied;
none is warranted for an edge-platform response code.

### INP (~3.17s blocked interaction) — targeted fix applied, not a broader project

`RussianInterfaceTranslator`'s initial full-`document.body` `TreeWalker`
pass was moved off the hydration-critical path via `requestIdleCallback`
(`setTimeout` fallback for browsers without it) — see code change list
below. This was the one synchronous, unbounded DOM walk the component
performed at mount; no other optimization work was undertaken, per the
master prompt's explicit "do NOT perform a major UI optimization project
now" constraint.

### Duplicate daemon processes — new observation, not fixed in this pass

Discovered while stopping the daemon for the offline test: **two full
process trees** for `src\daemon\index.ts` were running simultaneously
under the `JARVIS-Daemon` scheduled task (6 `node.exe` PIDs, not 3).
Recorded here as a real finding worth follow-up (possible task-trigger
misconfiguration causing double-start), but out of scope to fix in this
pass — not blocking any Preview E2E requirement.

## Sections 8-13 (remote tool E2E: system status, Ollama, filesystem, MCP, browser, n8n) — BLOCKED, real architectural gap found

Before writing any test command, the actual command → task → daemon →
execute → report chain was mapped end-to-end by reading the real code
(`src/lib/command-router/**`, `src/components/jarvis/use-jarvis.ts`,
`src/app/api/devices/[id]/commands/route.ts`,
`src/lib/jarvis/tasks/create-remote-task.ts`, `prisma/schema.prisma`,
`src/daemon/poller/index.ts`, `src/daemon/executors/**`,
`src/daemon/api/client.ts`, `src/lib/jarvis/realtime/broadcast.ts`). This
was necessary rather than optional: without it, "PASS" could only have
been asserted by trusting that a UI affordance exists and works, which
is exactly the kind of unverified claim this whole pass has been avoiding.

**Finding, confirmed by reading the code (not inferred): none of the 6
target capabilities are wired through the real daemon task-execution
chain today.** This matches the project's own architecture doc
(`docs/jarvis/remote-architecture.md`, 2026-08-10), which states under
"Not done in this pass": *"Wiring `/api/daemon/tasks/claim` execution to
real local capabilities (Ollama, Desktop Commander, MCP, browser) for
remote-command tasks — the daemon's `executeTask` currently only
understands mock commands... There is no existing 'chat/voice message →
remote AgentTask → daemon executes it → result streams back to the
browser' path yet."*

Concretely:

- The only real task-creation endpoint that inserts a daemon-claimable
  `AgentTask` row is `POST /api/devices/{id}/commands` → `createRemoteTask()`
  (`src/lib/jarvis/tasks/create-remote-task.ts`). The chat/voice command
  surface (`use-jarvis.ts` → `/api/jarvis/orchestrate`) and
  `src/lib/command-router/router.ts` are **not connected to it** —
  `command-router` is explicitly plan-only ("never executes" in its own
  comments) and `/api/jarvis/orchestrate` handles cloud media generation,
  not device commands.
- The daemon's `executeTask()` (`src/daemon/poller/index.ts`) string-matches
  `task.title` against a class literally named `MockExecutors`
  (`src/daemon/executors/index.ts`) with exactly four commands: `NOOP`,
  `HEALTH_CHECK` (a path-safety boolean, not OS metrics), `READ_METADATA
  <path>` (one file's hash/size, not a directory listing), and
  `WRITE_TEST_ARTIFACT <name>`. `ExecutionPlan`-based steps are additionally
  gated by `DaemonRegistry.assertAllowed()`, whose static allow-list
  contains only `NPM_TYPECHECK` and `NPM_TEST`.
- Real implementations of all 6 capabilities *do* exist elsewhere in the
  codebase, but every one is architecturally scoped to run only when the
  Next.js app itself executes locally on the home PC
  (`JARVIS_RUNTIME_ROLE=local-full-dev`, reached via `localhost`), and each
  fails closed with `LOCAL_EXECUTION_FORBIDDEN`/501/403 when
  `JARVIS_RUNTIME_ROLE=web-control-plane` (i.e. when running on this Vercel
  Preview) — confirmed by reading `src/app/api/jarvis/ollama/route.ts`,
  `src/app/api/files/list/route.ts`,
  `src/lib/jarvis/phase-b/docker-service-manager.ts` (n8n). The one
  exception is `GET /api/mcp-bridge/status`, whose own doc-comment states
  it **"Never checks a real port, never launches a process"** — that one is
  fully mocked, not just misrouted. `POST /api/browser/control` runs a real
  Playwright browser, but with zero `JARVIS_RUNTIME_ROLE` gate — on this
  Preview it would launch (or fail to launch, no Chromium binary) inside
  the Vercel function itself, not on the home PC.
- `os-metrics` (system status) is partially real: CPU/RAM come from real
  `os.cpus()`/`os.totalmem()`, but GPU/VRAM/temperature/network are
  hardcoded/`Math.random()` placeholders (`src/app/api/os-metrics/route.ts`),
  and — since this route has no runtime-role gate either — on the deployed
  Preview it would report the Vercel serverless function's own CPU/RAM, not
  the home PC's, regardless.

**Conclusion:** the master prompt's Sections 8-13 ask to verify the full
real chain (*Preview → task → Supabase → daemon → claim → Policy Engine →
Capability Registry → real adapter → real local execution → events →
Preview result*) for these 6 specific capabilities. That chain's daemon
side currently only exists for 4 generic, already-tested primitives
(NOOP/HEALTH_CHECK/READ_METADATA/WRITE_TEST_ARTIFACT) plus npm
typecheck/test — not for system status, Ollama, filesystem browsing, MCP
listing, browser control, or n8n control. Building real daemon executors
and remote-task routing for all 6 would be substantial new engineering
(new executor files, new claimable task types, extending the registry
allow-list, wiring the chat surface to `/api/devices/{id}/commands`) —
outside the scope of a "product-gap repair" pass and not something to do
silently. **Per this pass's own explicit instruction not to fake a PASS
result, Sections 8-13 are reported here as BLOCKED on a real, documented
architectural gap rather than marked passing or worked around.**

## Sections 8-13 RESOLVED — real daemon capability execution layer built and verified end-to-end (follow-up pass)

The architectural gap documented above was closed in a dedicated follow-up
pass ("BUILD REAL DAEMON EXECUTION FOR ALL 6 REMOTE CAPABILITIES"). This
section records what was built and the real, live-Preview evidence for
each capability — not a design description, a verification record.

### Architecture built

A single governed dispatcher, not six hard-coded branches:

- `src/lib/jarvis/capabilities/envelope.ts` — shared, pure-data command
  envelope (`protocolVersion`/`taskId`/`targetDeviceId`/`capability`/
  `operation`/`arguments`/`requestId`/`context`/`risk`), an explicit
  allow-list of capability/operation pairs (`CAPABILITY_OPERATIONS`), and
  the phrase-independent contract both the web route and the daemon share.
- `src/daemon/capabilities/registry.ts` — `DaemonCapabilityRegistry.dispatch()`:
  policy check → resolve executor → validate → timeout-wrapped execute with
  a real `AbortController` (not just an internal timer) → 256KB output cap
  with truncation → normalized succeeded/failed result. Per-capability
  timeouts: system 10s, ollama 15s, filesystem 8s, mcp 25s, browser 20s,
  n8n 150s.
- `src/daemon/capabilities/policy.ts` — routes every operation through the
  existing `checkPermission()` (`src/lib/safety/permission-checker.ts`),
  fails closed on any capability/operation not in the envelope catalog.
- Six executors (`src/daemon/capabilities/{system-status,ollama,filesystem,
  mcp,browser,n8n}.ts`), each reusing the existing real local-runtime
  implementation directly rather than duplicating it — real `os.*()` calls,
  the real Ollama HTTP adapter, the daemon's own `PathGuard`, the real
  `McpClientManager`, the real CamoFox REST client, and the real
  `phaseBDockerServiceManager` + `n8nWorkflowController` (which already
  hard-restricts execution to one approved fixture workflow).
- `src/daemon/poller/index.ts` — dispatches `CAPABILITY:<capability>:
  <operation>` titled tasks to the registry, parsing the full envelope from
  `AgentTask.request` (existing, previously-unused schema column).
  `POST /api/devices/{id}/commands` accepts `{capability, operation,
  arguments}` in addition to the legacy `{title, description}` shape,
  validated against the same catalog. New `GET /api/tasks/{id}` (owner-gated,
  read-only) lets the browser poll a command to completion.
- Chat wiring: **both** `src/components/jarvis/use-jarvis.ts` (React) and
  `public/dashboard/live.js` (the actual live, no-build cockpit — see
  finding below) detect the 6 target Russian phrases, create a task against
  the first ONLINE device, and poll it to completion, rendering the result
  in chat.

Tests: `src/daemon/capabilities/__tests__/{policy,registry}.test.ts` (9
tests — policy allow/deny matrix, dispatch validation order, timeout/
cancellation signal propagation, output-size truncation). Combined with
pre-existing `path-guard`/`process-runner` tests: **16/16 passing** on the
real Windows daemon toolchain (this Linux sandbox cannot run vitest at all
— pre-existing missing `@rolldown/binding-linux-x64-gnu`, unrelated to this
change).

### Real bugs found and fixed during E2E, not before it

Verification-by-doing surfaced two genuine defects that a design review
would not have caught:

1. **The entire React-side chat wiring was unreachable.** `useJarvis()` is
   only called from `JarvisUnifiedConsole`, which nothing in the app
   mounts (confirmed by grep: one definition, zero importers, and by typing
   the target phrase into the live dashboard and observing zero
   `POST /api/devices/.../commands` requests). The chat the user actually
   types into is `public/dashboard/index.html` + `live.js`'s `sendCommand()`
   → `POST /api/chat`, a completely separate, no-build vanilla-JS surface.
   Fixed by adding the same phrase-detection + task-create + poll-to-
   completion flow directly to `live.js` (commit `df7fffa`). The React-side
   wiring was left in place as correct-but-unreachable code, not reverted —
   a later, separate UI-architecture decision should either mount
   `JarvisUnifiedConsole` or remove the dead path.
2. **`submitPrompt()` called `handleBrowserChatCommand()` before
   `sendCommand()`**, and that pre-existing local web-agent quick-command's
   `browserIntent` regex is broad enough to match the exact target phrase
   "Джарвис, открой браузер и безопасную тестовую страницу." — hijacking it
   into `POST /api/browser/camofox`, a Next.js API route that runs inside
   the Next.js server process itself. On Vercel that process can never
   reach CamoFox on `127.0.0.1:9377` on HOME-PC, so it reported "CamoFox
   unavailable" regardless of whether CamoFox was actually running.
   Confirmed real via network-request inspection (both failed attempts hit
   `/api/browser/camofox`, zero `AgentTask` rows created) and by starting
   CamoFox locally and retrying — still hijacked. Fixed by checking
   `matchRemoteCapability()` first in `submitPrompt()` (commit `a7d4ff7`).
   The voice-recognition path has the same ordering bug but is out of scope
   (a separate, not-yet-started phase of this project's test plan).

A third issue was infrastructure, not code: **CamoFox crashed once between
two consecutive `browser.open` attempts** (process exited, port 9377 no
longer listening, root cause not diagnosed — possibly a Camoufox/Firefox
launch issue under repeated real invocation). Restarting it and confirming
`GET /health` returned `browserConnected:true` before retrying resolved it.
Recorded as a known local-environment fragility, not a capability-layer
defect — the CamoFox REST client code itself worked correctly once the
service was actually up.

### Real remote E2E results (live Vercel Preview → Supabase → HOME-PC daemon → real local execution → result back to Preview chat)

Preview: `https://instagithubanalizer-a4g37cny8-galstyanh992-8644s-projects.vercel.app`
(commit `a7d4ff7`, `target: null` confirmed Preview). Daemon restarted
against this URL. All 6 target Russian phrases typed into the real chat
input; results captured via the live chat UI and cross-checked against
`GET /api/tasks/{id}` (owner-session `fetch()` from the page, since the
chat overlay auto-hides after a few seconds):

| # | Phrase | Capability.Operation | Result | Evidence |
|---|---|---|---|---|
| 1 | "Джарвис, скажи состояние системы." | `system.status` | **succeeded** | Real `os.*()` data: `pid` in the result matched the actual daemon process PID observed independently via `Get-CimInstance`; live subsystem checks (`ollama: HEALTHY`, `n8n: STOPPED — Docker недоступен`, `browser: STOPPED`, `mcp: NOT_INITIALIZED`) |
| 2 | "Джарвис, какие модели Ollama установлены?" | `ollama.models` | **succeeded** | Real model metadata from the local Ollama server (e.g. `deepseek-coder-v2:16b`, `parameter_size: 15.7B`, real byte size) |
| 3 | "Джарвис, покажи файлы корня проекта." | `filesystem.list` | **succeeded** | Real directory listing matching the actual project root (`check_env.mjs`, `clean_schema.mjs`, `components.json`, `CONTENT_GENERATION.md`, ...) |
| 4 | "Джарвис, покажи активные MCP серверы." | `mcp.list` | **succeeded** | Real live MCP connections with real per-server latency (`desktop-commander`: stdio, `connected:true`, `toolCount:26`, `latencyMs:8413`; `jina`: http, `toolCount:21`, `latencyMs:736`) |
| 5 | "Джарвис, открой браузер и безопасную тестовую страницу." | `browser.open` | **succeeded** (after fixing bug #2 above and restarting CamoFox) | `GET /api/tasks/{id}` confirmed `status:"succeeded"`, `result: {"tabId":"8ab359f7-...","url":"https://example.com/"}` — the real CamoFox tab, the fixed `SAFE_TEST_URL` |
| 6 | "Джарвис, запусти safe smoke-тест n8n." | `n8n.smoke` | **failed, honestly** | Real check performed (5.3s), real result: `{"error":"Docker недоступен на этой машине — smoke-тест n8n невозможен"}` — independently confirmed via `docker ps` on HOME-PC failing with "cannot connect to the Docker API" (Docker Desktop is not running on this machine right now). This is the correct fail-closed behavior, not a code defect — n8n was never started, so `N8N_FINAL_STATE` is unchanged (was already stopped, remains stopped) |

**5 of 6 capabilities verified with real successful execution; the 6th
(n8n) was verified to genuinely attempt real execution and honestly report
a real environmental blocker (Docker Desktop not running on HOME-PC),
rather than being faked or silently skipped.** No mock command paths were
touched or reused for any of the 6 — every result above traces to a real
adapter call against a real local service or the real filesystem/OS.

## Code changes in this pass

- `src/daemon/config/index.ts`, `src/daemon/api/client.ts` — Protection
  Bypass wiring (see §6.2). Additive, backward-compatible (no-op unless the
  new env var is set).
- `.env.local` — `JARVIS_DAEMON_GATEWAY_URL` updated to the current live
  Preview URL; `JARVIS_DAEMON_PROTECTION_BYPASS_SECRET` added. Local-only
  file, not committed to git (already gitignored).
- `src/daemon/capabilities/**` (new) — command envelope catalog, policy
  gate, timeout/cancellation/output-cap registry, 6 capability executors,
  9 focused tests. See "Sections 8-13 RESOLVED" above for full detail.
- `src/daemon/tsconfig.json` — added `@/*` path alias so daemon code can
  import `src/lib/**`/`src/local-runtime/**` by their normal specifiers.
- `src/daemon/poller/index.ts` — new `CAPABILITY:` task-title branch
  dispatching to the registry.
- `src/lib/jarvis/tasks/create-remote-task.ts`,
  `src/app/api/devices/[id]/commands/route.ts` — accept the new
  `{capability, operation, arguments}` request shape alongside the legacy
  `{title, description}` one.
- `src/app/api/tasks/[id]/route.ts` (new) — owner-gated read-only task
  status endpoint for chat-side polling.
- `src/components/jarvis/parse-remote-capability-command.ts` (new),
  `src/components/jarvis/use-jarvis.ts` — React-side phrase detection and
  remote-task flow (currently unreachable — see bug #1 above).
- `public/dashboard/live.js` — the real fix: phrase detection, task
  creation, and polling wired into the actual live `sendCommand()`/
  `submitPrompt()` flow (commits `df7fffa`, `a7d4ff7`).
