# Staging Migration Audit

## Scope and verdict

**Status: BLOCKED**  
**Reason: DATABASE_TARGET_NOT_PROVEN**

This is a read-only audit. No migration, database write, deployment, or external-resource action was performed. The earlier handoff listed five migrations; the current migration status and repository instead show six unapplied folders. The additional `20260723030000_codex_subscription_provider` migration is untracked and was not part of the prior five-migration handoff.

No `supabase/config.toml` or non-secret environment metadata establishes the configured target as disposable or staging. The target is therefore not approved for migration execution.

## Pending migration inventory

| Order | Migration | Purpose | Tables / columns | Data-loss risk | Lock risk | Rollback / recreate | Required by |
|---:|---|---|---|---|---|---|---|
| 1 | `20260706000000_approval_actor_columns` | Approval actor/audit context | Six nullable columns on `approval_requests`: actor identity/source, command, intent, reason | None; additive | Short `ALTER TABLE` lock | Columns are additive; normal retry via Prisma history; otherwise restore/recreate staging | Approval audit context |
| 2 | `20260721000000_jarvis_agent_network` | Orchestration persistence | Runs, tasks, executions, artifacts, findings, verification results, decisions, checkpoints; FKs and lookup indexes | None; creates new tables | Low for new tables/indexes | Recreate disposable staging; no down migration | Orchestration and checkpoint persistence; prerequisite for #5 |
| 3 | `20260723000000_infrastructure_operations` | Plan-first operation ledger | Operation and step tables, FK, unique idempotency key, indexes | None; additive | Low | Recreate disposable staging; no down migration | Infrastructure operations |
| 4 | `20260723010000_chat_attachments` | Chat attachment persistence | `chat_attachments`, owner/hash unique key, owner/status index | None; additive | Low | Recreate disposable staging; no down migration | Upload, duplicate, delete, and send flow |
| 5 | `20260723020000_orchestration_resume_guards` | Verified checkpoints and resume lease | Run version/lease fields; checkpoint verified/schema-version fields; lease-expiry index | None; additive with defaults/nulls | Short table lock; index is non-concurrent | Recreate disposable staging; no down migration | Resume and lease protection; requires #2 |
| 6 | `20260723030000_codex_subscription_provider` | Provider-session persistence | `codex_provider_sessions`, nullable unique thread id, provider/status indexes | None; additive | Low | Recreate disposable staging; no down migration | Codex subscription provider state; outside previous handoff |

## Migration safety review

- No `DROP`, `TRUNCATE`, destructive column conversion, or nullable-to-required transition without a backfill was found.
- The required lookup indexes are included for the declared tables. The resume claim predicate may require a composite index only after staging workload evidence; the migration supplies an expiry index.
- Dependency order is chronological. `20260721000000_jarvis_agent_network` must precede `20260723020000_orchestration_resume_guards`.
- Ordinary repeated deployment is safe through Prisma migration history. The raw SQL is not universally idempotent: only the approval-column migration uses `IF NOT EXISTS`; direct re-execution of the remaining SQL is unsafe.
- Current application paths require the new orchestration, attachment, checkpoint, lease, and provider objects. They are not compatible with the old schema during rollout; migrations must finish before DB-backed runtime verification.
- `ON DELETE CASCADE` clauses in the new orchestration/infrastructure tables do not delete existing data during migration, but are future delete semantics and must be understood before use.

## Ownership, RLS, and exposure review

No pending migration enables RLS or creates policies, grants, or revokes. The target Data API exposure and RLS state are unverified.

- `chat_attachments` has `ownerId` but no workspace field, foreign key, or database policy; its migration index does not prove cross-workspace isolation.
- Orchestration `workspaceId`/`userId` are nullable and have no foreign keys or RLS in this migration bundle.
- Infrastructure and provider-session persistence have no ownership/workspace boundary.

Consequently, unauthorized and cross-workspace attachment scenarios cannot be certified from this migration set. Do not grant public Data API access to these tables unless RLS and ownership policies have been designed and verified for the actual access model.

## Target and worktree evidence

- Target classification: **not proven**. No safe metadata identifies a disposable/staging project.
- Safe read-only migration status: the initial migration is applied; the six folders above are pending.
- Supabase configuration directory/config file: absent.
- Git worktree: materially dirty, including untracked migration folders and unrelated application changes. The migration bundle is not an immutable reviewed release artifact.
- A disposable staging environment can be recreated in principle, but no evidence establishes that the current target is such an environment.

## Required handoff

```text
STAGING_DATABASE: BLOCKED
DATABASE_BACKUP: BLOCKED
MIGRATION_APPROVAL: REQUIRED
```

No credentials or connection details are requested or recorded. Before any execution, provide the status-only gate values above with `STAGING_DATABASE: READY`, a verified backup/recreate posture, and `MIGRATION_APPROVAL: READY`; separately resolve whether migration #6 is in scope.
