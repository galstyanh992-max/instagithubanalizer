# PHASE 03: JARVIS LOCAL DAEMON FOUNDATION REPORT

## 1. Overview
The JARVIS Local Daemon Foundation has been implemented as a secure, standalone Node.js process running on Windows 11. It connects to the Supabase Control Plane strictly through a Next.js Server Gateway, completely isolating the database from direct daemon access.

## 2. Architecture & Sandboxing
- **Location:** `src/daemon/` (with isolated `tsconfig.json`)
- **API Client:** Exclusive HTTPS communication via Gateway (`src/daemon/api/client.ts`).
- **Identity:** Device identity binds on startup and creates a stable UUID at `D:\JARVIS_TEMP\daemon-state\identity.json`.
- **Path Guard (Sandbox):** Filesystem operations are strictly guarded. The daemon blocks path traversal (`..\`), Windows UNC, and arbitrary drive letter access. All paths must resolve within 5 allowed roots (`WORKSPACES`, `ARTIFACTS`, `LOGS`, `TEMP`, and the Monorepo).
- **Concurrency:** Poller is restricted to a strictly atomic `SKIP LOCKED` equivalent single claim logic per loop via Prisma `where: { status: 'not_started' }`.

## 3. Server Gateway
The Gateway leverages the Next.js App Router API and Prisma.
All routes require:
- `Authorization: Bearer <TOKEN>` (Matches `JARVIS_DAEMON_TOKEN` in `.env.local`)
- `X-Installation-Id: <UUID>`
- Verification that the Device is not revoked.

Routes:
- `POST /api/daemon/register`
- `POST /api/daemon/heartbeat`
- `POST /api/daemon/tasks/claim`
- `POST /api/daemon/tasks/[id]/events`
- `POST /api/daemon/tasks/[id]/complete`
- `POST /api/daemon/tasks/[id]/fail`
- `POST /api/daemon/tasks/[id]/cancel`
- `POST /api/daemon/artifacts`

## 4. State Machine
A strict state machine guarantees the daemon cannot corrupt task statuses. Transitions allowed:
- `QUEUED` -> `CLAIMED`
- `CLAIMED` -> `RUNNING`
- `RUNNING` -> `SUCCEEDED` | `FAILED` | `CANCELLED`

## 5. Next Steps (Phase 04)
The next phase should focus on introducing real AI Worker flows inside the Daemon, connecting to OpenAI/Anthropic APIs to solve requested tasks dynamically.

## 6. Audit Sign-off
- [x] Daemon codebase separated from Next.js UI bundles.
- [x] Secrets injected securely to `.env.local` without committing.
- [x] Zero usage of local shells or un-sandboxed Node `child_process.exec` (Phase 3 is purely Mock Executors).
- [x] Unit Tests passing for PathGuard.
- [x] E2E Mock script written (`scripts/run-daemon-e2e.mjs`).

**STATUS: PHASE 03 COMPLETED AND VERIFIED.**
