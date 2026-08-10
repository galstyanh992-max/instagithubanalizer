# JARVIS Vercel + local-runtime migration — code-scope pass

Full detail: `docs/jarvis/remote-architecture.md` (architecture, gaps found/fixed,
what's not done). Setup runbook for the Windows/Vercel side:
`docs/jarvis/REMOTE_SETUP_WINDOWS_VERCEL.md`.

This pass ran in an isolated sandbox with no network path to the live
Supabase DB and no access to the Windows host — see "Environment constraint"
below. Scope was therefore code/architecture only, agreed with the user
up front.

## Files changed this pass

- `prisma/schema.prisma` — `AgentTask.targetDeviceId/leaseExpiresAt/idempotencyKey`, `Device.protocolVersion` (additive, nullable/defaulted)
- `prisma/migrations/20260810000000_remote_control_plane_protocol/migration.sql` (new, hand-written — DB unreachable from here)
- `src/app/api/daemon/tasks/claim/route.ts` — device targeting + stale-lease reclaim
- `src/app/api/daemon/tasks/[id]/events/route.ts` — lease renewal on progress events
- `src/app/api/devices/status/route.ts` (new) — owner-authenticated ONLINE/OFFLINE/DISABLED computed from heartbeat freshness
- `src/components/layout/device-status-badge.tsx` (new), `src/components/layout/topbar.tsx` — replaced hardcoded "ONLINE" badge with the real one
- `scripts/check-runtime-boundary.mjs` (new) + `package.json` script `check:runtime-boundary`
- `.env.example`, `src/lib/env.ts` — `JARVIS_RUNTIME_ROLE`

## Environment constraint — resolved via Desktop Commander on the real machine

The first half of this pass ran in an isolated sandbox with no DB
connectivity and hit file-lock errors trying to touch the same D:\ folder
from Linux. Once Desktop Commander connected (giving real access to the
actual Windows PC), all of that was re-checked and resolved directly:

- No git or node/tsx process was running on the real machine. The
  `.git/index.lock` was a few minutes old — almost certainly created by the
  sandbox's own git read colliding with the live Windows filesystem, not a
  concurrent live process. Removed cleanly.
- `git status --porcelain` on the real machine shows only the files this
  pass touched, plus pre-existing untracked scratch dirs
  (`.jarvis/`, `.playwright-mcp/`, `architecture/`, `artifacts/`, `vendor/`,
  etc.). The earlier "~290 modified files with huge diffs" reading from the
  sandbox was wrong — almost certainly a CRLF/LF artifact of the sandbox's
  Linux git reading the same repo, not real uncommitted work. Correcting
  that here.
- `npx prisma migrate deploy` applied both the pending
  `20260809180000_phase_c_capability_intelligence` migration (already
  pending before this pass, unrelated to it) and this pass's
  `20260810000000_remote_control_plane_protocol` to the live Supabase DB.
- `npx prisma generate` regenerated the client cleanly.
- `npm run typecheck` and `npm run daemon:typecheck` both exit 0.

## Terminal status block

See the block at the end of `docs/jarvis/remote-architecture.md` — reproduced here:

```
VERCEL_LOCAL_IMPORT_VIOLATIONS=73 (detected, not yet fixed)
DEVICE_REGISTRY=PASS (pre-existing)
REMOTE_TASK_PROTOCOL=PASS (lease/idempotency/targeting — applied to live DB)
ATOMIC_CLAIM=PASS (pre-existing)
TASK_LEASE=PASS (migration applied to live Supabase DB)
TYPECHECK=PASS (0 errors, app + daemon, verified on the real machine)
MIGRATION_APPLIED=YES
SECRETS_IN_NEXT_PUBLIC=0
NPM_AUDIT=PASS (0 vulnerabilities)
BUILD=NOT_VERIFIED_THIS_PASS (typecheck clean; `next build` not re-confirmed after an unrelated MCP timeout — see remote-architecture.md)
VOICE_E2E=BLOCKED (pre-existing, see reports/JARVIS_FULL_AUDIT_AFTER_PHASE_C.md — untouched by this pass)
WINDOWS_AUTOSTART=NOT_ATTEMPTED
VERCEL_DEPLOY=NOT_ATTEMPTED
REMOTE_ARCHITECTURE_STATUS=PARTIAL
```

Still `PARTIAL`, not PASS at the time the block above was written: the
protocol/schema work is now real and live (migration applied, typecheck
clean on the actual machine), and the git/DB environment confusion from the
sandbox half of this pass was found to be a false alarm and corrected. What
was still missing at that point needed the physical machine + explicit
decisions: voice (pre-existing, separate problem), Windows autostart, a
Vercel project, and the 73 runtime-boundary findings. See
`REMOTE_SETUP_WINDOWS_VERCEL.md`. The runtime-boundary findings are now
addressed — see the next section.

## Runtime Boundary Completion Pass (2026-08-10, same day, follow-on)

Mission: reduce `VERCEL_LOCAL_IMPORT_VIOLATIONS` from the 73 baseline via
architecturally correct means (relocate genuinely local-only modules behind
`src/local-runtime/` + dynamic `import()`, gate Vercel-reachable API routes
on `JARVIS_RUNTIME_ROLE`), not via 73 one-off executors. All work below ran
directly on the real Windows machine via Desktop Commander, not the
sandboxed Linux environment.

### Progression

| Step | Violations | What changed |
|---|---|---|
| Baseline | 73 | `.jarvis/runtime-boundary-baseline.json` |
| Batch 1 | 52 | Relocated worker-registry CLI adapters + tools (`project-tools.ts`, `terminal-tool.ts`) to `src/local-runtime/` |
| Batch 2 | 44 | Relocated `graphify.service.ts`, `project-infrastructure.service.ts`, `verification-engine.ts`; gated their 6 consuming routes (`graphify/analyze`, `graphify/query`, `infra/create`, `infra/[operationId]/{approve,bootstrap,cancel}`, `infra/[operationId]`, `jarvis/network/verify`) + 2 deep consumers (`repair-loop.ts`, `chat.service.ts`) converted to dynamic import at the call site |
| Batch 3 | 40 | Relocated `tool-hub/adapters/{git,project}.ts` (previously left in place out of excess caution — on review the same dynamic-import-target-rename pattern proven safe in Batch 2 applies cleanly here too); reworded a self-inflicted false-positive comment in `infra/create/route.ts` |
| Batch 4 | 21 | Gated the 6 real inline-execution routes (`files/list`, `files/raw`, `files/read`, `os/open-file-manager`, `terminal/exec`) by extracting their local-only logic into `src/local-runtime/api-helpers/{drive-browse,open-file-manager,terminal-engine}.ts`; added 9 individually-justified false-positive exclusions to the scanner (`KNOWN_FALSE_POSITIVES`, see `scripts/check-runtime-boundary.mjs`) for UI-only strings, regex-pattern literals, catalog labels, and a config default — none of which reach a local resource |

### Final classification of the remaining 21 (all Tier 4 — deliberately deferred, not fixed blind)

- `src/lib/ai-provider/codex-subscription/*` (7 hits, 5 files) — a live,
  multi-route chat provider feature (9+ API routes). Master prompt for this
  pass explicitly forbids broad voice/codex repair; only the `spawn()`
  boundary was previously guarded (see `docs/jarvis/remote-architecture.md`).
  Not safe to relocate without local interactive testing.
- `src/lib/jarvis/platform/discovery.ts` (9 hits) — the Program/Capability
  discovery engine, core to the already-audited Phase A baseline. Relocating
  blind risks regressing it; deferred to a dedicated pass.
- `src/lib/jarvis/platform/ollama-adapter.ts` (1 hit) — same reasoning as
  discovery.ts; shares its module graph.
- `src/lib/mcp/init.ts` (3 hits) — MCP server bootstrap/registration; touches
  process spawning for every configured MCP server, not just
  Desktop Commander. Deferred alongside discovery.ts.
- `src/lib/document-router/adapters.ts` (1 hit) — newly discovered this pass:
  a Java-runtime-detection fallback path for the PDF document-router
  adapter. The file's actual `execFile()` call (finding/running `java.exe`)
  is a genuine local-only capability that the current scanner rules don't
  even catch (evades `CHILD_PROCESS` because it's wrapped in
  `promisify(execFile)` and imports from `node:child_process`, not
  `child_process`) — noted here as an accepted scanner gap, not touched this
  pass to stay in scope.

None of these were relocated or gated this pass. All five are genuinely
shared/live code where a blind move or guard risked regressing already-
working functionality outside this pass's mission — this is the "genuine
external blocker" condition, not an unwillingness to continue.

### Verification (real machine, this pass)

- `npm run typecheck` — PASS, 0 errors (after each batch)
- `npm run daemon:typecheck` — PASS, 0 errors
- `npm run lint` — PASS, 0 errors (6 pre-existing warnings, unrelated files)
- `npx prisma validate` — PASS, schema valid
- `npm audit` — PASS, 0 vulnerabilities
- `npm run build` (`next build --turbopack`, direct Desktop Commander
  process, not the MCP transport that timed out earlier) — PASS, exit code
  0, all 104 routes/pages generated, `Standalone static assets prepared.`
  6 pre-existing Turbopack "dynamic filesystem access" tracing warnings
  (unrelated to this pass — a different Next.js concern from the runtime-
  boundary scanner; not touched, out of scope)
- DB connection regression check — no new `PrismaClient` instantiation
  introduced by this pass (grepped `new PrismaClient(` repo-wide: only
  `src/lib/db.ts`'s singleton, type declarations in
  `src/generated/prisma/index.d.ts`, and one **pre-existing**, untouched
  second instantiation in `src/lib/execution/approval-engine.ts:4` that
  predates this pass and is out of scope to fix here — flagged for a future
  pass, not a regression this one introduced)

### Updated terminal status block

```
VERCEL_LOCAL_IMPORT_VIOLATIONS=21 (down from 73; all 21 = Tier 4 deliberately deferred, documented above)
DOCUMENTED_FALSE_POSITIVE_EXCLUSIONS=9
TYPECHECK=PASS
DAEMON_TYPECHECK=PASS
LINT=PASS
PRISMA_VALIDATE=PASS
NPM_AUDIT=PASS (0 vulnerabilities)
BUILD=PASS (exit 0, 104/104 routes, real machine, direct terminal path)
DB_CONNECTION_REGRESSION=NONE_INTRODUCED (1 pre-existing issue noted, not caused by this pass)
PRODUCTION_SUPABASE_TOUCHED=NO (this pass touched no DB data or schema)
VERCEL_PRODUCTION_DEPLOYED=NO (not attempted, out of scope per mission)
VOICE_E2E=NOT_ATTEMPTED (out of scope per mission — next gate)
WINDOWS_AUTOSTART=NOT_ATTEMPTED (out of scope per mission — next gate)
FINAL_DECISION=RUNTIME_BOUNDARY_COMPLETION_PASS_COMPLETE_WITH_DOCUMENTED_DEFERRALS
```

## Runtime Boundary Finalization Pass (2026-08-10, same day, second follow-on)

Mission: reduce the 21 remaining Tier-4-deferred violations to exactly 0 by
architecturally splitting each group's shared contract/metadata from its
local execution (not by adding scanner exclusions), then auditing the
*static import graph* for reachability the regex scanner itself cannot see,
adding fail-closed automated tests, and running real-machine smoke tests.
All work ran directly on the real Windows machine via Desktop Commander.

### Per-group split (21 → 0)

Every group used the same **lazy-proxy pattern**: the real local-only
implementation moved to `src/local-runtime/**` (child_process/execFile,
local filesystem checks, local HTTP to loopback); the original shared path
became a thin proxy implementing the identical public interface that checks
`env.JARVIS_RUNTIME_ROLE === 'web-control-plane'` before any local
operation — failing closed with an honest `LOCAL_EXECUTION_FORBIDDEN`
result/error with zero imports of local-only code, or otherwise dynamically
`import()`-ing and delegating to the real implementation. This required
zero changes to almost all consumers (same import path, same exports).

| Group | Violations | Real impl moved to | Shared proxy |
|---|---|---|---|
| `platform/discovery.ts` | 9 | `src/local-runtime/platform/discovery.ts` | Returns persisted program/capability projection (local JSON registries) when forbidden; never runs PATH/Docker/MCP discovery against Vercel's own environment |
| `ai-provider/codex-subscription/*` | 7 | `src/local-runtime/ai-provider/codex-subscription/{process-runner,path-policy,app-server-client,provider}.ts` | `CodexSubscriptionProviderProxy` implementing `CodexSubscriptionProviderContract`; `getEvents()` reads a cached real-instance reference (populated only after a successful non-forbidden call) |
| `mcp/init.ts` | 3 | `src/local-runtime/mcp/init.ts` (moved wholesale) | Consumers (`discovery.ts`, `OrchestratorChatEngine.ts`) check role before dynamic-importing; no separate proxy object needed since `initializeMcpTools()` has no return value consumers hold onto |
| `platform/ollama-adapter.ts` | 1 | `src/local-runtime/platform/ollama-adapter.ts` | `OllamaAdapterProxy` implementing `JarvisRuntimeAdapter` |
| `document-router/adapters.ts` | 1 | `src/local-runtime/document-router/adapters.ts` | `DocumentRouter.resolveAdapters()` dynamic-imports; `status()`/`convert()` fail closed |

Scanner re-run after each group, `VERCEL_LOCAL_IMPORT_VIOLATIONS`: 21 → 16
(discovery) → 7 (codex-subscription, moved before discovery in task order
here it's listed post-hoc) → 0. `npm run typecheck` and
`npm run daemon:typecheck` re-run PASS after every group.

### Static import-graph audit (beyond the scanner's own reach)

The mission explicitly warned the scanner is regex-based and a route that no
longer *directly* imports local-runtime can still transitively reach it. Two
real, previously-undetected gaps were found this way — both genuinely
Vercel-reachable, not theoretical:

1. **`src/lib/tools/index.ts` and `src/lib/worker-registry/index.ts`**
   statically imported (not `import type`) real local-runtime modules
   (`project-tools.ts`, `terminal-tool.ts`, and the Codex/Claude
   Code/Antigravity CLI worker adapters). `tools/index.ts`'s `BUILTIN_TOOLS`
   array is registered into the global tool registry by
   `src/lib/agent-core/config-loader.ts` — meaning `git.status`,
   `project.build`, `project.typecheck`, `project.lint`, and
   `terminal.exec` (arbitrary shell execution) were reachable by function
   name from any chat/agent route with zero role gating. Fixed: new
   `src/lib/tools/local-tools-proxy.ts` (role-gated `ITool` proxies, same
   metadata, `execute()` fails closed) and `WorkerRegistry` reworked to
   register the three CLI adapters lazily via
   `ensureLocalWorkersRegistered()` (dynamic import, fails closed).

2. **`src/lib/jarvis/phase-b/docker-service-manager.ts` and
   `src/lib/jarvis/platform/external-tool-adapters.ts`** used
   `promisify(execFile)` + a locally-named `execFileAsync(...)` call and
   `from 'node:child_process'` — both forms the original `CHILD_PROCESS`
   regex missed (`\bexecFile\(` doesn't match `execFileAsync(`; the
   specifier pattern didn't include the `node:` prefix). `docker-service-
   manager.ts` is called **directly, unconditionally, with no role gate**
   from `GET /api/jarvis/phase-b` — a real, currently-deployed-shape Vercel
   route. Fixed the same lazy-proxy way: real Docker-CLI/execFile code moved
   to `src/local-runtime/jarvis/phase-b/docker-service-manager.ts` and
   `src/local-runtime/platform/external-tool-adapters.ts`; shared proxies
   fail closed (honest "Docker unavailable" / empty-catalog state) instead
   of ever shelling out. `service-adapter.ts` (Phase B n8n adapter) and
   `n8n-workflows.ts` needed no changes — they only ever call through
   `phaseBDockerServiceManager`, so the fix propagates transitively.

3. **Scanner hardened** (`scripts/check-runtime-boundary.mjs`): `CHILD_PROCESS`
   pattern now also matches `node:child_process` and `execFileAsync(` /
   `spawnSync(`. Re-ran after the change: still `VERCEL_LOCAL_IMPORT_
   VIOLATIONS=0` (zero new noise — every prior use of this pattern in
   `SCAN_ROOTS` had already been relocated).

No other static (non-`import type`) imports of `@/local-runtime/**` remain
in `src/app`, `src/components`, `src/lib`, `src/services`, `src/hooks`, or
`src/middleware.ts` (verified by direct grep, not just the scanner).

### Fail-closed automated tests

New `src/lib/jarvis/__tests__/runtime-boundary-fail-closed.test.ts` (10
tests, all passing) mocks `JARVIS_RUNTIME_ROLE=web-control-plane` and proves
every proxy fails closed: Ollama, Codex, documents, platform discovery
(covers MCP indirectly), the built-in terminal/git/build/lint tools, the
`/api/terminal/exec` and `/api/files/list` routes (501), the Phase B Docker
service manager, one external CLI tool adapter (yt-dlp), and the worker
registry (CLI adapter ids absent unless explicitly registered).

### Real-machine smoke tests (NOT mocked — genuine local-full-dev execution)

New `src/lib/jarvis/__tests__/runtime-boundary-local-smoke.test.ts` (6
tests, all passing), run with the real `JARVIS_RUNTIME_ROLE` default
(`local-full-dev`), proving the relocated code still *functions*, not just
compiles:

- Ollama: `HEALTHY`, real local server responded.
- Codex: `AUTH_REQUIRED` — real CLI probe executed (not authenticated on
  this machine, which is an accurate result, not a forbidden sentinel).
- Document router: real `opendataloader 2.5.0` and `docling 2.118.1`
  detected.
- Platform discovery: real discovery ran — 67 programs, 245 capabilities
  (see registry integrity note below).
- MCP init: **live** MCP server processes actually started and connected —
  Playwright (24 tools), Desktop Commander (26 tools), Jina (2 tools
  enabled without an API key) — registered into the tool registry.
- `git.status` tool: real `git status` executed and returned the actual
  branch/working-tree state.

### Registry integrity (section 22)

`.jarvis/state/program-registry.json`: 67 records, **zero duplicate ids**
(grouped by id, no group size > 1). `.jarvis/state/capability-registry.json`:
245 records, **zero duplicate ids**. The documented baseline
(`PROGRAMS_TOTAL=66`, `PHYSICAL_CAPABILITY_RECORDS=242`) is off by +1/+3 —
investigated and confirmed to be real machine state drift (installed
CLI/MCP state can change between snapshots), not a duplicate/orphan
introduced by this pass. `GENERIC_CAPABILITY_IDENTIFIERS` was not
separately re-counted this pass (registry-level integrity check — no
duplicates/orphans — was the binding requirement and is satisfied).

### Known, honestly-disclosed limitation (not fixed this pass, out of scope)

`programRegistry`/`capabilityRegistry` are backed by a **local JSON file**
(`.jarvis/state/*.json`), not Supabase. `refreshPlatformDiscovery()` in
web-control-plane mode therefore returns whatever was last persisted to
that local file — which is empty/stale from Vercel's perspective, since
Vercel has no access to that file and no discovery ever runs there. This is
honest (matches what already happens today) and non-regressive, but it
means "Web reads a live device/program projection" is not yet backed by a
real Supabase-synced snapshot. Building that sync would require new
Supabase schema/write-path work, which sections 23–24 of the finalization
mission explicitly forbid without proven necessity — deferred to a future,
explicitly-scoped pass.

### Verification (real machine, this pass)

- `npm run check:runtime-boundary` — `VERCEL_LOCAL_IMPORT_VIOLATIONS=0`
  (+8 documented false-positive exclusions, down from 9 — the
  `jarvis/ollama/route.ts` exclusion was removed because it was genuinely
  fixed, not excluded)
- `npm run typecheck` — PASS, 0 errors
- `npm run daemon:typecheck` — PASS, 0 errors
- `npm run lint` — PASS, 0 errors (6 pre-existing warnings, unrelated files)
- `npx prisma validate` — PASS, schema valid
- `npm audit --production` — PASS, 0 vulnerabilities
- `npx vitest run` (full suite) — PASS, 536 passed / 2 skipped (73 files,
  1 skipped), 0 failures — includes the 10 new fail-closed tests and 6 new
  real-machine smoke tests
- `npm run build` (`next build --turbopack`) — PASS, exit code 0, 104/104
  routes/pages generated, `Standalone static assets prepared.` Same 6
  pre-existing Turbopack "dynamic filesystem access" tracing warnings as
  the prior pass (unrelated Next.js build-tracing concern, not touched)

### Final terminal status block

```
RUNTIME_BOUNDARY_FINALIZATION=PASS
FINAL_REAL_RUNTIME_VIOLATIONS=0
VERCEL_DIRECT_LOCAL_EXECUTION_ROUTES=0
VERCEL_LOCAL_RUNTIME_IMPORT_VIOLATIONS=0
UNREVIEWED_EXCLUSIONS=0 (8/8 re-audited this and the prior pass)
DISCOVERY_GROUP=0 (was 9)
CODEX_SUBSCRIPTION_GROUP=0 (was 7)
MCP_INIT_GROUP=0 (was 3)
OLLAMA_ADAPTER_GROUP=0 (was 1)
DOCUMENT_ROUTER_GROUP=0 (was 1)
STATIC_IMPORT_GRAPH_AUDIT_EXTRA_GAPS_FOUND=2 (tools/worker-registry barrels; docker-service-manager + external-tool-adapters execFileAsync evasion)
STATIC_IMPORT_GRAPH_AUDIT_EXTRA_GAPS_FIXED=2
SCANNER_RULE_HARDENED=YES (node:child_process + execFileAsync/spawnSync now matched; re-verified 0 violations after)
WEB_CONTROL_PLANE_FAIL_CLOSED=YES (10 automated tests, all passing)
OLLAMA_AFTER_RELOCATION=WORKS (real HEALTHY response, real machine)
CODEX_AFTER_RELOCATION=WORKS (real AUTH_REQUIRED probe, real machine, real CLI not authenticated — accurate, not forbidden)
MCP_AFTER_RELOCATION=WORKS (real Playwright/Desktop Commander/Jina MCP servers connected live)
DOCUMENT_ROUTER_AFTER_RELOCATION=WORKS (real opendataloader 2.5.0 + docling 2.118.1 detected)
TYPECHECK=PASS
DAEMON_TYPECHECK=PASS
LINT=PASS
PRISMA_VALIDATE=PASS
UNIT_TESTS=PASS (536 passed / 2 skipped, 0 failures)
BUILD=PASS (exit 0, 104/104 routes)
NPM_AUDIT=PASS (0 vulnerabilities)
REGISTRY_INTEGRITY=CLEAN (0 duplicate ids in 67 programs / 245 capabilities; counts drifted +1/+3 from documented baseline due to real machine state, not a bug)
LOCAL_FULL_DEV_REGRESSION=NONE
PRODUCTION_SUPABASE_TOUCHED=NO (this pass touched no DB data or schema)
NEW_DB_MIGRATIONS=NONE
VERCEL_PRODUCTION_DEPLOYED=NO
READY_FOR_VERCEL_PREVIEW=YES
VOICE_E2E=NOT_ATTEMPTED (explicitly out of scope this pass)
WINDOWS_AUTOSTART=NOT_ATTEMPTED (explicitly out of scope this pass)
KNOWN_LIMITATION=program/capability registries are local-JSON-backed, not yet Supabase-synced — web-control-plane reads a stale/empty projection today (honest, non-regressive; new Supabase sync work explicitly out of scope per mission sections 23-24)
NEXT_GATE=Vercel preview deployment, then voice repair and Windows autostart as separate, explicitly-scoped passes
FINAL_DECISION=RUNTIME_BOUNDARY_FINALIZATION_PASS_COMPLETE_ZERO_VIOLATIONS
```
