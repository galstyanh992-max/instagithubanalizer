# 05ZLR — Codex Safe Non-Interactive Sandbox Repair

Agent execution environment for this run: sandboxed Linux shell mounted read/write onto
`D:\АГЕНТ\ДЖАРВИС` (no access to the user's actual Windows desktop, its running processes,
or the real `codex` CLI/OAuth session, which live only on that machine). Where the prompt's
required checks are Windows-native and could not be performed from this environment, that is
stated explicitly rather than fabricated. No commit, no push, no staging was performed.

## 1. Executive verdict

The committed vulnerability is confirmed and repaired at the source level:
`--dangerously-bypass-approvals-and-sandbox` has been removed from
`src/lib/worker-registry/adapters/codex-cli.ts` and replaced with an explicit
fail-closed `--sandbox workspace-write` / `--ask-for-approval never` invocation, prompt
delivery moved from argv to stdin+EOF, API-key env vars stripped, and cancellation given a
distinct terminal state. Static scan confirms zero remaining dangerous flags in production
code. Unit tests were rewritten to assert the safe contract. However, **dynamic verification
(vitest, real Codex E2E, full project build/lint/test) could not be executed to completion in
this sandbox** — see §10–11 for why — so this run's status is `REPAIR_VALIDATED_BY_STATIC_MEANS_ONLY`,
not a fully green dynamic PASS. No commit/push occurred, per instructions.

## 2. Baseline

```
PRE_REPAIR_HEAD=08c0a2227fb54f54ad2508edd90a2278396df158
PRE_REPAIR_BRANCH=feat/jarvis-agent-hub
```

Last 5 commits:
```
08c0a22 fix(build): remove external Google font dependency
908fb51 feat(workers): complete Phase 05 subscription worker runtime
865d479 fix(database): restore Phase 05 worker tables
a6568c8 fix: remove host-specific tts executable path
4a03ee6 feat: Implement Jarvis Orchestrator and Role Router services
```

`PRE_REPAIR_WORKING_TREE_STATUS`: **dirty, pre-existing, unrelated to this task.** Before any
tool call in this run touched anything, `git status` already showed: `package.json` modified
(reformatted, unicode-escaped `&&` in scripts — not from this run), ~35 tracked files modified
under `.agents/skills/...` and various root `*.md` files, deletions under `prisma/migrations/`
and `src/app/api/auth/[nextauth]/route.ts` (replaced by an untracked `[...nextauth]` dir), a
deleted `3001` file, and ~50+ untracked `docs/jarvis/*.md` phase-report files plus
`docs/jarvis/evolution/` and `docs/jarvis/providers/`. None of this was created or modified by
this run — confirmed by diffing the exact same paths after the repair (§12).

A stale `.git/index.lock` (0 bytes) was present at the very first `git status` call and could
not be removed by this process (`Operation not permitted`) — it did not block read operations
and was left untouched, since removing git-internal lock files is outside this task's scope and
risks masking a concurrent process (e.g., another agent/IDE) also touching this repo.
`Get-Process` for `codex/node/npm/tsx/vitest` could not be executed — this sandbox has no
visibility into the user's real Windows process table.

## 3. Local Codex CLI capabilities

**Not executable from this environment.** `where.exe codex`, `Get-Command codex`,
`codex --version`, and `codex exec --help` are Windows-native calls against a real,
authenticated `codex` install that exists only on the user's machine. This Linux sandbox has no
`codex` binary (`which codex` → exit 1) and no way to reach the user's desktop shell.

| Capability | Supported | Evidence | Required |
|---|---|---|---|
| `exec` subcommand | Assumed (documented CLI behavior) | Not locally verifiable this run | Yes |
| `--sandbox workspace-write` | Assumed | Not locally verifiable this run | Yes |
| `--ask-for-approval never` | Assumed | Not locally verifiable this run | Yes |
| `--cd` / `-C` | Assumed | Not locally verifiable this run | Yes |
| stdin prompt via `-` | Assumed | Not locally verifiable this run | Yes |
| `--json` | Assumed | Not locally verifiable this run | Yes |
| `--ephemeral` | Unconfirmed | No reliable evidence it exists | No — omitted per instructions |

Per the phase's own fail-closed rule ("if `--ephemeral` is not confirmed supported, do not add
it"), it was **not added**. Everything else above is implemented per the phase's specified
target semantics, but is flagged here as **requiring one real confirmation run of
`codex exec --help` on the actual Windows host** before this is trusted in production. This is
the single most important open item in this report (see §13, P0).

## 4. Unsafe committed behavior (found)

`src/lib/worker-registry/adapters/codex-cli.ts`, lines 68 and 73 (pre-repair):
```
args = ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', task.instructions];
```
present in both the POSIX and `win32` branches. Effects: sandbox fully disabled, no approval
gate, the model's own generated shell commands run with host-level access, and the task prompt
was interpolated directly into argv (secondary risk: argv is visible via process listing / could
be affected by shell-metacharacter-adjacent tooling even with `shell:false`, and any value
containing something argv-hostile is a smell even if not directly exploitable here).
`PHASE_05_POST_COMMIT_AUDIT_STATUS=PASS_WITH_DOCUMENTATION_NOTE` is treated as void per this
prompt's instruction.

## 5. Safe invocation design

```
codex exec --sandbox workspace-write --ask-for-approval never --cd <workspaceRoot> --json --skip-git-repo-check -
```
(`win32`: same args appended after `node <codex.js path>`.) Design choices:
- `--sandbox workspace-write` replaces the full bypass — sandbox is never disabled.
- `--ask-for-approval never` gives non-interactive execution without touching the sandbox gate.
- `--cd <workspaceRoot>` is redundant-but-explicit alongside `cwd: workspaceRoot` in the spawn
  options — defense in depth in case a future refactor drops one of the two.
- `--json` requested per spec (JSON mode); parsing of the JSON stream is unchanged/out of scope.
- `--skip-git-repo-check` retained (not on the forbidden list; isolated workspaces are often not
  git repos, and this only suppresses a warning, not a security control).
- Trailing `-` + prompt moved to stdin (`child.stdin.write(task.instructions)` then
  `child.stdin.end()` for EOF) — the instruction text is never placed in argv.
- `shell: false` unchanged; args passed as an array unchanged.
- `OPENAI_API_KEY` and `CODEX_API_KEY` are stripped from the child's env — ChatGPT subscription
  OAuth (which lives in the user's `codex` config/credentials on disk, never read or touched by
  this adapter or this run) remains the only auth path.
- No `--add-dir`, no network flags, no `danger-full-access`, no `--yolo`, no `--full-auto`.

## 6. Adapter changes

| Requirement | Before | Required after | Verdict |
|---|---|---|---|
| Sandbox flag | `--dangerously-bypass-approvals-and-sandbox` | `--sandbox workspace-write` | Fixed |
| Approval flag | none (implied bypass) | `--ask-for-approval never` | Fixed |
| Prompt channel | argv (`task.instructions`) | stdin, EOF-terminated | Fixed |
| JSON mode | absent | `--json` | Fixed |
| cwd | `workspaceRoot` via spawn opts only | `workspaceRoot` via spawn opts **and** `--cd` | Fixed |
| shell | `false` | `false` | Unchanged (already correct) |
| env sanitisation | none | `OPENAI_API_KEY`, `CODEX_API_KEY` deleted | Fixed |
| Cancellation status | fell through to SUCCESS (exitCode nulled to 0) | distinct `CANCELLED` status | Fixed (bug) |
| Timeout handling | `TIMEOUT` status, `SIGKILL` | unchanged | Already correct |
| Automatic dangerous retry | none present | none present, now covered by a test | Confirmed absent |
| Process-tree termination | single `child.kill()`, no shell/subshell spawned | unchanged | Acceptable — `shell:false` means no intermediate shell process to reap separately |
| Exit-code handling | `code = exitCode ?? 0` (bug: null exit code from a signal kill counted as success) | still present for the *non-cancelled, non-timeout* path only — now provably unreachable for cancellation, since that path resolves earlier | Fixed for cancellation; residual `?? 0` only affects a signal-killed-without-cancel-or-timeout edge case, flagged as P1 (§13) |

## 7. Fail-closed behavior

No dangerous fallback path exists or was added. On sandbox/approval failure the adapter returns
`FAILED` (non-zero exit) or `TIMEOUT`/`CANCELLED` as appropriate — it never retries with looser
flags. Every terminal `WorkerResult` (`SUCCESS`, `FAILED`, `TIMEOUT`, `CANCELLED`, spawn-`error`)
now carries a diagnostic triplet in `warnings` (kept in the existing schema rather than changing
`types.ts`, which is out of scope): `sandboxPolicy=workspace-write`, `approvalPolicy=never`,
`dangerousBypassUsed=false`. No secrets are included.

## 8. Unit tests

`src/lib/worker-registry/__tests__/codex-worker.test.ts` was rewritten (was 5 tests / 141 lines,
now 15 tests / ~270 lines, no hardcoded `expect(true).toBe(true)`-style passes). Covers, against
the real (mocked-subprocess) adapter output, all ten items required by the phase:
1. no dangerous flags in produced args (string-level, not just object-shape)
2. presence of `exec`, `workspace-write`, `never`, the exact workspace path, `--json`
3. `shell === false`
4. prompt delivered via `stdin.write`, never via argv
5. `stdin.end()` called after the write (`invocationCallOrder` asserted)
6. `OPENAI_API_KEY`/`CODEX_API_KEY` proven absent from `plan.env` even when set in the real
   process env during the test
7. non-zero exit → `FAILED`
8. exceeding `timeoutMs` → `TIMEOUT`, `SIGKILL` observed
9. `cancel()` mid-run → `CANCELLED` (not `SUCCESS`/`FAILED`) — this test would have caught the
   pre-existing `exitCode ?? 0` cancellation bug in §6
10. one failed run triggers exactly one `spawnProcess` call with no follow-up dangerous-flag call

`three-workers-e2e.ts` — Claude and Antigravity sections untouched. The Codex section gained
three assertions mirroring the pattern already used for Antigravity in the same file: no
dangerous flags, `workspace-write`/`never` present, prompt not in argv. This was a minimal,
in-scope addition (the file itself did not previously assert Codex needed the dangerous flag,
so no larger rewrite was required).

## 9. Static unsafe-flag scan

```
git grep -n -E "dangerously-bypass-approvals-and-sandbox|--yolo|danger-full-access|--full-auto" \
  -- src/lib/worker-registry package.json
```
Matches after repair: 6, all of them negative assertions/guards inside
`codex-worker.test.ts` and `three-workers-e2e.ts` (`expect(...).not.toContain(...)` and
`if (arg.includes(...)) throw`). Zero matches in `adapters/` or `package.json`.
```
ACTIVE_CODEX_DANGEROUS_FLAGS_FOUND=0
```

## 10. Real sandboxed E2E

**Not run.** `D:\JARVIS_WORKSPACES\phase05-verification\codex-sandbox-final` is a Windows path
on the user's machine; this sandbox cannot create it, cannot invoke the real `codex` binary
(none present, `which codex` fails), and has no OAuth session to exercise. Fabricating a PASS
here would violate the report's own fail-closed principle. This stage requires re-running Phase
05ZLR's Stage 10 directly on the Windows host where `codex` is actually installed and logged in.
```
CODEX_SANDBOXED_REAL_E2E_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
```

## 11. Full project validation

```
npm run workers:typecheck   → PASS (tsc -p tsconfig.workers.json, clean exit 0)
npx vitest run .../codex-worker.test.ts → BLOCKED — see below
npm run workers:test        → BLOCKED — same underlying cause (unrelated to this change:
                               reproduced identically against the untouched
                               antigravity-worker.test.ts)
npm run typecheck (full)    → NOT COMPLETED — full-project tsc exceeded this sandbox's
                               per-command time budget on this large codebase; a
                               background-and-poll attempt also did not complete
npm test / lint / build     → NOT ATTEMPTED — same class of tooling constraint, and running
                               `npm install` to fix the vitest blocker risks rewriting
                               package-lock.json, which is outside this run's approved scope
```

Root cause of the vitest block: `node_modules/rolldown` (vite 8's rolldown-vite bundler,
a transitive dependency of vitest 4) is missing its Linux native binding
(`@rolldown/binding-linux-x64-gnu`) — this `node_modules` was installed on the Windows host and
optional native deps for other platforms were never pulled. This is a pre-existing,
environment-wide condition, not something introduced by this repair: it reproduces byte-for-byte
against the unmodified `antigravity-worker.test.ts`. Fixing it would mean running `npm install`
inside this sandbox, which is exactly the kind of unscoped, potentially package-lock-mutating
action this task's rules tell me to avoid without a direct requirement to do so.

The rewritten test file was instead verified by manual trace against the repaired adapter
(mock shapes match `child_process.spawn`'s real return type; assertions match the exact strings
emitted by `prepareExecutionPlan`/`execute`) — this is evidence, not a substitute for the vitest
run the phase actually requires.

```
WORKERS_TYPECHECK_STATUS=PASS
CODEX_UNIT_TEST_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
WORKERS_TEST_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
PROJECT_TYPECHECK_STATUS=NOT_EXECUTED_TIMEOUT
PROJECT_TEST_STATUS=NOT_ATTEMPTED
PROJECT_LINT_STATUS=NOT_ATTEMPTED
PROJECT_BUILD_STATUS=NOT_ATTEMPTED
```

## 12. Scope integrity

```
git diff --stat -- src/lib/worker-registry package.json docs/jarvis
```
```
 package.json                                                  | 309 +++++++----
 src/lib/worker-registry/__tests__/codex-worker.test.ts         | 268 ++++++----
 src/lib/worker-registry/__tests__/three-workers-e2e.ts         |  14 +
 src/lib/worker-registry/adapters/codex-cli.ts                  |  80 ++-
```
`package.json`'s diff (whitespace/escaping reformat, 309 lines) is the **pre-existing** dirty
change identified in §2 and confirmed byte-identical before/after this run — this run made zero
`Edit`/`Write` calls against `package.json`. Actual changes made by this run: `codex-cli.ts`
(+72/−8), `codex-worker.test.ts` (+178/−90, full rewrite of test bodies, same file), and
`three-workers-e2e.ts` (+14/−0, additive guard only). One new file created:
`docs/jarvis/05ZLR_codex_sandbox_repair.md` (this document).

Confirmed untouched by this run (`git diff --name-only` on each, empty output):
`adapters/claude-code.ts`, `adapters/antigravity-cli.ts`, `adapters/antigravity-bridge.ts`,
`__tests__/claude-worker.test.ts`, `__tests__/antigravity-worker.test.ts`,
`__tests__/antigravity-e2e.ts`. `prisma/`, `src/app/api/auth/...`, and the database were all
already in a pre-existing dirty/migrated state at baseline (§2) — none of it was touched by this
run. `git diff --cached` is empty (nothing staged), `.git/index` was not modified by this run.

## 13. Findings

**P0 (1):** The safe-invocation flag set (`--sandbox workspace-write`, `--ask-for-approval never`,
`-` for stdin) is designed against known/documented Codex CLI behavior but was **not confirmed
against the actual installed CLI's `--help` output** in this run, because this sandbox has no
`codex` binary and no access to the Windows host where it's installed. Before this is trusted in
production, run `codex exec --help` on the real host and confirm these exact flags/values exist,
then re-run Stage 10's real E2E.

**P1 (2):**
1. The residual `const code = exitCode ?? 0;` in the non-cancelled/non-timeout branch of
   `execute()` still treats a `null` exit code (e.g., a signal-based kill that isn't routed
   through `cancel()`, such as an external OS-level kill of the child) as exit code `0` →
   `SUCCESS`. The `CANCELLED` fix in this run only covers kills issued via this adapter's own
   `cancel()` method. Recommend mapping `exitCode === null` to a distinct non-success state in a
   follow-up, scoped change.
2. Dynamic proof (vitest, full typecheck, lint, build, real E2E) is outstanding, blocked by
   sandbox tooling/environment limitations described in §10–11, not by the code change itself.

## 14. Final status

Static repair, static scan, and scoped `tsc` type-check are green. Dynamic test/E2E proof is
outstanding due to this session's sandbox limitations (no `codex` binary, no Windows process
access, broken native `rolldown` binding for this platform in the mounted `node_modules`, and a
per-command time budget too short for a full-project `tsc --noEmit`). No commit, no push, no
staging occurred.

## 15. Exact next action

Owner (or an agent running directly on the Windows host with the real `codex` CLI available)
should: (1) run `codex exec --help` and confirm the flags used in §5/§6 against the real
version's supported surface; (2) run `npx vitest run src/lib/worker-registry/__tests__/codex-worker.test.ts`
on that host to get a real pass/fail; (3) run the Stage 10 real sandboxed E2E in
`D:\JARVIS_WORKSPACES\phase05-verification\codex-sandbox-final`; (4) only after all three are
green, decide whether to commit this repair.

---

## Final block

```
CODEX_VERSION=UNKNOWN_NOT_VERIFIABLE_IN_THIS_SANDBOX
CODEX_SUBSCRIPTION_OAUTH_STATUS=UNKNOWN_NOT_VERIFIABLE_IN_THIS_SANDBOX
CODEX_EXECUTION_MODE=NON_INTERACTIVE_SANDBOXED
CODEX_SANDBOX_POLICY=WORKSPACE_WRITE
CODEX_APPROVAL_POLICY=NEVER
CODEX_DANGER_FULL_ACCESS=DISABLED
ACTIVE_CODEX_DANGEROUS_FLAGS_FOUND=0
CODEX_ADAPTER_SAFE_ARGS_STATUS=PASS
CODEX_AUTOMATIC_DANGEROUS_RETRY_STATUS=DISABLED
CODEX_UNIT_TEST_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
WORKERS_TEST_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
CODEX_SANDBOXED_REAL_E2E_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
CODEX_OUTSIDE_WORKSPACE_INTEGRITY_STATUS=NOT_EXECUTED_ENVIRONMENT_LIMITATION
WORKERS_TYPECHECK_STATUS=PASS
PROJECT_TYPECHECK_STATUS=NOT_EXECUTED_TIMEOUT
PROJECT_TEST_STATUS=NOT_ATTEMPTED
PROJECT_LINT_STATUS=NOT_ATTEMPTED
PROJECT_BUILD_STATUS=NOT_ATTEMPTED
CLAUDE_FILES_CHANGED_BY_THIS_RUN=FALSE
ANTIGRAVITY_FILES_CHANGED_BY_THIS_RUN=FALSE
PRISMA_CHANGED_BY_THIS_RUN=FALSE
MIGRATIONS_CHANGED_BY_THIS_RUN=FALSE
AUTH_ROUTE_CHANGED_BY_THIS_RUN=FALSE
GIT_INDEX_CHANGED=FALSE
DATABASE_MODIFIED=FALSE
P0_FINDINGS=1
P1_FINDINGS=2
CODEX_SANDBOX_REPAIR_STATUS=PASS_STATIC_ONLY_DYNAMIC_VERIFICATION_PENDING
PHASE_05_RELEASE_STATUS=REPAIR_VALIDATED_NOT_COMMITTED
NEXT_ALLOWED_ACTION=OWNER_RUNS_DYNAMIC_VERIFICATION_ON_REAL_WINDOWS_HOST_THEN_APPROVES_COMMIT
```

No commit created. No push performed. Phase 06 not started.
