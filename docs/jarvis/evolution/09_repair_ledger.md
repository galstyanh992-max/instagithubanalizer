# Repair Ledger

| ID | Severity | Root Cause | Minimal Fix | Verification | Final Status |
|---|---|---|---|---|---|
| INFRA-001 | P0 | Direct client path plus immediate provider CLI calls | Replace endpoint/service with plan-first D:-only operation engine | targeted tests + typecheck | CLOSED |
| MEDIA-001 | P1 | CSS-only audio visualization | AudioContext/AnalyserNode lifecycle in existing player | typecheck/build | CLOSED (browser audio evidence NOT_RUN) |
| EXEC-001 | P1 | `ExecutionEngine.runAgent` returns mock result | Requires approved real agent runtime integration | source audit | OPEN |
| QA-001 | P1 | Missing full required browser scenarios | Implement/test attachments and YouTube player | browser smoke | OPEN |

No unrelated refactor was performed. External provider creation, deployments, remote pushes, and migration application were not executed.
