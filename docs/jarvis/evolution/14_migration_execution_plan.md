# Staging Migration Execution Plan

## Gate

This plan is **not authorized to run**. It becomes executable only when all status-only conditions are satisfied:

```text
STAGING_DATABASE: READY
DATABASE_BACKUP: READY | NOT_NEEDED
MIGRATION_APPROVAL: READY
```

The target must be proven disposable/staging through safe metadata, distinct from production, and recreatable or backed up. Production is never a target for this plan.

## Preflight checklist

1. Reconfirm target identity using non-secret metadata; record only its classification.
2. Record the current schema/migration version without exposing connection information or user data.
3. Decide scope: the earlier handoff covered migrations 1–5, while the repository currently has a sixth, untracked provider-session migration. Do not silently include #6.
4. Inspect `git status` and the migration SQL hashes; use a pre-migration Git checkpoint because the working tree is currently dirty.
5. Confirm staging backup or recreate strategy and record a pre-migration checkpoint.
6. Run only supported dry-run/schema-diff commands discovered from the installed Prisma/Supabase CLI help. Do not use `db push` or `db reset`.

## Ordered execution and stop rules

Execute with the production-safe deployment command only after the gate passes, one migration at a time where the approved toolchain allows it. Preserve non-secret logs.

| Order | Migration | Post-apply verification | Continue only if |
|---:|---|---|---|
| 1 | `20260706000000_approval_actor_columns` | Six nullable columns exist | Schema check passes |
| 2 | `20260721000000_jarvis_agent_network` | Eight orchestration tables, required FKs, and run/checkpoint indexes exist | Schema/FK/index check passes |
| 3 | `20260723000000_infrastructure_operations` | Operation and step tables, unique idempotency key, FK, indexes exist | Schema/FK/index check passes |
| 4 | `20260723010000_chat_attachments` | Attachment table, owner/hash unique key, owner/status index exist | Schema/index check passes |
| 5 | `20260723020000_orchestration_resume_guards` | Lease and checkpoint columns plus expiry index exist | Schema/index check passes |
| 6 | `20260723030000_codex_subscription_provider` | Execute only under separate recorded scope approval; verify table, unique key, indexes | Scope and schema check pass |

After each migration record: migration identifier, exit code, required-object check, minimal schema audit, and **continue/stop** decision. On the first failure, stop immediately; do not run later migrations and do not perform destructive rollback. Preserve sanitized logs and recover by staging restore/recreation.

## Post-migration release prerequisites

Schema presence alone does not close release risks. Before upload/restart QA, verify on staging:

- RLS/Data API exposure and policies that match the real authentication and workspace model.
- Attachment authorization; current code’s hard-coded owner identity and public-storage behavior do not prove user/workspace isolation.
- Lease renewal or an execution-bound lease duration; the current 60-second lease can expire before a default 300-second orchestration completes.
- Durable malformed-checkpoint handling that records recoverable blocked/failed state.
- Actual UI/API upload scenarios and a real process restart/resume, including concurrent resume after a lease-expiry boundary.

## Current checkpoint

```text
JARVIS STAGING CLOSURE CHECKPOINT

Current Prompt: 1 — database target and migration audit
Current Migration/Finding: Six pending migrations; target not proven
Target Classification: Unknown / not proven staging or disposable
Completed: Read-only reports, source, migration, safe status, and Git audit
Changed Files: docs/jarvis/evolution/14_staging_migration_audit.md; docs/jarvis/evolution/14_migration_execution_plan.md
Commands: Safe migration-status inspection; repository/config/Git inspection
Exit Codes: Read-only inspection complete; no migration command executed
Database Evidence: Initial migration applied; six pending folders; no staging identity evidence
Browser Evidence: No new browser test; database-backed QA intentionally not run
Fixed: None
Open P0: None established in this audit
Open P1: Target/approval block; authorization/RLS gap; lease-expiry duplicate-work risk; malformed-checkpoint durability gap
Approval Required: STAGING_DATABASE READY, DATABASE_BACKUP READY|NOT_NEEDED, MIGRATION_APPROVAL READY; scope decision for migration #6
Blockers: DATABASE_TARGET_NOT_PROVEN; no migration approval; dirty migration scope
Next Safe Task: Obtain status-only staging gate and scope decision; then perform preflight without exposing secrets
```
