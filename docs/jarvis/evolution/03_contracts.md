# Contracts

`CreateProjectRequest`: `{ name, localPath, dryRun, idempotencyKey, providers }`; `CreateProjectResult`: operation id, status, normalized path, steps, artifacts and findings.

`InfrastructureOperation` owns operation state, caller/workspace, requested providers, timestamps, event log, approval and compensation metadata. `InfrastructureOperationStep` has provider, status, safe message and evidence only.

Attachments carry sanitized filename, MIME, byte size, content hash and lifecycle `SELECTED → VALIDATING → UPLOADING → PROCESSING → READY|REJECTED|FAILED|CANCELLED`.

Provider and model profiles explicitly expose tool, streaming and attachment capabilities. Repository catalog entries use canonical remote identity and deduplication groups; unverified third-party code is quarantined.
