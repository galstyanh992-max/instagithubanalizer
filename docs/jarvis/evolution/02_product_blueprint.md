# Product Blueprint — Production v1

JARVIS turns a user idea into an evidence-backed local project plan and, after explicit approval, an optional provider-backed implementation workflow. Primary users are an owner/operator and technical reviewers.

## Production v1

- Safe D-drive local project bootstrap with deterministic plan, idempotency, progress, cancel/resume/retry and evidence.
- Optional GitHub, Vercel and Supabase operations are plans by default and require per-operation approval.
- A single Agent Network coordinates product, architecture, frontend, backend, database, AI, security, QA, browser, DevOps, independent audit and release gate.
- Chat accepts validated attachments only when the selected model advertises support.
- Glass responsive UI, real audio analysis, local video and safe YouTube embedding.
- JSONL catalog ingestion classifies and quarantines before any install.

## Scope boundaries

| Must have | Later | Not now |
|---|---|---|
| Local dry-run/bootstrap, approval gates, evidence, safe uploads, catalog quarantine | Automatic adaptation after audit, remote provider execution | Unapproved resource creation, blind installs, production deployment |

## Non-functional requirements

- No horizontal overflow from 320px upward; keyboard and reduced-motion support.
- No secret values in API responses, logs, artifacts or reports.
- Every mutable operation has ownership, idempotency, audit event and normalized error.
- External and destructive actions require explicit approval; failed steps retain compensation metadata.

## Release criteria

Production requires passing typecheck, applicable tests, build, browser/security evidence, persistence/resume proof, no open P0/P1, and rollback readiness.
