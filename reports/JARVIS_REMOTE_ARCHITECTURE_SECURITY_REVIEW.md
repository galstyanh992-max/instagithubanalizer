# JARVIS remote architecture — security review (code-scope pass)

Static review only — no live Vercel deployment or Supabase RLS re-audit was
possible from this sandbox (no DB connectivity). Findings below are from
reading the actual code, not assumptions.

## Secret exposure

- Every `NEXT_PUBLIC_*` variable in the codebase enumerated:
  `NEXT_PUBLIC_ENABLE_3D`, `NEXT_PUBLIC_ENABLE_VOICE`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_TELEGRAM_CHAT_ID`, `NEXT_PUBLIC_USER_HOME`. None are secrets.
  **SECRETS_IN_NEXT_PUBLIC=0**
- `SUPABASE_SERVICE_ROLE_KEY` is referenced only in `src/lib/env.ts` and
  `src/lib/supabase-server.ts`, neither a `"use client"` file — confirmed by
  grep, not inferred. It cannot reach the browser bundle through those
  files.
- The daemon token (`JARVIS_DAEMON_TOKEN`) is sent as a bearer header from
  `src/daemon/api/client.ts` and checked server-side in
  `src/app/api/daemon/auth.ts`. It is never read from a `NEXT_PUBLIC_*` var.

## Remote worker auth / zero trust

- `requireDaemonAuth` (`src/app/api/daemon/auth.ts`) requires both the
  shared bearer token and an `X-Installation-Id` header, and 500s cleanly if
  the server-side token env var is unset (fails closed, not open).
- Every task state transition (`src/app/api/daemon/tasks/helper.ts`)
  independently re-checks `task.agentId !== device.id` — a daemon cannot
  complete/fail/cancel a task claimed by a different device, even with a
  valid token.
- Device revocation (`device.revokedAt`) is checked on every daemon-facing
  route (register, heartbeat, claim, events, complete, fail, cancel).
- Frontend access is gated by real Supabase Auth plus an explicit
  single-owner check (`requireJarvisOwner`, `user.id !== ownerId → 403`) —
  not a stub, not `NextAuth` left in a default-allow state.

## New endpoints added this pass

- `GET /api/devices/status` — owner-authenticated only (`requireJarvisOwner`),
  read-only, no daemon token accepted. Returns device name/platform/status/
  last-heartbeat/running-task-count. No secrets, no raw file paths, no
  daemon token in the response.

## New static tool added this pass

- `scripts/check-runtime-boundary.mjs` (`npm run check:runtime-boundary`) —
  detects `child_process`, local Ollama URLs, Desktop Commander references,
  Docker socket references, PowerShell references, and Windows absolute
  paths inside code that would ship in a `next build` bundle
  (`src/app`, `src/components`, `src/lib`, `src/services`, `src/hooks`,
  `src/middleware.ts`; excludes `src/daemon`, `src/generated`, and test
  files). Current count: **73 violations across 20 files** — reported, not
  fixed, and not enforced as a CI gate yet (see
  `docs/jarvis/remote-architecture.md` for the full list and reasoning on
  why fixing all 73 blind was out of scope for this pass).

## What this review did NOT check (needs the real environment)

- RLS policy behavior against a live Postgres instance (no DB connectivity
  from this sandbox; `docs/jarvis/phase-b-security.md` and
  `reports/JARVIS_PHASE_C_SECURITY_REVIEW.md` cover the existing posture and
  were not re-verified here).
- CORS/CSP headers on an actual Vercel deployment (none exists yet).
- Whether any of the 73 runtime-boundary violations are actually reachable
  from an unauthenticated request if deployed to Vercel as-is — this needs
  a real deployment to test, not a static grep.
- `npm audit`: ran successfully in this sandbox — **0 vulnerabilities**. This
  is the one live check that didn't need external DB/host access.

## Verdict

No secret leaks found. No new attack surface introduced by this pass's
additions (`/api/devices/status` is read-only and owner-gated). The existing
daemon-auth and task-binding model is real zero-trust, not decorative. The
open risk is unchanged from before this pass: **if the current app were
deployed to Vercel today without addressing the 73 runtime-boundary
findings, several routes would either fail closed (harmless) or attempt to
reach local-only resources from Vercel's runtime (broken, not a security
hole by itself, but exactly what the spec's "don't run Ollama/Desktop
Commander/Docker from Vercel" rule is about).** That remediation is tracked,
not done.
