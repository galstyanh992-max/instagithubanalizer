# Remote setup: Windows daemon + Vercel frontend

These steps must run on your actual Windows PC / Vercel & Supabase accounts —
none of them can be executed from an automated sandbox. This is the exact
list of manual actions left after the code-level work in
`docs/jarvis/remote-architecture.md`.

## 1. Apply the new migration and regenerate the Prisma client — DONE

Already run on this machine for this pass: `npx prisma migrate deploy`
applied `20260810000000_remote_control_plane_protocol` (plus one older
pending migration) to the live Supabase DB, `npx prisma generate` succeeded,
and `npm run typecheck` / `npm run daemon:typecheck` are both clean (0
errors). No action needed here unless you're setting up a *different*
machine, in which case run the same three commands there.

## 2. Verify the daemon still works locally (regression check)

```powershell
npm run daemon:typecheck
npm run daemon:test
npm run daemon:dev
```

Confirm in the app's dashboard topbar that the badge now reads a real
`ONLINE`/`OFFLINE` for your device name (backed by `/api/devices/status`),
not a static badge.

## 3. Run the runtime-boundary scan

```powershell
npm run check:runtime-boundary
```

This reports (not fixes) source files that would ship in a Vercel build but
reach local-only resources directly. As of this pass: 73 violations across
20 files. Deciding which of those to migrate behind `JARVIS_RUNTIME_ROLE`
guards before a real Vercel deploy is a separate, larger piece of work — see
`docs/jarvis/remote-architecture.md` for the list.

## 4. Windows autostart (not configured by this pass)

Not attempted here — needs to be set up and tested on the real machine.
Suggested approach given the existing scripts:

```powershell
schtasks /Create /TN "JARVIS Daemon" /TR "node D:\АГЕНТ\ДЖАРВИС\node_modules\.bin\tsx D:\АГЕНТ\ДЖАРВИС\src\daemon\index.ts" /SC ONLOGON /RL LIMITED
```

Run without elevated/administrator privileges (`/RL LIMITED`) — the daemon
does not need admin rights. Verify logs land somewhere rotated (the daemon
currently just uses `console.log`; redirect stdout/stderr to a file via the
scheduled task action if you want persistence across reboots) and that a
crash doesn't create a restart storm (Task Scheduler's own retry policy is
sufficient for a first pass; do not add a second competing supervisor).

Then the required E2E, per the master spec's own acceptance criterion:
stop the daemon → Dashboard shows the device OFFLINE (not a stale ONLINE) →
start it again → device flips back to ONLINE → a task queued while it was
offline executes exactly once, not zero or twice.

## 5. Vercel project

Not created/deployed by this pass — no live Vercel project was confirmed
connected. When you're ready:

```
JARVIS_RUNTIME_ROLE=web-control-plane
NEXT_PUBLIC_SUPABASE_URL=<your Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
DATABASE_URL=<Supabase pooled connection string>
DIRECT_URL=<Supabase direct connection string>
SUPABASE_SERVICE_ROLE_KEY=<service role — server env only, never NEXT_PUBLIC_>
JARVIS_OWNER_ID=<your Supabase auth user id>
```

Do **not** set `JARVIS_DAEMON_TOKEN`, `JARVIS_WORKSPACES_ROOT`, or any other
`JARVIS_DAEMON_*`/local-path variable on Vercel — those belong only on the
Windows machine's `.env`/`.env.local`.

Before the first real deploy, run the runtime-boundary scan again and treat
a non-zero count as a known-risk list to review, not a blocker by itself —
some of the 73 are behind conditional `process.platform === 'win32'` checks
and fail closed on Vercel's Linux runtime rather than doing anything unsafe;
others (the Ollama/Desktop Commander/CLI-adapter routes) will actually error
if invoked from Vercel and should be gated or removed from the deployed
build first.

## 6. Live E2E (do this after 1–5, on the real machine + a second device)

1. Open the Vercel URL from a second laptop/browser, sign in.
2. Confirm the topbar shows your device name as `ONLINE`.
3. Stop the daemon on the Windows PC — confirm the badge flips to `OFFLINE`
   within ~90 seconds (not instantly, not stuck on ONLINE).
4. Start the daemon again — confirm it flips back to `ONLINE`.
5. Voice: this is a separate, already-diagnosed problem (see
   `reports/JARVIS_FULL_AUDIT_AFTER_PHASE_C.md`) — not expected to work
   until that pipeline itself is fixed, independent of this migration.

Report results honestly — a badge that never leaves ONLINE, or a task that
silently vanishes instead of executing after reconnect, means step 1–4 above
needs debugging before claiming this done.
