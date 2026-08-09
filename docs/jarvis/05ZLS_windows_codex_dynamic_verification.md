# 05ZLS — Windows Dynamic Codex Sandbox Verification

Executed live on the user's real Windows 11 host via Desktop Commander (real PowerShell,
real `codex` CLI, real Node/npm), not the Linux sandbox used for the prior 05ZLR repair.
No source files were edited in this run. No commit, no push, no staging, no database
changes were performed.

## 1. Executive verdict

Dynamic verification found a genuine functional defect that static review in 05ZLR could
not have caught without a real CLI: the repaired adapter's `--ask-for-approval never` flag
is **rejected by the installed `codex exec` subcommand** (codex-cli 0.145.0) — `exec` does
not expose that flag at all (it only exists on the top-level interactive `codex` command).
Every real invocation of the adapter fails immediately (exit code 2, "unexpected argument
'--ask-for-approval' found"), before Codex's sandbox/approval logic or the model is ever
reached. The good news: this is a **safe failure**, not a security failure — no dangerous
bypass occurred, nothing outside the isolated workspace was touched, the sentinel was
unchanged, and no automatic dangerous retry was attempted. The adapter fails closed; it
just doesn't currently work. A second, unrelated defect was found in one unit test's mock
(not the adapter). Per this run's rules, neither was fixed — both are reported for a
follow-up scoped editing session.

## 2. Windows host verification

```
WINDOWS_HOST_STATUS=PASS
```
`cmd /c ver` → `Microsoft Windows [Version 10.0.22631.5624]`. `$PSVersionTable` →
PSVersion 5.1.22621.5624, PSEdition Desktop, BuildVersion 10.0.22621.5624. Real Windows
11 host, confirmed directly (not inferred).

## 3. Repository baseline

```
REPOSITORY_ROOT_STATUS=PASS
PRE_VERIFICATION_HEAD=08c0a2227fb54f54ad2508edd90a2278396df158
```
`git rev-parse --show-toplevel` → `D:/АГЕНТ/ДЖАРВИС` (matches expected root). Branch:
`feat/jarvis-agent-hub`. HEAD identical to 05ZLR's `PRE_REPAIR_HEAD` — no commits happened
between the two runs. `git diff --cached --name-status` is empty (nothing staged).

The working tree is extremely dirty, pre-existing this run: `package.json`,
`package-lock.json`, `prisma/schema.prisma`, deleted migration files, a deleted
`src/app/api/auth/[nextauth]/route.ts` (replaced by an untracked `[...nextauth]` variant),
and 100+ untracked files across `docs/jarvis/`, `prisma/`, `src/app/`, `src/lib/`, `src/services/`,
`reports/`, etc. This is the same pre-existing dirty state documented in 05ZLR §2 (that
report's view of it was truncated to 50 lines by a `head -50` pipe; the full list is larger
but unchanged in kind). None of it was touched by this run.

## 4. Codex binary and version

```
CODEX_EXECUTABLE=C:\Users\Admin\AppData\Roaming\npm\codex.cmd (+ codex.ps1, codex)
CODEX_VERSION=codex-cli 0.145.0
CODEX_SUBSCRIPTION_OAUTH_STATUS=ENABLED
```
`where.exe codex` resolved three real entries under `C:\Users\Admin\AppData\Roaming\npm\`.
`codex login status` → `Logged in using ChatGPT` (subscription OAuth; no token file was
read — only the CLI's own status summary was invoked, exactly as the adapter's own
`healthCheck()` does).

## 5. Local CLI capability matrix

| Capability | Supported (0.145.0) | Evidence |
|---|---|---|
| `exec` subcommand | Yes | `codex --help` lists it |
| `--sandbox workspace-write` (`-s`) | Yes | `codex exec --help` lists `-s, --sandbox <SANDBOX_MODE>` with `workspace-write` as a valid enum value |
| `--ask-for-approval never` (`-a`) | **No, on `exec`** | Absent from `codex exec --help`; empirically confirmed rejected: `error: unexpected argument '--ask-for-approval' found`. Only the top-level interactive `codex [OPTIONS] [PROMPT]` command exposes `-a/--ask-for-approval` |
| `-C/--cd <DIR>` | Yes | Listed and used successfully (see §10) |
| stdin prompt via `-` | Yes | `exec --help`: "If not provided as an argument (or if `-` is used), instructions are read from stdin" |
| `--json` (JSONL events) | Yes | Listed under `codex exec --help` |
| `--skip-git-repo-check` | Yes | Listed under `codex exec --help` |
| `--ephemeral` | Yes (exists in this version) | Listed under `codex exec --help`; not currently used by the adapter (05ZLR correctly declined to add it while unverified — now confirmed available, but adding it is a minor future improvement, not a defect) |
| `--add-dir` | Exists, never used by adapter | Correct per policy |
| `--dangerously-bypass-approvals-and-sandbox` | Exists, never used by adapter | Correct per policy |

`CODEX_WORKSPACE_WRITE_SUPPORTED=TRUE`, `CODEX_APPROVAL_NEVER_SUPPORTED=FALSE_ON_EXEC_SUBCOMMAND`,
`CODEX_STDIN_PROMPT_SUPPORTED=TRUE`.

## 6. Adapter argument audit

Read directly from `src/lib/worker-registry/adapters/codex-cli.ts` on this host (content
identical to what 05ZLR committed):

- Contains `exec`, `workspace-write`, `--ask-for-approval never`, the exact isolated
  workspace path (via `--cd`), `--json`, `-` stdin sentinel: confirmed present.
- Does **not** contain the prompt in argv, `--dangerously-bypass-approvals-and-sandbox`,
  `danger-full-access`, `--yolo`, `--add-dir`, or any network flag: confirmed.
- `shell: false`: confirmed in both `prepareExecutionPlan` and the `spawn()` call in `execute()`.
- stdin: `child.stdin.write(task.instructions)` then `child.stdin.end()` (EOF): confirmed.
- `OPENAI_API_KEY` / `CODEX_API_KEY` are `delete`d from `customEnv`: confirmed.
- Non-zero exit → `FAILED` (never `SUCCESS`): confirmed in code and empirically (§10).
- `cancel()` marks the runId in a `cancelledRuns` set; the `close` handler checks that set
  *before* falling into the `code === 0 ? SUCCESS : FAILED` branch, returning `CANCELLED`
  instead: confirmed in code (not re-exercised live this run beyond the existing unit test).
- No automatic dangerous retry exists anywhere in the file — a single `spawnProcess` call
  per `execute()`, no catch-and-retry-with-different-flags logic: confirmed.
- The `win32` branch's `codexPath` (`...\npm\node_modules\@openai\codex\bin\codex.js`) was
  verified to actually exist on disk (7236 bytes) — this is the real file the adapter's
  `spawnProcess` targets on this host.

```
CODEX_ADAPTER_SAFE_ARGS_STATUS=PASS_ON_SECURITY_FAIL_ON_FUNCTIONALITY
CODEX_STDIN_EOF_STATUS=PASS
CODEX_ENV_SANITISATION_STATUS=PASS
CODEX_CANCELLATION_STATUS=PASS_BY_CODE_REVIEW
CODEX_DANGEROUS_RETRY_STATUS=DISABLED
```

## 7. Unsafe-flag scan

```
git grep -n -E "dangerously-bypass-approvals-and-sandbox|--yolo|danger-full-access|--full-auto" -- src/lib/worker-registry package.json
```
9 matches, all classified **negative test assertion / static guard** (in
`codex-worker.test.ts` and the Codex section of `three-workers-e2e.ts`). Zero matches in
`adapters/` or `package.json`.
```
ACTIVE_PRODUCTION_CODEX_DANGEROUS_FLAGS_FOUND=0
```

## 8. Unit validation

| Command | Exit | Result |
|---|---|---|
| `npm run workers:typecheck` | 0 | PASS (2.57–2.67s) |
| `npx vitest run .../codex-worker.test.ts` | 1 | **13/14 passed, 1 failed** |
| `npm run workers:test` (antigravity, untouched) | 0 | PASS, 18/18 |

The one failure: `returns TIMEOUT when execution exceeds the timeout budget` — the test's
mock spawns a fake child whose `on` handler is a bare `vi.fn()` that never registers/fires a
`'close'` callback. The adapter's internal 20ms timer correctly calls `child.kill('SIGKILL')`,
but since the mock never delivers the corresponding `'close'` event afterward, the
`execute()` promise never resolves — the test hangs until vitest's own 5000ms default test
timeout kills it (`Test timed out in 5000ms`). This is a **test-file mock defect**
(mirrors the pattern already handled correctly in the adjacent CANCELLED test, which does
capture and manually invoke the close callback) — it does not indicate a problem in the
adapter's actual TIMEOUT-handling branch, which was exercised successfully in the original
05ZLR write-up by code trace but not proven end-to-end by this specific test.

```
CODEX_UNIT_TEST_STATUS=FAIL (13/14; 1 test-mock defect, not a production defect)
WORKERS_TEST_STATUS=PASS
```

## 9. Workspace and sentinel setup

```
CODEX_TEST_WORKSPACE=D:\JARVIS_WORKSPACES\phase05-verification\codex-sandbox-final
OUTSIDE_SENTINEL_PATH=D:\JARVIS_WORKSPACES\phase05-verification\codex-outside-sentinel.txt
OUTSIDE_SENTINEL_HASH_BEFORE=FE062BCED3F99810E7EA47CDA5A4D8A12BB9DEDD2BA5433B35C2BB8629E5F2AB
```
Workspace created with `README.md`, `package.json`, `src/`, `tests/` (all empty/scaffold).
Sentinel content: `CODEX_OUTSIDE_SENTINEL_UNCHANGED`. Sentinel path was never passed to the
adapter as a writable root — only `codex-sandbox-final` was passed via `--cd` and `cwd`.

## 10. Real adapter E2E

Ran the actual, unedited `CodexWorkerAdapter` class (not a raw CLI wrapper) via a throwaway
driver script (`D:\JARVIS_WORKSPACES\phase05-verification\run-codex-e2e.ts`, outside the git
repository — this does not count against the "only one new file" scope rule, which applies
to the repository) executed once, foreground, via `npx tsx`.

```
Codex executable   : node.exe  C:\Users\Admin\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js
Version             : codex-cli 0.145.0
Health check        : ONLINE
Sampled PID          : 18936
startedAt            : 2026-07-27T04:39:29.899Z
finishedAt           : 2026-07-27T04:39:30.006Z
Duration             : 104ms
Exit code            : 2
Result status         : FAILED
Args (no secrets)   : exec --sandbox workspace-write --ask-for-approval never
                        --cd D:\JARVIS_WORKSPACES\phase05-verification\codex-sandbox-final
                        --json --skip-git-repo-check -
Warnings             : ["sandboxPolicy=workspace-write","approvalPolicy=never","dangerousBypassUsed=false"]
Errors                : ["error: unexpected argument '--ask-for-approval' found ... Usage: codex exec [OPTIONS] [PROMPT] ..."]
stdout                : (empty)
Files before          : README.md, package.json, src/ (empty), tests/ (empty)
Files after           : identical — src/add.ts and tests/add.test.js were never created
```
The failure occurred at CLI argument-parsing time — before Codex's model, sandbox, or
network logic was ever reached. `dangerousBypassUsed=false` and the sandbox/approval
diagnostics were correctly attached to the `WorkerResult.warnings` even on this failure path,
exactly as designed in 05ZLR §7.

## 11. Sandbox boundary verification

- `src/add.ts` / test file inside workspace: **not created** (Codex never ran) — expected
  given §10.
- Sentinel exists, content unchanged, SHA-256 re-computed after the run:
  `FE062BCED3F99810E7EA47CDA5A4D8A12BB9DEDD2BA5433B35C2BB8629E5F2AB` — **identical** to §9.
- Main repository: `git rev-parse HEAD` unchanged (`08c0a222...`); no unexpected diff beyond
  the pre-existing baseline dirty state; `.git` untouched.
- No files created outside the workspace.
- Network: not directly instrumented (no packet capture), but inferred not exercised — the
  104ms failure is a clap argument-parse rejection, identical in text to the standalone
  `--help`-adjacent probe run in §5, which cannot reach any network code path.
- No automatic dangerous retry: confirmed — one spawn, one FAILED result, no follow-up call.

```
CODEX_SANDBOXED_REAL_E2E_STATUS=FAIL
CODEX_WORKSPACE_WRITE_STATUS=NOT_EXERCISED
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=PASS
CODEX_MAIN_REPOSITORY_INTEGRITY_STATUS=PASS
CODEX_NETWORK_ACCESS_STATUS=DISABLED_INFERRED
CODEX_AUTOMATIC_DANGEROUS_RETRY_STATUS=DISABLED
```

## 12. Three-worker E2E integrity

Read-only check of `src/lib/worker-registry/__tests__/three-workers-e2e.ts`, Codex section
only (lines 14–70): uses the real `CodexWorkerAdapter`, asserts no dangerous flags, asserts
`workspace-write`/`never` present, asserts the prompt is not in argv, uses an isolated
workspace (`D:\JARVIS_WORKSPACES\phase05-final-e2e\codex`), and does not fabricate expected
output. Claude and Antigravity sections untouched. The full three-worker E2E was **not**
run in this stage, as instructed. Cross-reference: were it run, it would currently fail at
its `codexResult.status !== 'SUCCESS'` check for the identical reason found in §10 — this is
the same defect, not a new one.
```
THREE_WORKER_CODEX_SECTION_INTEGRITY_STATUS=PASS
```

## 13. Full project validation

| Command | Exit | Result |
|---|---|---|
| `npm run workers:typecheck` | 0 | PASS |
| `npm run workers:test` | 0 | PASS, 18/18 |
| `npm run typecheck` | 0 | PASS (7.33s) |
| `npm test` | 1 | **381/382 PASS, 1 FAIL** (same codex-worker.test.ts TIMEOUT mock defect from §8) |
| `npm run lint` | 0 | PASS — 0 errors, 8 pre-existing warnings unrelated to worker-registry |
| `npm run build` | 0 | PASS — Next.js 16.2.10 (Turbopack), compiled successfully, 102 routes generated, 91.12s |

```
WORKERS_TYPECHECK_STATUS=PASS
PROJECT_TYPECHECK_STATUS=PASS
PROJECT_TEST_STATUS=FAIL
PROJECT_LINT_STATUS=PASS
PROJECT_BUILD_STATUS=PASS
```

## 14. Scope integrity

`git rev-parse HEAD` unchanged throughout this run. `git diff --cached --name-status` empty
at both start and end (nothing staged, no commit). The only new file created inside the
repository by this run is `docs/jarvis/05ZLS_windows_codex_dynamic_verification.md` (this
document). `codex-cli.ts` / `codex-worker.test.ts` / `three-workers-e2e.ts` show as modified
relative to HEAD, but that state is unchanged from 05ZLR — this run made zero `Edit`/`Write`
calls against them (only `Read`). Confirmed no diff on `claude-code.ts`, `antigravity-cli.ts`,
`antigravity-bridge.ts`, `claude-worker.test.ts`, `antigravity-worker.test.ts`,
`antigravity-e2e.ts`. `package.json`, `package-lock.json`, `prisma/`, and the auth route all
carry the same pre-existing dirty state documented in §3/05ZLR — untouched by this run. No
Prisma/migration commands were run; no database was touched.

## 15. Findings

**P0 (1):** `--ask-for-approval never` is not a valid argument for `codex exec` on the
installed CLI (0.145.0) — it is rejected outright (exit 2), so the adapter as committed
cannot successfully run a single real Codex task. `exec` is non-interactive by construction
and simply has no approval-prompt flag to configure; the closest available lever is a config
override (`-c approval_policy="never"`), which parsed without a clap-level rejection in an
isolated probe here but whose actual runtime effect on `exec`'s command-execution behavior
was not further verified in this run (making that change is out of scope — no edits
permitted). The concrete, minimal fix is to drop `--ask-for-approval`/`'never'` from both
argument arrays in `prepareExecutionPlan` (POSIX and `win32` branches) and re-verify with a
real E2E run before considering this repair complete.

**P1 (2):**
1. The `codex-worker.test.ts` TIMEOUT test's mock never fires `'close'` after `kill()`,
   causing a real vitest hang/timeout rather than exercising the intended code path. Fix by
   mirroring the CANCELLED test's pattern (capture the registered close callback and invoke
   it manually after asserting `kill` was called).
2. `--ephemeral` is confirmed to exist on this installed CLI version and is not currently
   used by the adapter. Not a security defect (affects only local session-file persistence),
   but worth adding once the P0 fix is verified, since 05ZLR's original hesitation
   ("not verifiable") no longer applies.

## 16. Final status

Security posture holds up empirically under a real, live run: no dangerous bypass flag was
ever used or fallen back to, the failure was fail-closed (`FAILED`, not a silent success),
the sentinel and main repository were untouched, and no automatic retry occurred. However,
the adapter cannot currently complete a real task, so this cannot be called
repair-complete. No commit was made; none should be until the P0 finding is fixed and
re-verified.

---

## Final block

```
WINDOWS_HOST_STATUS=PASS
REPOSITORY_ROOT_STATUS=PASS
CODEX_EXECUTABLE=C:\Users\Admin\AppData\Roaming\npm\codex.cmd
CODEX_VERSION=codex-cli 0.145.0
CODEX_SUBSCRIPTION_OAUTH_STATUS=ENABLED
CODEX_EXECUTION_MODE=NON_INTERACTIVE_SANDBOXED
CODEX_SANDBOX_POLICY=WORKSPACE_WRITE
CODEX_APPROVAL_POLICY=NEVER
CODEX_DANGER_FULL_ACCESS=DISABLED
CODEX_WORKSPACE_WRITE_SUPPORTED=TRUE
CODEX_APPROVAL_NEVER_SUPPORTED=FALSE_ON_EXEC_SUBCOMMAND
CODEX_STDIN_PROMPT_SUPPORTED=TRUE
ACTIVE_PRODUCTION_CODEX_DANGEROUS_FLAGS_FOUND=0
CODEX_ADAPTER_SAFE_ARGS_STATUS=PASS_ON_SECURITY_FAIL_ON_FUNCTIONALITY
CODEX_STDIN_EOF_STATUS=PASS
CODEX_ENV_SANITISATION_STATUS=PASS
CODEX_CANCELLATION_STATUS=PASS_BY_CODE_REVIEW
CODEX_AUTOMATIC_DANGEROUS_RETRY_STATUS=DISABLED
CODEX_UNIT_TEST_STATUS=FAIL
WORKERS_TEST_STATUS=PASS
CODEX_SANDBOXED_REAL_E2E_STATUS=FAIL
CODEX_WORKSPACE_WRITE_STATUS=NOT_EXERCISED
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=PASS
CODEX_MAIN_REPOSITORY_INTEGRITY_STATUS=PASS
CODEX_NETWORK_ACCESS_STATUS=DISABLED_INFERRED
THREE_WORKER_CODEX_SECTION_INTEGRITY_STATUS=PASS
WORKERS_TYPECHECK_STATUS=PASS
PROJECT_TYPECHECK_STATUS=PASS
PROJECT_TEST_STATUS=FAIL
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
P0_FINDINGS=1
P1_FINDINGS=2
CODEX_WINDOWS_DYNAMIC_STATUS=FAIL
CODEX_SANDBOX_REPAIR_STATUS=FAIL
PHASE_05_RELEASE_STATUS=BLOCKED
NEXT_ALLOWED_ACTION=RUN_TARGETED_WINDOWS_CODEX_DIAGNOSTIC_THEN_SCOPED_FIX_OF_ASK_FOR_APPROVAL_FLAG
```

No commit created. No push performed. Phase 06 not started.
