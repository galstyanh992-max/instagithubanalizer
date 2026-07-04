# Live DB / Supabase Configuration

Provider: PostgreSQL (Supabase). No live migration/deploy performed in this phase.

## Env vars
`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (placeholders in `.env.example`, never real values in repo).

## Checks without secrets
`npm run smoke:db-config` — schema validity, placeholder sanity, booleans only (no live DB).

## Checks requiring local env
`npm run smoke:db-live-readiness` — NOT RUN if `DATABASE_URL` unset (non-blocking PASS); if set, runs read-only `SELECT 1` only, never prints the URL.

## Persistence probe (`src/lib/db-config/persistence-probe.ts`)
Dry-run by default. Live write only if `DATABASE_URL` configured AND `JARVIS_DB_PERSISTENCE_PROBE_WRITE=true`. Writes exactly one marked test Project Brain entry, reads it back, deletes it. Never touches user data, never runs migrations.

## Approval persistence
Added nullable columns to `ApprovalRequest` (`actorId`, `actorRole`, `actorSource`, `commandText`, `intent`, `reason`) — additive, non-breaking. Local migration file created (`prisma/migrations/20260706000000_approval_actor_columns/`) but **not deployed** (no live DB).

## Supabase RLS / anon key checklist
- [ ] Rotate previously-exposed anon key OR confirm RLS makes it safe as-is (user decision, R-01).
- [ ] Verify RLS policies restrict anon role on: MemoryRecord/Project Brain, ApprovalRequest, Setting/User, Agent/Task.
- [ ] Service role key must never be exposed client-side / committed.
- [ ] Only placeholders in `.env.example`.
- RLS status is **not verified here** — do not treat as secure until confirmed.

## Git history secret cleanup checklist
- [ ] Confirm current tree is clean (done — see Phase 3/Prompt 2).
- [ ] History still contains the removed key-shaped file in commit `758f5e2` (R-04).
- [ ] Before public push: `git filter-repo` or BFG to purge the blob.
- [ ] Rotate the key regardless of history purge.
- [ ] Force-push only with explicit user approval.
- [ ] Re-scan with a secret scanner after cleanup.
- History rewrite is **not performed automatically** in this phase.

## NOT IMPLEMENTED
Live deploy, destructive migration (`migrate reset`, `db push --force-reset`), production RLS verification, automatic git history rewrite.
