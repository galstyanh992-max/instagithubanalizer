# P1 Evidence Refresh

Date: 2026-07-23. This refresh is based on current files and Git state, not the previous handoff.

| Finding | Claimed State | Reproduced? | Evidence | Root Cause | Affected Files | Minimal Fix | Verification |
|---|---|---|---|---|---|---|---|
| EXEC-001 mock executor | Open | CONFIRMED | `ExecutionEngine.runAgent()` always constructs `status: "passed"` after a 50ms delay | JARVIS network never calls the existing canonical `agent-core/runtime` | `src/lib/jarvis/execution-engine.ts` | Explicit production/dry-run/test executors; production uses canonical runtime and rejects mock/unavailable providers | Targeted executor tests + typecheck |
| UPLOAD-001 chat attachments | Open | CONFIRMED | `/api/chat` accepts JSON text only; no attachment contract or server upload route for chat | Existing repository-import upload is unrelated to chat | chat API/UI | Add bounded chat attachment policy, server route, metadata, capability gate and tests | Unit/API/UI/browser |
| YOUTUBE-001 mini-player | Open | CONFIRMED | No dedicated YouTube component or safe ID parser exists | YouTube command only opens an external URL | JARVIS components | Add allowlisted parser and privacy-enhanced player | Unit/component/browser |
| PROVIDER-001 connection test | Open | CONFIRMED | `/api/providers/status` returns registry configuration; `getStatus().ok` is static and does not call `isAvailable()` | No health/capability test contract | provider router/status UI | Add real adapter health route with timeout and normalized states | Unit/API/browser |
| RESUME-001 restart/resume | Open | PARTIALLY_CONFIRMED | Prisma models and checkpoint reads exist; resume is pure graph restoration only | No end-to-end reload service, verified-checkpoint marker, concurrency guard, or restart integration test | checkpoint/execution/API | Persist verified checkpoints and add guarded resume loader/test | Integration tests |

## Detailed evidence

1. Production network requests default to `dryRun = false`, yet `runAgent()` returns a fabricated passing `AgentResult`; orchestration can therefore complete with fictional evidence.
2. A real canonical runtime exists at `src/lib/agent-core/runtime.ts`, plus the compatibility adapter in `src/lib/agent-runtime/agent-executor.ts`. It is not wired into the JARVIS network.
3. The canonical runtime registry is not initialized by the network path. Provider initialization can register a mock fallback when enabled; production network execution must explicitly reject it.
4. Chat upload scenarios for MIME spoofing, oversize, cancellation and duplicates have no chat-specific tests or implementation.
5. Provider status is configuration discovery, not a connection test.
6. Prisma persistence exists for runs, tasks, executions, artifacts, findings and checkpoints. Infrastructure-operation migration remains unapplied; runtime persistence is not yet VERIFIED.

## Git safety

The worktree remains materially dirty with extensive pre-existing edits and untracked files. All repairs in this loop must remain isolated and must not reset user work.
