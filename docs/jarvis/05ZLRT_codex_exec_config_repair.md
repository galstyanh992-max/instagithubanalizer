# 05ZLRT — Codex Exec Config Override Repair

Executed live on the real Windows 11 host via Desktop Commander. Both defects confirmed by
05ZLS were fixed, dynamically re-verified end-to-end (including a real, successful Codex
task run inside the sandbox), and the full project validation suite is green. No commit, no
push, no staging, no database or Prisma changes, no touch to Claude/Antigravity adapters,
package.json, or package-lock.json.

## 1. Executive verdict

Both confirmed defects are repaired and dynamically proven fixed:

1. `--ask-for-approval never` (rejected by `codex exec` on codex-cli 0.145.0) was replaced
   with the exec-supported inline config override `-c approval_policy="never"`, verified
   both by a parse-only `--help` probe and by a real, complete, successful E2E task run.
2. The TIMEOUT unit test's mock now fires a deterministic asynchronous `close` event from
   `kill()` (via `queueMicrotask`), proving the adapter's real TIMEOUT code path instead of
   hanging to Vitest's default 5s timeout.

The real Windows E2E this time reached **SUCCESS, exit code 0** — Codex actually created
`src/add.ts`, `src/add.js`, and `tests/add.test.js` inside the isolated workspace, and the
test (independently re-run) passes. Sentinel and main repository integrity held throughout.
Full project validation (typecheck, 386 tests, lint, build) is fully green.

## 2. Baseline

```
PRE_REPAIR_HEAD=08c0a2227fb54f54ad2508edd90a2278396df158
PRE_REPAIR_WORKING_TREE_STATUS=dirty, pre-existing (unchanged in kind from 05ZLR/05ZLS)
PRE_REPAIR_INDEX_STATUS=clean (nothing staged)
```
Ambient processes observed (not started or touched by this run): a Windows Store
`OpenAI.Codex` desktop app process (`codex.exe`, PID 11800 — a different install from the
npm-based CLI the adapter uses) and ~30 lingering `node.exe` processes from earlier session
activity. Branch: `feat/jarvis-agent-hub`. HEAD unchanged from the prior two runs — no
commits happened between 05ZLR/05ZLS/this run. `git diff --cached --name-status` empty
throughout.

## 3. Dynamic blocker (recap from 05ZLS)

Real Windows E2E previously failed: exit code 2, `error: unexpected argument
'--ask-for-approval' found`. Security properties held (no dangerous bypass, workspace and
sentinel untouched, no automatic retry) but the adapter could not complete a single real
task. 13/14 Codex unit tests passed; the TIMEOUT test hung to Vitest's default timeout;
381/382 full suite.

## 4. Local CLI capability and parse check

`where.exe codex` → same three entries under `C:\Users\Admin\AppData\Roaming\npm\`.
`codex --version` → `codex-cli 0.145.0` (identical to 05ZLS — no CLI update occurred).
`codex exec -c 'approval_policy="never"' --sandbox workspace-write --cd "C:\Temp" --json
--skip-git-repo-check --help` — parsed cleanly, printed the standard help text, **no**
"unexpected argument" error. This is a parse/help-only check; it did not run the model or
touch any workspace.
```
CODEX_INLINE_APPROVAL_CONFIG_PARSE_STATUS=PASS
```

## 5. Adapter argument repair

| Branch | Old args (rejected) | New args | Change |
|---|---|---|---|
| POSIX (`command: 'codex'`) | `exec --sandbox workspace-write --ask-for-approval never --cd <ws> --json --skip-git-repo-check -` | `exec --sandbox workspace-write -c approval_policy="never" --cd <ws> --json --skip-git-repo-check -` | `--ask-for-approval never` removed; `-c approval_policy="never"` added |
| `win32` (`command: 'node', args: [codexPath, ...]`) | same pattern, prefixed with `codexPath` | same pattern, prefixed with `codexPath` | identical fix applied to both branches |

Both branches were edited identically — no divergence between them. `--ephemeral` was
**not** added (no architectural requirement currently calls for it; noted as available in
05ZLS §5 for a future, separately-scoped change). The prompt is still never placed in argv
(delivered via stdin, see §7 unchanged behavior). `shell: false`, args-as-array, `cwd`
inside the isolated workspace, stdin write+EOF, stdout/stderr accumulation, the 180s default
timeout, cancellation via a `cancelledRuns` set, and the `OPENAI_API_KEY`/`CODEX_API_KEY`
deletion were all preserved unchanged.

## 6. Approval-policy implementation

`CODEX_SANDBOX_DIAGNOSTICS` (attached to every `WorkerResult.warnings`, success or failure)
was updated from
`['sandboxPolicy=workspace-write', 'approvalPolicy=never', 'dangerousBypassUsed=false']` to
`['sandboxPolicy=workspace-write', 'approvalPolicy=never-via-inline-config',
'dangerousBypassUsed=false', 'networkAccessEnabled=false']` — the old flag-based label
(`approvalPolicy=never` / any `-via-flag` variant) is never emitted again.

A new `classifyCodexFailure(stderr)` helper labels non-zero-exit failures without changing
the `WorkerResult` type shape (still `string[]`): `CODEX_CLI_ARGUMENT_REJECTED: ...` for
clap-style "unexpected argument" text against `codex exec`, `CODEX_SANDBOX_DENIED: ...` for
sandbox/permission-denied text, and `CODEX_EXECUTION_FAILED: ...` as the generic fallback.
TIMEOUT and CANCELLED paths now prefix their error strings with `CODEX_TIMED_OUT:` and
`CODEX_CANCELLED:` respectively. No automatic fallback to a dangerous mode exists anywhere
in this classification logic or the surrounding code — every branch still resolves a single
`WorkerResult`, once, with no retry.

## 7. Timeout mock repair

The test helper `makeMockChild` now accepts `killTriggersClose`/`closeCodeOnKill`: when set,
calling the mock's `kill()` schedules `queueMicrotask(() => closeCallback(closeCodeOnKill,
signal))` — a deterministic, near-instant simulation of the OS delivering a terminal `close`
event after a kill signal, mirroring Node's real `(code, signal)` close-event shape. The
TIMEOUT test now asserts: the adapter's real 20ms timer fired, `kill('SIGKILL')` was called,
a terminal `close(null, ...)` was received, the result is `TIMEOUT` (not `SUCCESS`), the
error is labeled `CODEX_TIMED_OUT:`, and the whole test resolves in under 4 seconds (proving
it exercised the real code path rather than waiting out Vitest's own timeout). The
production timeout value/behavior itself was not touched or weakened — only the test's mock
lifecycle changed. The CANCELLED test was similarly tightened to use the same deterministic
mechanism instead of a manually-captured callback.

## 8. Unit tests

`codex-worker.test.ts` grew from 15 to 18 tests. New/changed assertions cover, verbatim,
all 13 items required by this phase: no `--ask-for-approval` (or other dangerous flag) in
args; presence of `exec`, `--sandbox`, `workspace-write`, `-c`, the exact value
`approval_policy="never"`, the isolated workspace path, `--json`, and the trailing `-` stdin
sentinel; prompt absent from argv; prompt delivered via `stdin.write`; `stdin.end()` (EOF)
called after the write; `shell === false`; `OPENAI_API_KEY`/`CODEX_API_KEY` absent from
`plan.env` even when set in the real process env; non-zero exit → `FAILED`; timeout →
`TIMEOUT` (adapter's actual status name — the phase's `TIMED_OUT` language matches this
status conceptually, see §15 note); cancellation → `CANCELLED`; no automatic dangerous
retry after failure, timeout, or cancellation (three separate tests); and the new diagnostic
policy strings (`approvalPolicy=never-via-inline-config`, `networkAccessEnabled=false`)
are asserted while the old ones are asserted absent. No test uses a hardcoded pass.

`three-workers-e2e.ts` — only the Codex section was touched, exactly because it contained
the stale expectation: line 54 previously asserted `codexPlan.args.includes('never')`, which
would now fail (there is no longer a standalone `'never'` array element — it is now embedded
inside `'approval_policy="never"'`). Replaced with an assertion on the exact new value plus
an explicit guard that `--ask-for-approval` is never present and `-c` is present. Claude and
Antigravity sections were not touched (confirmed via diff — see §13).

## 9. Static scans

```
git grep -n -E "dangerously-bypass-approvals-and-sandbox|--yolo|danger-full-access|--full-auto|--ask-for-approval" -- src/lib/worker-registry package.json
```
17 matches total, classified: all in `codex-worker.test.ts` (negative assertions and one
test name/literal string used only to prove the failure-classifier labels a rejected-flag
error correctly), `three-workers-e2e.ts` (a negative guard plus an explanatory comment), and
one explanatory comment in `codex-cli.ts` itself stating the flag is "intentionally NOT
used" (historical/documentation, not active use). Zero active production uses.
```
ACTIVE_PRODUCTION_CODEX_DANGEROUS_FLAGS_FOUND=0
ACTIVE_PRODUCTION_CODEX_UNSUPPORTED_FLAGS_FOUND=0
```

## 10. Real Windows adapter E2E

| Field | Value |
|---|---|
| Executable | `node.exe` running `C:\Users\Admin\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js` |
| Version | codex-cli 0.145.0 |
| Sampled PID | 24728 |
| Args (no secrets) | `exec --sandbox workspace-write -c approval_policy="never" --cd D:\JARVIS_WORKSPACES\phase05-verification\codex-sandbox-final --json --skip-git-repo-check -` |
| startedAt | 2026-07-27T05:00:19.738Z |
| finishedAt | ≈2026-07-27T05:01:54Z (durationMs below) |
| Duration | 94273 ms |
| Exit code | 0 |
| WorkerResult status | **SUCCESS** |
| Warnings | `sandboxPolicy=workspace-write`, `approvalPolicy=never-via-inline-config`, `dangerousBypassUsed=false`, `networkAccessEnabled=false` |
| Errors | `[]` |
| stdout | Real Codex JSONL event stream: `thread.started`, `turn.started`, `reasoning`, `command_execution` items showing the model ran PowerShell commands inside the sandboxed workspace |
| stderr | Two non-fatal internal Codex log lines (see note below) |
| Files before | `README.md`, `package.json`, empty `src/`, empty `tests/` |
| Files after | `README.md`, `package.json`, `src/add.js`, `src/add.ts`, `tests/add.test.js` |

Confirmed present in the actual args: `--sandbox workspace-write`, `-c
approval_policy="never"`. Confirmed absent: `--ask-for-approval`,
`--dangerously-bypass-approvals-and-sandbox`, `danger-full-access`.

`src/add.ts` (`export function add(a: number, b: number): number { return a + b; }`),
`src/add.js` (CommonJS equivalent), and `tests/add.test.js` were all created by Codex
inside the workspace. The unit test was independently re-run outside of Codex's own
execution (`node tests\add.test.js`) and printed `PASS`.

**stderr note (transparency, not a defect in this adapter):** stderr contained (1) an
internal Codex log line reporting a failed OAuth token refresh for an MCP server named
"supabase" — this is an unrelated, ambient MCP server configured in the user's own global
Codex config (`$CODEX_HOME`, not read or modified by this adapter or this run), and (2) one
intermediate PowerShell command the model generated that hit a quoting/encoding syntax error
(Russian-locale `Missing argument in parameter list` for a `New-Item ... -Encoding utf8`
invocation) — the model's own agent loop evidently recovered and completed the task anyway,
since all three target files exist with correct content and the WorkerResult is `SUCCESS`
with exit code 0. Neither issue is a defect in `codex-cli.ts`; both are properties of the
model's generated shell commands and the user's own ambient Codex configuration, reported
here for completeness rather than omitted.

## 11. Sandbox-boundary verification

- `src/add.ts` created: confirmed. Unit test created: confirmed. Test passes (independently
  re-run): confirmed (`PASS`).
- Sentinel exists, SHA-256 recomputed after the run: `FE062BCED3F99810E7EA47CDA5A4D8A12BB9DEDD2BA5433B35C2BB8629E5F2AB`
  — identical to the pre-run hash.
- Main repository: `git rev-parse HEAD` unchanged (`08c0a222...`); no unexpected diff beyond
  the pre-existing baseline; `.git` untouched.
- No new files created outside `D:\JARVIS_WORKSPACES\phase05-verification\` (top-level
  listing shows exactly the sentinel, the workspace directory, and the external driver
  script — nothing else).
- Network: the adapter itself never passed a network-enabling flag (no `--search`, no
  network config override) — `networkAccessEnabled=false` holds at the adapter-invocation
  level. The one observed network attempt (the failed Supabase MCP OAuth refresh, §10) was
  initiated by Codex's own runtime against the user's pre-existing global MCP configuration,
  independent of anything this adapter requested.
- No automatic dangerous retry: single spawn, single resolved `WorkerResult`, no
  retry/fallback logic anywhere in the code.

```
CODEX_SANDBOXED_REAL_E2E_STATUS=PASS
CODEX_WORKSPACE_WRITE_STATUS=PASS
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=PASS
CODEX_MAIN_REPOSITORY_INTEGRITY_STATUS=PASS
CODEX_NETWORK_ACCESS_STATUS=DISABLED
CODEX_AUTOMATIC_DANGEROUS_RETRY_STATUS=DISABLED
```

## 12. Full validation

| Command | Exit | Result |
|---|---|---|
| `npm run workers:typecheck` (×2, before and after E2E) | 0 | PASS |
| `npx vitest run .../codex-worker.test.ts` | 0 | PASS — 18/18, 1.75s (no hang) |
| `npm run workers:test` (×2) | 0 | PASS — 18/18 (Antigravity, untouched) |
| `npm run typecheck` (full) | 0 | PASS (7.30s) |
| `npm test` (full) | 0 | **PASS — 58 files, 386/386 tests** (was 381/382 in 05ZLS) |
| `npm run lint` | 0 | PASS — 0 errors, 8 pre-existing warnings unrelated to worker-registry |
| `npm run build` | 0 | PASS — Next.js 16.2.10 (Turbopack), 102 routes, 52.48s |

```
WORKERS_TYPECHECK_STATUS=PASS
WORKERS_TEST_STATUS=PASS
PROJECT_TYPECHECK_STATUS=PASS
PROJECT_TEST_STATUS=PASS
PROJECT_LINT_STATUS=PASS
PROJECT_BUILD_STATUS=PASS
```

## 13. Scope integrity

`git rev-parse HEAD` unchanged throughout (`08c0a222...`). `git diff --cached --name-status`
empty at every checkpoint (nothing staged, no commit). `git diff --stat -- src/lib/worker-registry`
shows exactly three changed files: `codex-worker.test.ts` (+348/−104 across rewritten test
bodies), `three-workers-e2e.ts` (+23, additive guard/comment only), `codex-cli.ts` (+107/−16
across the args, diagnostics, and new classifier). One new file created inside the
repository: `docs/jarvis/05ZLRT_codex_exec_config_repair.md` (this document). `git status
--short` scoped to `package.json`, `package-lock.json`, `prisma/`, and the auth route shows
the identical pre-existing dirty state documented in every prior report in this chain —
untouched by this run.
```
CLAUDE_FILES_CHANGED_BY_THIS_RUN=FALSE
ANTIGRAVITY_FILES_CHANGED_BY_THIS_RUN=FALSE
PRISMA_CHANGED_BY_THIS_RUN=FALSE
MIGRATIONS_CHANGED_BY_THIS_RUN=FALSE
AUTH_ROUTE_CHANGED_BY_THIS_RUN=FALSE
PACKAGE_FILES_CHANGED_BY_THIS_RUN=FALSE
GIT_INDEX_CHANGED=FALSE
DATABASE_MODIFIED=FALSE
```

## 14. Findings

No P0 or P1 findings from this run's own scope. Two informational notes for future
awareness (not defects, not blocking):

1. The `command_execution` events in the real E2E's stdout show the model occasionally
   generates PowerShell commands with quoting/encoding issues (see §10) — this is a
   property of model output on this host's shell, not of the adapter, and the agent
   self-corrected; no adapter change is implicated.
2. The ambient "supabase" MCP OAuth refresh failure in stderr (§10) originates from the
   user's own global Codex configuration outside this repository and outside `$CODEX_HOME`
   modification scope of this task; worth the user's own attention if it's noisy, but out of
   scope for this adapter repair.

## 15. Final status

Both confirmed defects (the `--ask-for-approval` argument rejection and the TIMEOUT test's
non-firing mock) are fixed and dynamically proven: a real Codex task ran to completion
inside the isolated workspace with the new inline-config-based approval policy, the
sentinel and main repository were untouched, and the full project (386 tests, typecheck,
lint, build) is green. This repair is validated but, per instructions, not committed.

## 16. Exact next action

Owner reviews this report and the diff (`codex-cli.ts`, `codex-worker.test.ts`,
`three-workers-e2e.ts`) and decides whether to commit. No further diagnostic work is
required before that decision — all requested validation stages passed.

---

## Final block

```
CODEX_VERSION=codex-cli 0.145.0
CODEX_EXECUTION_MODE=NON_INTERACTIVE_SANDBOXED
CODEX_SANDBOX_POLICY=WORKSPACE_WRITE
CODEX_APPROVAL_POLICY=NEVER_VIA_INLINE_CONFIG
CODEX_DANGER_FULL_ACCESS=DISABLED
CODEX_INLINE_APPROVAL_CONFIG_PARSE_STATUS=PASS
ACTIVE_PRODUCTION_CODEX_DANGEROUS_FLAGS_FOUND=0
ACTIVE_PRODUCTION_CODEX_UNSUPPORTED_FLAGS_FOUND=0
CODEX_ADAPTER_SAFE_ARGS_STATUS=PASS
CODEX_STDIN_EOF_STATUS=PASS
CODEX_ENV_SANITISATION_STATUS=PASS
CODEX_CANCELLATION_STATUS=PASS
CODEX_TIMEOUT_HANDLING_STATUS=PASS
CODEX_AUTOMATIC_DANGEROUS_RETRY_STATUS=DISABLED
CODEX_UNIT_TEST_STATUS=PASS
CODEX_TIMEOUT_UNIT_TEST_STATUS=PASS
WORKERS_TEST_STATUS=PASS
CODEX_SANDBOXED_REAL_E2E_STATUS=PASS
CODEX_WORKSPACE_WRITE_STATUS=PASS
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=PASS
CODEX_MAIN_REPOSITORY_INTEGRITY_STATUS=PASS
CODEX_NETWORK_ACCESS_STATUS=DISABLED
WORKERS_TYPECHECK_STATUS=PASS
PROJECT_TYPECHECK_STATUS=PASS
PROJECT_TEST_STATUS=PASS
PROJECT_LINT_STATUS=PASS
PROJECT_BUILD_STATUS=PASS
CLAUDE_FILES_CHANGED_BY_THIS_RUN=FALSE
ANTIGRAVITY_FILES_CHANGED_BY_THIS_RUN=FALSE
PRISMA_CHANGED_BY_THIS_RUN=FALSE
MIGRATIONS_CHANGED_BY_THIS_RUN=FALSE
AUTH_ROUTE_CHANGED_BY_THIS_RUN=FALSE
PACKAGE_FILES_CHANGED_BY_THIS_RUN=FALSE
GIT_INDEX_CHANGED=FALSE
DATABASE_MODIFIED=FALSE
P0_FINDINGS=0
P1_FINDINGS=0
CODEX_EXEC_CONFIG_REPAIR_STATUS=PASS
CODEX_SANDBOX_REPAIR_STATUS=PASS
PHASE_05_RELEASE_STATUS=REPAIR_VALIDATED_NOT_COMMITTED
NEXT_ALLOWED_ACTION=OWNER_APPROVES_CODEX_SANDBOX_FIX_COMMIT
```

No commit created. No push performed. Phase 06 not started.
