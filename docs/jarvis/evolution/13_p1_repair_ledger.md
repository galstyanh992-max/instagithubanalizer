# P1 Repair Ledger

| ID | Finding | Root cause | Minimal repair | Targeted evidence | Status |
|---|---|---|---|---|---|
| EXEC-001 | Fabricated agent success | `ExecutionEngine` contained a sleep-based mock result | Explicit production/dry-run executors; canonical runtime invocation; schema validation; honest provider block | executor/orchestrator tests | CLOSED |
| UPLOAD-001 | No end-to-end chat attachments | no policy, API, record, or mounted UI | policy, Prisma model/migration, upload/delete API, visible dashboard UI, cancellation/removal/cleanup/capability gate | 6 policy tests; visible browser control; spoof 400 | BLOCKED_BY_ACCESS |
| UPLOAD-002 | Internal upload errors leaked local paths | raw Prisma error returned to client | allowlist safe validation errors; generic 500 for internal failures | unit test plus live `{"error":"Attachment upload failed"}` | CLOSED |
| YOUTUBE-001 | Unsafe/absent mini-player | no parser or mounted player | hostname allowlist, 11-char ID validation, privacy embed, no autoplay, responsive ratio | 11 unit tests and browser valid/invalid | CLOSED |
| PROVIDER-001 | Static provider success | status did not call adapter | real `isAvailable()`/optional model list, timeout, normalization, redaction, settings Test UI | 5 unit tests; browser CONNECTED 872 ms | CLOSED |
| RESUME-001 | No restart orchestration | no lease/version/verified checkpoint contract | additive schema, lease coordinator, resume endpoint, graph restore | concurrency and checkpoint tests | BLOCKED_BY_ACCESS |
| UI-001 | Attachment UI was orphaned | React console component was not mounted | add upload control and flow to visible static dashboard chat | browser DOM + 9 viewports | CLOSED |
| API-001 | `/jarvis` form returned 500 | form-urlencoded body parsed as JSON | content-type aware request parser | 2 parser tests; browser POST 200 | CLOSED |

No P0 was opened. The two access-blocked rows refer to the same missing remote database migrations and require one controlled migration/test action.
