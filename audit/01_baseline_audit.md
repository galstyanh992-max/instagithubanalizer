# JARVIS baseline audit

Date: 2026-07-24
Scope: read-only repository and local-environment audit. No application code, dependencies, database data, migrations, Git history, or environment secrets were modified.

## Project map

| Area | Evidence |
| --- | --- |
| Runtime | Next.js 16 App Router, React 19, TypeScript, Tailwind 4; `next.config.ts` uses standalone output. |
| Package manager | npm: `package-lock.json` and `package.json` are present. `node_modules` is present. |
| Database | Prisma 6, PostgreSQL datasource (`DATABASE_URL`, `DIRECT_URL`) and a large schema in `prisma/schema.prisma`; migration directories exist. |
| Root UI | `src/app/page.tsx` renders a full-screen iframe for `/dashboard/index.html`; the primary visible dashboard is static assets under `public/dashboard`. |
| React routes | Route pages include agents, projects, repositories, memory, settings, voice, board, graphify, Jarvis, and APIs under `src/app/api`. |
| Dashboard shell | `public/dashboard/index.html`, `live.js`, `live.css`, `avatar3d.js`, bundled Three.js/GLTF assets. The legacy React header is `src/components/layout/topbar.tsx`. |
| Audio | Static dashboard player is `#mpAudio` in `public/dashboard/index.html` and controller logic in `public/dashboard/live.js`; reusable React player is `src/components/jarvis/media-player.tsx`. |
| Telegram audio | `/api/telegram/music/status`, `/tracks`, and `/audio` routes; the last proxies Telegram `getFile` and media bytes. |
| AI providers | Registry/router under `src/lib/ai-provider` and `src/services/ai-provider-router.service.ts`; Codex subscription implementation exists under `src/lib/ai-provider/codex-subscription`. |
| Agents/tasks | Config registry in `src/lib/agent-configs`, core registry in `src/lib/agent-core`, JARVIS registry in `src/lib/jarvis`, orchestration/decomposition in `src/lib/orchestrator`. `/api/tasks` drives the static dashboard task pane. |
| GitHub | Scoped client/config under `src/lib/github`; repository ingestion and analysis endpoints are under `src/app/api/repos`. |
| Integration/tool layer | `src/lib/tool-hub`, `src/lib/mcp*`, `src/lib/ecosystem`, `src/lib/api-hub`, and `src/lib/browser-operator`. |

## Validation baseline

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | Exit 0. |
| `npx prisma validate` | PASS | Exit 0; schema accepted. No schema data was read or changed. |
| `npm test` | FAIL | 47 test files passed and 319 tests passed, but `src/lib/youtube-oauth.test.ts` fails before collection because a `server-only` module is imported in the jsdom test environment. |
| `npm run lint` | FAIL | Exit 1, 55 errors and 12 warnings. Most errors are bundled static vendor code and old CommonJS utility scripts; actionable application errors are in `jarvis-unified-console.tsx` and `use-voice.ts`. |
| Production build | NOT_RUN | Deferred: build writes `.next` artifacts and lint/test blockers already prevent a clean release baseline. |
| Browser E2E | NOT_RUN | Existing Playwright screenshots exist, but no fresh run was performed during the read-only phase. |

## Confirmed findings

### B-01: Telegram audio proxy does not preserve HTTP byte ranges

- Severity: P1
- Evidence: `src/app/api/telegram/music/audio/route.ts` fetches Telegram without forwarding `Range`; its response exposes only `content-type` and `cache-control`. It omits `Accept-Ranges`, `Content-Range`, `Content-Length`, and upstream partial-response status.
- Affected files: `src/app/api/telegram/music/audio/route.ts`, `public/dashboard/live.js`, `public/dashboard/index.html`.
- Reproduction: select a Telegram track in the static dashboard player and seek. The native audio element has no server range contract from the proxy.
- Expected: the proxy must forward a validated client `Range` header, propagate 200/206 and relevant media headers, and stream the returned body without buffering.
- Minimal next step: implement a single range-preserving proxy test and the smallest corresponding route change; then test a real configured Telegram track.

### B-02: Production root UI is disconnected from much of the React UI

- Severity: P1
- Evidence: `src/app/page.tsx` is a fixed full-screen iframe to `/dashboard/index.html`; navigation and most feature modules are React pages/components. The dashboard controls are hand-maintained static HTML/JS.
- Affected files: `src/app/page.tsx`, `public/dashboard/index.html`, `public/dashboard/live.js`, React page routes and `src/components/layout/topbar.tsx`.
- Reproduction: load `/`; only the static dashboard is mounted. React page improvements are not automatically visible in that dashboard.
- Expected: one explicit integration boundary for static cockpit modules and React routes, with navigation/header ownership defined once.
- Minimal next step: select the static dashboard as the primary shell or migrate it incrementally to React; do not maintain two independent headers.

### B-03: User-facing dashboard telemetry includes presentation values not confirmed as live

- Severity: P1
- Evidence: `src/components/layout/topbar.tsx` renders fixed CPU/GPU/RAM/network strings. Existing screenshot `output/playwright/telegram-channel-connected.png` visibly presents numerical telemetry. `public/dashboard/live.js` does call `/api/os-metrics`, so the static dashboard has a separate live path.
- Affected files: `src/components/layout/topbar.tsx`, `public/dashboard/live.js`, `src/app/api/os-metrics/route.ts`.
- Reproduction: render the React TopBar; values do not derive from a request or state source.
- Expected: values must be live, explicitly labelled unavailable, or absent; production must not represent placeholders as real telemetry.
- Minimal next step: remove fixed values from the React header or bind it to the existing metric endpoint with an unavailable state.

### B-04: AI/repository fallback behavior generates production mock content

- Severity: P1
- Evidence: `README.md` explicitly describes fallback mock data; `src/services/ai-provider-router.service.ts` selects `mock`; `src/services/chat.service.ts` provides `generateMockReply`; `src/services/ai.service.ts` exposes heuristic mock analysis. `prisma/seed.ts` also creates repository analysis data.
- Affected files: `README.md`, `src/services/ai-provider-router.service.ts`, `src/services/chat.service.ts`, `src/services/ai.service.ts`, `prisma/seed.ts`.
- Reproduction: use an unconfigured provider path; router can return `isMock: true` and service fallbacks return generated, non-provider results.
- Expected: no synthetic result in production flows. A feature must return a clear `NOT_CONFIGURED`/`UNAVAILABLE` state unless a real provider or user-approved local model is configured.
- Minimal next step: trace each UI consumer of mock results and replace the production fallback with an explicit unavailable result; keep fixtures only in tests.

### B-05: Lint release gate is red for application code and vendor scope

- Severity: P1
- Evidence: `npm run lint` exits 1 with 55 errors. Actionable source errors include render-time ref access in `src/components/jarvis/jarvis-unified-console.tsx:270`, and declaration/order plus ref mutation compiler errors in `src/components/voice/use-voice.ts`.
- Affected files: `eslint.config.mjs`, `src/components/jarvis/jarvis-unified-console.tsx`, `src/components/voice/use-voice.ts`, `public/dashboard/vendor/*`, `scripts/*.js`.
- Reproduction: run `npm run lint`.
- Expected: first-party source and checked-in third-party bundles must have separate lint scopes; first-party lint must pass.
- Minimal next step: exclude immutable vendored browser assets and archived scripts from app lint, then repair each remaining first-party lint error one at a time.

### B-06: Test suite cannot reach a clean pass

- Severity: P1
- Evidence: `npm test` exits 1. 319 tests pass, but `src/lib/youtube-oauth.test.ts` fails with `This module cannot be imported from a Client Component module. It should only be used from a Server Component.` from `server-only`.
- Affected files: `src/lib/youtube-oauth.test.ts`, its module dependency graph, and `vitest.config.ts`.
- Reproduction: run `npm test`.
- Expected: server-only API code must be tested in a server-compatible environment or behind a testable interface.
- Minimal next step: isolate the OAuth logic from the `server-only` marker or configure this suite for a Node environment; verify the complete suite afterward.

### B-07: Static cockpit imposes significant startup/render cost

- Severity: P2
- Evidence: the dashboard ships `jarvis-new-girl-live.glb` (2.7 MB), `three.core.js` (1.4 MB), `three.module.js` (603 KB), GLTF loader (115 KB), and multiple high-resolution artwork assets. `avatar3d.js` schedules a continuous `requestAnimationFrame` loop.
- Affected files: `public/dashboard/index.html`, `public/dashboard/avatar3d.js`, `public/dashboard/vendor/*`, dashboard assets.
- Reproduction: load `/`; the root iframe initializes the static dashboard and its 3D asset path.
- Expected: 3D should be preference-gated, lazy-loaded, and have a 2D/reduced-motion fallback.
- Minimal next step: measure network and CPU with a fresh browser trace, then defer nonessential 3D imports/assets behind a user setting.

## Audio path trace

Telegram channel post -> `tracks/route.ts` discovers a `file_id` from `getUpdates` -> static player receives `/api/telegram/music/audio?fileId=...` -> `audio/route.ts` calls Telegram `getFile` -> proxies the file stream -> `<audio id="mpAudio">` in the dashboard -> native browser decode/playback.

Confirmed gaps: no MIME sniffing/allowlist at the proxy output, no byte range forwarding, no length/range headers, and real Telegram playback cannot be verified without configured credentials and a channel post. CORS is same-origin at the browser boundary; autoplay requires a user gesture and the dashboard starts audio from click handlers. CSP was not found in `next.config.ts`.

## Task provenance

Observed task creators: manual `/api/tasks` operations; orchestration/decomposition (`TaskDecompositionEngine`); agent-driven planning; legacy `UserTask`; and database seeds. GitHub issue listing is implemented as a scoped read operation in `src/lib/github/service.ts`; no confirmed code path importing issues, README items, or TODO scans into user tasks was found in this baseline. That user report remains UNKNOWN until a real database event or UI reproduction identifies the source.

## Screenshots and access gaps

- Available: existing images under `output/playwright`, including `telegram-channel-connected.png`, desktop and mobile cockpit captures, and local uploaded images.
- No screenshot supplied that identifies a specific runtime error. Therefore no screenshot-derived error is asserted.
- BLOCKED_REAL_TELEGRAM_PLAYBACK: no secret values were inspected and no authenticated media playback was attempted.
- BLOCKED_DATABASE_PROVENANCE: no production database records were read or changed.

## Security risks

- The Telegram proxy correctly keeps the bot token server-side and validates identifier/path syntax, but it needs response-header/range hardening.
- GitHub has an allowlist boundary in `src/lib/github/config.ts`; no push/upload operation was performed.
- The working tree has extensive pre-existing changes (71 tracked files in the diff plus untracked files). These are user-owned and must be preserved during repair.
- `.env` exists locally and was intentionally not opened. `.gitignore` excludes environment files.

## Performance baseline and PC compatibility inputs

Available local inputs: Windows 11 Pro x64; ~64 GB visible RAM; Node v24.18.0; Python command is unavailable. GPU/CPU/Docker enumeration did not return within the safe collection window and is UNKNOWN. The dashboard’s current 3D initial load is not yet measured with a browser trace. The machine is therefore suitable for core web work, but GPU-dependent modules must remain optional until compatibility is measured.

## Requirement-to-file matrix

| Requirement | Primary files |
| --- | --- |
| Player / Telegram audio | `public/dashboard/live.js`, `public/dashboard/index.html`, `src/app/api/telegram/music/*`, `src/components/jarvis/media-player.tsx` |
| Header/navigation | `src/app/page.tsx`, `public/dashboard/index.html`, `public/dashboard/live.js`, `src/components/layout/topbar.tsx` |
| GitHub boundary/workspaces | `src/lib/github/*`, `src/services/github.service.ts`, `src/app/api/repos/*` |
| Providers | `src/lib/ai-provider/*`, `src/services/ai-provider-router.service.ts`, settings components/routes |
| Agents/tasks | `src/lib/agent-*`, `src/lib/orchestrator/*`, `src/app/api/tasks/route.ts` |
| Mock removal | `src/services/ai.service.ts`, `src/services/chat.service.ts`, `src/services/ai-provider-router.service.ts`, `prisma/seed.ts` |
| Performance | `public/dashboard/*`, `src/app/page.tsx`, `next.config.ts` |

## Recommended next phase

Proceed to architecture only after accepting the following bounded scope: one primary dashboard shell, real/unavailable states instead of production mocks, range-correct Telegram streaming, clean first-party quality gates, and lazy/optional 3D. The first repair loop should address B-01 (Telegram range proxy) because it is a confirmed single fault with a narrow testable change.
