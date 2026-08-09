# Phase 06B — Worker Terminal-State Correctness Repair

**Repository:** `D:\АГЕНТ\ДЖАРВИС`
**Branch:** `feat/jarvis-agent-hub`
**HEAD at repair:** `16ab70321abbb227b7908f133a62f11453ceb485`
**Index at start:** EMPTY (verified)
**Commit created:** NO — no `git add`, no commit, no push, no database or Prisma change.

---

## 1. Objective

Guarantee that no CLI worker adapter can report `SUCCESS` unless the child
process genuinely terminated with a confirmed exit code of strictly `0`, with
no cancellation, no timeout and no spawn error.

---

## 2. Forensic audit — baseline (HEAD `16ab703`)

| Adapter | Cancel tracked | Timeout tracked | Spawn error tracked | Null exit handling | Double-finalize guard | **False-success reachable** |
|---|---|---|---|---|---|---|
| `claude-code.ts` | **NO** — `cancel()` only killed the process; no cancellation state | YES (`isTimedOut`) | YES (`error` handler) | **`exitCode ?? 0`** → null became `0` | **NO** | **YES** |
| `codex-cli.ts` | YES (`cancelledRuns`) but ranked *after* timeout | YES | YES | **`exitCode ?? 0`** → null became `0` | **NO** | **YES** |
| `antigravity-cli.ts` | **NO** — `CANCELLED` was *inferred* from `signal === 'SIGTERM'` | YES | YES | `exitCode ?? 0`, downgraded to `-1` **only when a signal was present** | **NO** | **YES** |

### 2.1 Reachable false-success paths (proven, pre-repair)

**Claude — P0, the primary reported defect.**
`cancel(runId)` sent `SIGTERM` and removed the run from `activeProcesses`, but
recorded nothing. The `close` handler then ran
`const code = exitCode ?? 0`. A `SIGTERM`-terminated process closes with
`exitCode === null`, so `code` became `0` and the run was classified
`SUCCESS`. **A cancelled Claude run reported success.**

The same coercion also made these paths report `SUCCESS`:
* any signal-only close (external `SIGKILL`/`SIGTERM`);
* the adapter's own `child.kill('SIGKILL')` on the 1 MB stdout truncation
  guard, which sets neither the timeout nor the cancellation flag.

**Codex — P0.**
Timeout and cancellation were ranked correctly relative to each other, but the
fall-through path used `exitCode ?? 0`. A close with `exitCode === null` that
was neither cancelled nor timed out (external kill, or the adapter's own
stdout-truncation `SIGKILL`) produced `code = 0` → `SUCCESS`.

**Antigravity — P0.**
`let code = exitCode ?? 0; if (exitCode === null && signal) code = -1;`
The `-1` downgrade applied **only when a signal was reported**. A close with
`exitCode === null` **and** `signal === null` produced `code = 0` → `SUCCESS`.
Additionally, cancellation was inferred from the OS signal, so an *external*
`SIGTERM` was misreported as `CANCELLED` while an owner `cancel()` that
produced no signal would not have been.

### 2.2 Secondary defects found

* **No single-finalization guard in any adapter.** `close` and `error` could
  both run their full bodies. Ordering determined the outcome by accident.
* **Claude cancellation had no precedence at all** — a cancelled run that later
  timed out reported `TIMEOUT`.
* **Codex ranked `TIMEOUT` above `CANCELLED`**, contrary to the required
  precedence.
* **Timers were cleared only on the happy path**, so a run finalized by
  `error` left the timeout timer armed.

---

## 3. Terminal-state precedence contract

Implemented once, in `src/lib/worker-registry/types.ts`, and consumed by all
three adapters:

```ts
export interface WorkerTerminalContext {
  cancelRequested: boolean;
  timedOut: boolean;
  spawnError?: Error | null;
  exitCode: number | null | undefined;
  signal: NodeJS.Signals | string | null | undefined;
}

classifyWorkerTerminal(ctx) =>
  1. cancelRequested            -> CANCELLED (CANCELLED_BY_OWNER,  exitCode -1)
  2. timedOut                   -> TIMEOUT   (TIMED_OUT,           exitCode -1)
  3. spawnError                 -> FAILED    (SPAWN_ERROR,         exitCode -1)
  4. exit code null/undefined   -> FAILED    (NO_EXIT_CODE,        exitCode -1)
  5. exit code !== 0            -> FAILED    (NON_ZERO_EXIT_CODE,  real code)
  6. exit code === 0            -> SUCCESS   (EXIT_CODE_ZERO,      0)
```

Key properties:

* `undefined` is normalised to *absent*, exactly like `null` — never to `0`.
  A non-finite number is likewise treated as absent.
* A signal-only close carries no exit code, so it can only reach rule 4.
* Rule 6 is the **single** place in the whole package that produces `SUCCESS`,
  and it is guarded by a strict `=== 0` check.

### 3.1 Structured diagnostics

`formatTerminalDiagnostics()` emits non-secret `key=value` strings onto
`WorkerResult.warnings`:

```
terminalReason=<REASON>
exitCode=<n|null>
signal=<name|null>
cancelRequested=<bool>
timedOut=<bool>
```

`WorkerResult` also gained `terminalReason` and `terminalSignal`. No
credentials, tokens, env values or command arguments are included.

---

## 4. Single-finalization guarantee

Each adapter now uses a two-step protocol:

```ts
claimTerminal(): boolean   // synchronous: sets the guard, clears the timer,
                           // deregisters the process. First caller wins.
settle(result): void       // releases cancellation bookkeeping, resolves once.
```

`claimTerminal()` is called **synchronously at the very top of every terminal
handler, before any `await`.**

> This ordering was not cosmetic. The first implementation claimed the guard
> only after the `close` handler's `await this.normalizeResult(...)`. The new
> test *"close followed by a late error keeps the original terminal result"*
> caught it: an `error` arriving inside that await window ran to completion and
> overwrote an already-decided `FAILED (exit 2)` with `SPAWN_ERROR`. The guard
> was moved ahead of the await and the test now passes.

Guaranteed behaviours (all covered by tests):

* the Promise resolves exactly once;
* a timeout after cancellation does not change the result;
* a close after an error does not change the result;
* an error after a close does not change the result;
* a repeated `cancel()` for a finished run is a no-op returning `false`;
* the timeout timer is cleared on every terminal path, and the timer callback
  itself re-checks the guard before firing;
* cancellation bookkeeping is released, so a later run reusing the same
  `runId` is not affected.

---

## 5. Per-adapter changes

### 5.1 `adapters/claude-code.ts` (primary repair)

* Added `cancelledRuns: Set<string>`; `cancel()` records the run **before**
  `kill('SIGTERM')`.
* Removed the `exitCode ?? 0` coercion entirely.
* `close` and `error` both delegate to `classifyWorkerTerminal`.
* Spawn error is terminal on its own and always `FAILED`.
* Cancel / timeout short-circuit before the workspace file scan.
* Emits `terminalReason`, `terminalSignal` and structured diagnostics.

### 5.2 `adapters/codex-cli.ts`

Modified — the forensic audit proved a reachable false-success path, which is
the condition under which this file was in scope.

* Removed `exitCode ?? 0`.
* Cancellation now correctly outranks timeout (shared classifier).
* Added `claimTerminal` / `settle`.
* Added a `CODEX_NO_EXIT_CODE:` failure label so a missing exit code is not
  mislabelled as a non-zero exit.

**Unchanged:** `codex exec` args, `--sandbox workspace-write`,
`-c approval_policy="never"`, `--json`, `--skip-git-repo-check`, the stdin `-`
sentinel, `shell: false`, the `OPENAI_API_KEY` / `CODEX_API_KEY` strip, and the
`CODEX_SANDBOX_DIAGNOSTICS` fail-closed labels. No retry behaviour was added.

### 5.3 `adapters/antigravity-cli.ts`

Modified — the forensic audit proved a reachable false-success path.

* Removed `exitCode ?? 0`.
* Added `cancelledRuns`; `cancel()` records the run before `kill('SIGTERM')`.
* Cancellation is now **tracked explicitly, never inferred from the OS
  signal**. An external `SIGTERM` with no owner cancel is now `FAILED`
  (`NO_EXIT_CODE`), not `CANCELLED`.
* Added `claimTerminal` / `settle`.
* Model routing diagnostics are still spread onto **every** result, including
  `FAILED`, `TIMEOUT` and `CANCELLED`.

**Unchanged:** `ANTIGRAVITY_MODEL_CONFIG` (`gemini-3.1-pro-high`,
`gemini-3.6-flash-medium`), `MODEL_PROFILE_MAP`, `--add-dir / --mode plan /
--model / -p` args, `resolveExecutablePath()`, `buildSafeEnv()` allow-list,
`READ_ONLY_FAIL_CLOSED` capability policy, `shell: false`.

---

## 6. Tests

### 6.1 Pre-existing blocker found and fixed inside scope

At baseline, `claude-worker.test.ts`, `codex-worker.test.ts` and
`antigravity-worker.test.ts` **all failed to load**:

```
Error: No such built-in module: node:
```

`vitest.config.ts` sets `environment: "jsdom"` globally, which externalises
Node built-ins. Under the installed Vitest `4.1.9` this aborts the whole suite
before a single test runs — so the worker suites were reporting nothing at all.
A `// @vitest-environment node` docblock was added to each of the three files.
`vitest.config.ts` itself was **not** modified (out of scope).

### 6.2 `claude-worker.test.ts` — 23 tests, all passing

Mock lifecycle is realistic: `kill()` never resolves anything by itself; the
terminal `close` event is delivered asynchronously via `queueMicrotask` or an
explicit emit, mirroring the OS. No fake timers, no hangs.

| # | Requirement | Result |
|---|---|---|
| 1 | exit code 0 → SUCCESS | PASS |
| 2 | non-zero exit → FAILED | PASS |
| 3 | null exit without cancellation → FAILED | PASS |
| 4 | signal-only close → FAILED | PASS |
| 5 | spawn error → FAILED | PASS |
| 6 | timeout → TIMEOUT (+ `SIGKILL` actually sent) | PASS |
| 7 | cancellation → CANCELLED | PASS |
| 8 | cancellation + `close(null, SIGTERM)` → CANCELLED | PASS |
| 9 | cancellation + later timeout → CANCELLED | PASS |
| 10 | timeout + later `close(0)` → TIMEOUT | PASS |
| 11 | duplicate close → one terminal result | PASS |
| 12 | error then close → one FAILED result | PASS |
| 12b | close then late error → original result kept | PASS |
| 13 | cancellation bookkeeping released for later runs | PASS |
| 14 | timeout timer cleared after finalization | PASS |
| 15 | no API-key fallback (`ANTHROPIC_API_KEY` / `CLAUDE_API_KEY` / `ANTHROPIC_BASE_URL` stripped) | PASS |
| 16 | `shell: false` + trusted executable + exact args | PASS |
| 17 | stdin closed with EOF | PASS |
| 18 | SUCCESS not hardcoded (8-case exit/signal matrix) | PASS |
| 18b | diagnostics emitted, no secrets | PASS |

### 6.3 `codex-worker.test.ts` — 26 tests, all passing

Existing coverage retained (args, sandbox policy, no dangerous retry,
stdin-only prompt, cancellation, timeout). Added: null-exit → FAILED,
signal-only → FAILED, strict exit-0 gate matrix, cancel-then-timeout,
timeout-then-close(0), duplicate close, error-then-close, diagnostics.

### 6.4 `antigravity-worker.test.ts` — 35 tests, all passing

Existing coverage retained (model routing, read-only policy, env sanitisation,
workspace escape, capability denial). Added: null-exit → FAILED, signal-only →
FAILED, external `SIGTERM` without cancel → FAILED, cancel-then-timeout,
timeout-then-close(0), duplicate close, strict exit-0 gate matrix, and model
diagnostics preserved across FAILED / TIMEOUT / CANCELLED.

---

## 7. Static false-success scan

```
git grep -n -E "exitCode\s*\?\?\s*0|exitCode\s*\|\|\s*0|code\s*\?\?\s*0|code\s*\|\|\s*0" \
  -- "src/lib/worker-registry"
```

→ **no matches.**

```
ACTIVE_NULL_EXIT_TO_SUCCESS_COERCIONS_FOUND = 0
```

```
git grep -n -E "status:\s*['\"]SUCCESS['\"]|status\s*=\s*['\"]SUCCESS['\"]" \
  -- "src/lib/worker-registry"
```

→ two matches, both **type declarations** in `types.ts` (lines 68 and 143), not
assignments. The only value-level `SUCCESS` production in the package is
`types.ts:203`, `build('SUCCESS', 'EXIT_CODE_ZERO', 0)`, reachable only after
rules 1–5 have all been passed and `rawExitCode === 0`. Every adapter obtains
its status from `classification.status`; none constructs `SUCCESS` directly.

---

## 8. Validation

### 8.1 Targeted (in scope) — all PASS

| Check | Result |
|---|---|
| `npm run workers:typecheck` | PASS (exit 0) |
| `vitest run …/claude-worker.test.ts` | PASS — 23/23 |
| `vitest run …/codex-worker.test.ts` | PASS — 26/26 |
| `vitest run …/antigravity-worker.test.ts` | PASS — 35/35 |
| `npm run workers:test` | PASS (exit 0) |

### 8.2 Real-CLI E2E

`REAL_CLI_E2E_REQUIRED = FALSE`.

The production spawn contract is unchanged: identical command, identical args,
identical env sanitisation, identical `shell: false`, identical sandbox / model
/ auth configuration for all three adapters. The repair is confined to
post-termination classification, and the unit tests model real process events
(async close after kill, signal-only close, duplicate events, ordering races).
No E2E was run.

### 8.3 Full project — FAIL, for pre-existing reasons outside this scope

| Check | Result |
|---|---|
| `npm run typecheck` | **FAIL** — 1 error, in a generated artifact |
| `npm test` | **FAIL** — 33 failed test files / 9 failed tests |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run build` | **FAIL** — same generated artifact |

**Typecheck / build failure** — a single error, in a git-ignored generated file:

```
.next/dev/types/validator.ts(1611,18): Type error: Cannot find name '__IsExpected'.
```

`.next/` is git-ignored (`.gitignore:17`). The file is emitted by a Next.js dev
server that is currently running and holding the file open — its mtime advanced
during this session without any source change, and it could not be removed
(`Operation not permitted`). No source file produced a type error. The dev
server was deliberately **not** killed.

**Test failure** — project-wide, and the same root cause as §6.1:

```
Error: No such built-in module: node:
```

25 suites abort at import, in `command-router`, `safety`, `daemon`,
`local-control`, `telegram`, `phone-bridge`, `mcp-bridge`, `codex-subscription`
and others; the 9 individual failures are downstream of the aborted
`command-router` suite. All are files untouched by Phase 06B, caused by the
global `environment: "jsdom"` setting in `vitest.config.ts` under Vitest
`4.1.9`. The fix — either flipping the default environment or adding
`// @vitest-environment node` docblocks project-wide — requires editing
`vitest.config.ts` and ~25 test files outside the Phase 06B scope, so it was
**not** attempted here.

All three worker-registry suites pass inside the full `npm test` run
(23 + 26 + 35 = 84 tests).

---

## 9. Change-scope audit

Files modified by this run (7 source/test + this report):

```
src/lib/worker-registry/types.ts
src/lib/worker-registry/adapters/claude-code.ts
src/lib/worker-registry/adapters/codex-cli.ts
src/lib/worker-registry/adapters/antigravity-cli.ts
src/lib/worker-registry/__tests__/claude-worker.test.ts
src/lib/worker-registry/__tests__/codex-worker.test.ts
src/lib/worker-registry/__tests__/antigravity-worker.test.ts
docs/jarvis/06B_worker_terminal_state_repair.md   (new, untracked)
```

Every other entry in `git status` was already present in the working tree at
the Stage-1 baseline and was not touched.

| Assertion | Value |
|---|---|
| `CODEX_INVOCATION_CHANGED_BY_THIS_RUN` | FALSE |
| `CLAUDE_INVOCATION_CHANGED_BY_THIS_RUN` | FALSE |
| `ANTIGRAVITY_INVOCATION_CHANGED_BY_THIS_RUN` | FALSE |
| `MODEL_ROUTING_CHANGED_BY_THIS_RUN` | FALSE |
| `SANDBOX_POLICY_CHANGED_BY_THIS_RUN` | FALSE |
| `PRISMA_CHANGED_BY_THIS_RUN` | FALSE |
| `DATABASE_MODIFIED` | FALSE |
| `GIT_INDEX_CHANGED` | FALSE (index empty throughout) |
| Task state machine / API routes / UI changed | NO |
| `package.json` / `package-lock.json` changed | NO |
| `npm install` executed | NO |
| Commit / push performed | NO |

Two temporary log files created during validation (`lint_06b.txt`,
`build_06b.txt`) were deleted; no residue remains.

---

## 10. Findings

**P0 — 0 open.** Three P0 false-success defects were found and repaired
(Claude, Codex, Antigravity). All are covered by regression tests.

**P1 — 0 open.** Four P1 lifecycle defects were found and repaired: missing
single-finalization guards, incorrect Codex cancel/timeout precedence, absent
Claude cancellation precedence, and leaked timeout timers. One further P1 —
the async-window finalization race — was introduced during the repair, caught
by the new tests, and fixed before completion.

**P2 — 2 open, both outside Phase 06B scope and pre-existing:**

1. `vitest.config.ts` sets `environment: "jsdom"` globally, aborting ~25 Node
   test suites at import under Vitest 4.1.9. Recommended: switch the default to
   `node` and opt individual DOM suites into `jsdom`.
2. A stale `.next/dev/types/validator.ts` from a running dev server breaks
   `npm run typecheck` and `npm run build`. Recommended: stop the dev server and
   remove `.next/dev`.

Neither is caused by, nor blocks, the terminal-state repair — but both block a
clean full-project gate, so this phase is reported as **BLOCKED**, not PASS.

---

## 11. Status

```
PHASE_06B_REPAIR_STATUS = BLOCKED
PHASE_06_STATUS         = BLOCKED
NEXT_ALLOWED_ACTION     = RUN_TARGETED_WORKER_LIFECYCLE_DIAGNOSTIC
```

The worker terminal-state repair itself is complete and fully validated within
its own scope. The block is a project-level validation gate (§8.3), not a
worker-lifecycle defect. No commit was created; no push was performed.
