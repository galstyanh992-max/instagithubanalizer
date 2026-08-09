# Persistence and Resume Report

## Result

Verdict: **BLOCKED_BY_ACCESS**

The implementation is present and statically verified, but restart/resume against the configured runtime database is not verified. `npx prisma migrate status` identified the active datasource as remote Supabase and reported these unapplied migrations:

- `20260706000000_approval_actor_columns`
- `20260721000000_jarvis_agent_network`
- `20260723000000_infrastructure_operations`
- `20260723010000_chat_attachments`
- `20260723020000_orchestration_resume_guards`

No migration was applied because this is not a proven disposable local development database.

## Implemented reliability controls

- Additive `OrchestrationRun.version`, `resumeLeaseOwner`, and `resumeLeaseUntil`.
- Additive `Checkpoint.verified` and `schemaVersion`.
- Latest checkpoint lookup filters to `verified=true` and `schemaVersion=1`.
- Atomic `updateMany` lease claim requires the expected version and an absent/expired lease.
- A second concurrent claimant receives `RESUME_CONFLICT`.
- `passed`/`skipped` tasks remain terminal; interrupted/failed/blocked tasks return to scheduling.
- Cancelled and completed runs are not resumable through the new endpoint.
- Artifacts/findings remain persisted records and are not recreated for already-passed tasks.
- Resume lease is released only by its owner.

## Evidence

| Check | Evidence | Result |
|---|---|---|
| Schema generation | `npx prisma generate` | PASS |
| Resume concurrency | `resume-service.test.ts` | PASS |
| No duplicate passed task | `checkpoint-service.test.ts` | PASS |
| Compatible checkpoint selection | Prisma query filters verified/version 1 | PASS (code) |
| Corrupt/missing checkpoint | no compatible checkpoint returns explicit failure | PASS (code) |
| Cancelled run | resumable allowlist excludes `CANCELLED` | PASS (code) |
| Real process restart | migration absent on configured remote DB | BLOCKED |
| Real artifact/finding preservation | migration absent | BLOCKED |
| Real approval-resume state | migration absent | BLOCKED |

The requested full create → partial execute → destroy instance → reload → resume integration test is therefore not claimed. The safe next test target is an authorized disposable database with all five pending migrations applied in order.
