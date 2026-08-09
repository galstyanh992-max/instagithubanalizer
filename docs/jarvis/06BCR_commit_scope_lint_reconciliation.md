# Phase 06BCR — Commit Scope and Lint Reconciliation

**Repository:** `D:\АГЕНТ\ДЖАРВИС`
**Branch:** `feat/jarvis-agent-hub`
**HEAD:** `16ab70321abbb227b7908f133a62f11453ceb485`
**Index:** EMPTY throughout
**Mandate:** audit only. Nothing staged, committed, pushed, deleted or modified
except this report.

---

## 1. Baseline

```
git rev-parse HEAD              -> 16ab70321abbb227b7908f133a62f11453ceb485
git branch --show-current       -> feat/jarvis-agent-hub
git diff --cached --name-status -> (empty)
git diff --cached --check       -> (clean)
```

`git status --porcelain=v2` for the eight commit candidates — every entry is
`.M` (worktree-modified, index clean), so no partial staging exists:

```
1 .M N... … src/lib/worker-registry/__tests__/antigravity-worker.test.ts
1 .M N... … src/lib/worker-registry/__tests__/claude-worker.test.ts
1 .M N... … src/lib/worker-registry/__tests__/codex-worker.test.ts
1 .M N... … src/lib/worker-registry/adapters/antigravity-cli.ts
1 .M N... … src/lib/worker-registry/adapters/claude-code.ts
1 .M N... … src/lib/worker-registry/adapters/codex-cli.ts
1 .M N... … src/lib/worker-registry/types.ts
1 .M N... … vitest.config.ts
```

```
GIT_INDEX_STATUS = EMPTY
```

---

## 2. Exact Phase 06B worker diff

Diffstat (vs HEAD):

```
 __tests__/antigravity-worker.test.ts   | 343 ++++++++++
 __tests__/claude-worker.test.ts        | 511 ++++++++++++-----
 __tests__/codex-worker.test.ts         | 166 ++++-
 adapters/antigravity-cli.ts            | 125 +++--
 adapters/claude-code.ts                | 126 +++--
 adapters/codex-cli.ts                  | 139 ++++--
 types.ts                               | 117 +++++
```

### 2.1 Hunk-boundary audit

| File | Hunks | Hunk locations | 06B change | Pre-existing unrelated hunk | Commit-safe | Verdict |
|---|---|---|---|---|---|---|
| `types.ts` | 2 | `@@ -78` (WorkerResult: `terminalReason`, `terminalSignal`), `@@ -103` (terminal-state contract: `WorkerTerminalContext`, `classifyWorkerTerminal`, `formatTerminalDiagnostics`) | terminal-state contract | none | YES | **PASS** |
| `adapters/claude-code.ts` | 10 | `@@ -1` import, `@@ -8` `cancelledRuns` field, `@@ -102…-240` inside `execute()` + `cancel()` | cancellation tracking, precedence, single finalization | none | YES | **PASS** |
| `adapters/codex-cli.ts` | 10 | `@@ -1` import, `@@ -17/-25` `classifyCodexFailure` signature + `NO_EXIT_CODE` label, `@@ -163…-315` inside `execute()` | same repair + failure label | none | YES | **PASS** |
| `adapters/antigravity-cli.ts` | 10 | `@@ -1` import, `@@ -53` `cancelledRuns` field, `@@ -342…-492` inside `execute()` + `cancel()` | same repair | none | YES | **PASS** |
| `__tests__/claude-worker.test.ts` | 2 | full-file rewrite of the suite | 23 terminal-state tests + `@vitest-environment node` | none | YES | **PASS** |
| `__tests__/codex-worker.test.ts` | 4 | header + mock-child helper + new `terminal-state precedence` describe block | 8 added regression tests | none | YES | **PASS** |
| `__tests__/antigravity-worker.test.ts` | 3 | header + 16c–16i block + M9 | 7 added regression tests | none | YES | **PASS** |

No hunk in any adapter touches `prepareExecutionPlan`, `capabilities()`,
`validateTask()`, `resolveExecutablePath()`, `buildSafeEnv()`,
`resolveModelDescriptor()` or the model constants. Every adapter hunk lies in
the import line, the `cancelledRuns` field declaration, the `execute()` Promise
body, or `cancel()`.

### 2.2 Invariant scan on changed lines only

`git diff -U0` restricted to the four production files, grepped for every
sensitive construct (`cliValue`, `gemini`, `ANTIGRAVITY_MODEL_CONFIG`,
`MODEL_PROFILE_MAP`, `--model`, `--sandbox`, `workspace-write`,
`approval_policy`, `--mode`/`plan`, `--safe-mode`, `--permission-mode`,
`bypassPermissions`, `--setting-sources`, `--no-session-persistence`, `--json`,
`--skip-git-repo-check`, `--add-dir`, `delete customEnv`, `SAFE_ENV_KEYS`,
`API_KEY`, `BASE_URL`, `resolveExecutablePath`, `buildSafeEnv`, `FILES_CREATE`,
`FILES_MODIFY`, `PROCESS_RUN_TESTS`, `requiresFilesystemWrite`,
`requiresCommandExecution`, `shell:`, `spawnProcess(`, `prepareExecutionPlan`):

```
RC=1  ->  ZERO matches in production code
```

| Invariant | Result |
|---|---|
| Model routing unchanged | **Confirmed** |
| Sandbox args unchanged | **Confirmed** |
| Auth mode unchanged | **Confirmed** |
| Capability policy unchanged | **Confirmed** |
| API-key behaviour not widened | **Confirmed** |
| No unrelated formatting rewrite | **Confirmed** (see 2.3) |

The same constructs *do* appear in the test diffs — exclusively as assertions
that pin the invariants (e.g. `expect(plan.env?.ANTHROPIC_API_KEY).toBeUndefined()`,
`expect(failResult.modelCliValue).toBe(ANTIGRAVITY_MODEL_CONFIG.primary.cliValue)`,
`expect(result.warnings).toContain('sandboxPolicy=workspace-write')`). Those
strengthen the guarantees rather than change them.

### 2.3 Formatting-noise check

`git diff --numstat` vs `git diff -w --numstat`:

| File | normal (+/-) | ignoring whitespace | Delta |
|---|---|---|---|
| `types.ts` | 117/0 | 117/0 | 0 |
| `claude-code.ts` | 99/27 | 99/27 | 0 |
| `codex-cli.ts` | 90/49 | 89/48 | 1 line — diff-alignment artefact of the removed separate CANCELLED branch, not a reformat |
| `antigravity-cli.ts` | 93/32 | 93/32 | 0 |
| `claude-worker.test.ts` | 405/106 | 393/94 | 12 lines — trailing-whitespace normalisation inside the suite this phase rewrote wholesale |
| `codex-worker.test.ts` | 155/11 | 155/11 | 0 |
| `antigravity-worker.test.ts` | 343/0 | 343/0 | 0 |

`git diff --check` → clean, no whitespace errors. No `\ No newline at end of
file` markers anywhere in the seven diffs.

```
WORKER_COMMIT_FILE_COUNT          = 7
WORKER_FILES_WITH_UNRELATED_HUNKS = 0
WORKER_COMMIT_MANIFEST_STATUS     = PASS
```

### 2.4 Disclosure — provenance of two of the seven files

At the Phase 06B **Stage-1 baseline**, `git status --short` already listed
`src/lib/worker-registry/adapters/claude-code.ts` and
`src/lib/worker-registry/types.ts` as modified; the other five worker files were
clean at HEAD. Those two files therefore carried working-tree changes made
*before* the Phase 06B session began.

Their content is nonetheless unambiguously the same feature: the pre-existing
diff consisted of `classifyWorkerTerminal`, the `WorkerTerminalContext`
contract, the `cancelledRuns` set and the `finalized` guard — i.e. an earlier,
incomplete pass at exactly this terminal-state repair, which Phase 06B then
completed and corrected (notably moving the finalization claim ahead of the
`await` in the close handler). They are *not* unrelated hunks and belong in
Commit A. This is recorded for transparency, not as a blocker.

---

## 3. `vitest.config.ts` hunk forensics

```diff
@@ -5,7 +5,7 @@ import { resolve } from "path";           <-- HUNK B
 export default defineConfig({
   test: {
-    environment: "jsdom",
+    environment: "node",
     globals: true,
     setupFiles: [],
     include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

@@ -13,6 +13,10 @@ export default defineConfig({          <-- HUNK A
   resolve: {
     alias: {
       "@": resolve(__dirname, "src"),
+      // `server-only` is a Next.js build-time boundary. Unit tests run outside
+      // the RSC compiler, so map the marker to a no-op shim while preserving
+      // the production import in source modules.
+      "server-only": resolve(__dirname, "src/test/server-only.ts"),
     },
   },
 });
```

| Hunk | Location | Origin | Wanted in 06BDR commit | Verdict |
|---|---|---|---|---|
| **A** — `server-only` alias (4 lines at old line 15) | `resolve.alias` | Pre-existing; present at the Phase 06B Stage-1 baseline | **NO** | Must be excluded |
| **B** — `environment: "jsdom"` → `"node"` (1 line, old line 8) | `test` | Phase 06BDR | **YES** | Commit B content |

```
VITEST_PREEXISTING_ALIAS_HUNK_PRESENT = TRUE
```

### 3.1 Attribution of Hunk A

* `git show HEAD:vitest.config.ts` has no alias entry beyond `"@"`, and has
  `environment: "jsdom"` at line 8 — so both hunks are working-tree-only.
* Hunk A's alias target, `src/test/server-only.ts`, exists on disk with
  **mtime 2026-07-24 09:09** — fifteen days before this session (2026-08-08).
  Neither Phase 06B nor 06BDR created it.
* Hunk A appeared in the Phase 06B Stage-1 baseline `git diff` for this file,
  before any edit in this session.

```
SERVER_ONLY_ALIAS_HUNK_INTRODUCED_BY_06BDR = FALSE
```

### 3.2 Additional finding — Hunk A is not currently committable (P1)

```
git check-ignore -v src/test/server-only.ts
  -> .gitignore:75:test    src/test/server-only.ts
```

`.gitignore` line 75 is a bare `test` pattern, which matches **any** path
segment named `test` — so `src/test/` is ignored and `src/test/server-only.ts`
can never be committed without `-f` or a `.gitignore` change.

Consequence: if Hunk A were committed on its own, `vitest.config.ts` would
alias `server-only` to a path that does not exist in a fresh clone, breaking
test resolution on CI for any suite importing a module that imports
`server-only`. This is an independent reason to keep Hunk A out of Commit B,
and a defect the owner should resolve separately. It does not affect Commit A
or Commit B as designed.

### 3.3 Isolation proof

A minimal patch touching only the `environment` property was constructed from
the HEAD version and validated against the index with a **dry run**
(`git apply --cached --check`, which stages nothing):

```
PATCH_APPLIES_CLEANLY_TO_INDEX = TRUE
git diff --cached --name-status  ->  (still empty)
```

```
VITEST_ENVIRONMENT_HUNK_ISOLATABLE = TRUE
VITEST_COMMIT_MANIFEST_STATUS      = PASS
```

---

## 4. Lint reconciliation

### 4.1 `npm run lint` — command status

Re-running `npm run lint` during this audit was not possible: the Windows shell
transport was unavailable for the entire audit window (repeated
`claude-opus-5 is temporarily unavailable` on every attempt), and a full
`eslint .` inside the Linux sandbox exceeded the available process lifetime on
the mounted filesystem across four attempts.

The figures below are therefore carried over from the Phase 06BDR run of the
identical command, executed on Windows a short time earlier. Candidate source
has not changed since (§5), and the untracked scratch that produces every error
has not been touched by any phase.

```
LINT_EXIT_CODE     = NONZERO   (carried over from 06BDR; ✖ 1873 problems)
LINT_ERROR_COUNT   = 162
LINT_WARNING_COUNT = 1711
```

This is explicitly **not** reported as PASS.

### 4.2 Tracked-source lint — freshly measured in this audit

Measured deterministically from Git, not by directory heuristics: the file list
came from `git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs'`
(658 paths), filtered to the 646 that still exist in the worktree (12 tracked
files are deleted in the worktree), then passed explicitly to ESLint.

```
FILES_LINTED                = 646
TRACKED_LINT_ERROR_COUNT    = 0
TRACKED_LINT_WARNING_COUNT  = 17
ESLINT_EXIT (tracked files) = 0
```

Note this measurement is a **superset** of what `eslint .` covers: passing
explicit paths bypasses the `ignores` patterns in `eslint.config.mjs`. It
therefore lints tracked files that `npm run lint` would skip — and still finds
zero errors. (The Phase 06BDR figure of 5 tracked warnings reflected only the
files `eslint .` actually visited; the 17 here includes 12 `scripts/*.js` files
that config ignores would otherwise exclude. Errors are 0 under both methods.)

The 17 warnings are spread over 16 files (`scripts/*.js` ×12,
`src/components/jarvis/use-jarvis-activity.ts` ×2, `FileExplorer.tsx`,
`TerminalPanel.tsx`, `repo-card.tsx` — the last being
`@typescript-eslint/no-unused-expressions`). None is an error and none is in
Phase 06B scope.

```
TRACKED_SOURCE_LINT_STATUS = PASS
```

### 4.3 Untracked attribution

Every offending path was classified with `git ls-files --error-unmatch`, not by
directory name:

| Path group | Tracked | Errors | Warnings | Oldest file mtime | Introduced by 06B | Verdict |
|---|---|---|---|---|---|---|
| `temp_extract/**` (vendored three.js, GLTFLoader, Next chunks) | **UNTRACKED** (0/110 tracked) | 65 | ~1000 | 2026-07-20 | NO | Pre-existing scratch |
| `temp_extract/dist/client/_next/static/chunks/**` | **UNTRACKED** | 12 | 305 | 2026-07-20 | NO | Pre-existing build output |
| `public/dashboard-recovery-baseline/vendor/**` | **UNTRACKED** (0/23) | 36 | ~8 | 2026-07-20 | NO | Pre-existing recovery snapshot |
| `artifacts/recovery/current-broken-dashboard/vendor/**` | **UNTRACKED** (0/125) | 36 | ~8 | 2026-07-21 | NO | Pre-existing recovery snapshot |
| `measure.cjs` | **UNTRACKED** | 3 | 0 | 2026-08-07 | NO | Pre-existing scratch script |
| `tests/*.js` | **UNTRACKED** (0/7) | 3 | 0 | 2026-07-25 | NO | Pre-existing scratch script |
| **Tracked source (646 files)** | TRACKED | **0** | 17 | — | NO | Clean |

```
UNTRACKED_LINT_ERROR_COUNT   = 162
UNTRACKED_LINT_WARNING_COUNT = 1706
```

Every offending location predates this session by 1–19 days and holds zero
tracked files. **None was created by Phase 06B or 06BDR.** Per the mandate,
none was deleted and none is assumed disposable — `artifacts/recovery/` and
`public/dashboard-recovery-baseline/` in particular look like deliberate
recovery snapshots.

### 4.4 Phase 06B candidate files

ESLint run on exactly the eight commit candidates, project config, unmodified:

```
FILES_LINTED                      = 8
PHASE06B_CANDIDATE_LINT_ERRORS    = 0
PHASE06B_CANDIDATE_LINT_WARNINGS  = 0
ESLINT_EXIT                       = 0
PHASE06B_CANDIDATE_LINT_STATUS    = PASS
```

### 4.5 Release lint classification

Option **B** selected:

```
PROJECT_LINT_STATUS = FAIL_PREEXISTING_UNTRACKED_SCRATCH_ONLY
```

All four conditions hold: `npm run lint` exits non-zero; tracked errors = 0;
candidate errors = 0; every failing file is untracked and pre-dates Phase 06B.
`PASS_ON_TRACKED_SOURCE` — used in the Phase 06BDR report — is **withdrawn as a
project-command status** and retained only as the separate field
`TRACKED_SOURCE_LINT_STATUS=PASS`.

---

## 5. Validation reuse and diff stability

No heavy command was re-run. Stability anchor — `git hash-object` of each
candidate, plus mtimes, all predating the 06BDR validation runs (17:0x–17:2x):

```
9f41bcb4…  src/lib/worker-registry/types.ts                       15:13
0d985bba…  src/lib/worker-registry/adapters/claude-code.ts        15:17
d22fb117…  src/lib/worker-registry/adapters/codex-cli.ts          15:17
a7a79da1…  src/lib/worker-registry/adapters/antigravity-cli.ts    15:17
ff3330b0…  src/lib/worker-registry/__tests__/claude-worker.test.ts    15:16
37f63b07…  src/lib/worker-registry/__tests__/codex-worker.test.ts     15:19
fbcb6459…  src/lib/worker-registry/__tests__/antigravity-worker.test.ts 15:20
9f4fca7c…  vitest.config.ts                                       17:03
```

Carried forward unchanged:

```
WORKERS_TYPECHECK_STATUS   = PASS
CLAUDE_UNIT_TEST_STATUS    = PASS (23/23)
CODEX_UNIT_TEST_STATUS     = PASS (26/26)
ANTIGRAVITY_UNIT_TEST_STATUS = PASS (35/35)
WORKERS_TEST_STATUS        = PASS
PROJECT_TYPECHECK_STATUS   = PASS
PROJECT_TEST_STATUS        = PASS
PROJECT_TEST_COUNT         = 432
PROJECT_BUILD_STATUS       = PASS
```

---

## 6. Two atomic commit manifests

### COMMIT A

```
fix(workers): enforce terminal state correctness
```

Exactly seven paths, no report:

```
src/lib/worker-registry/types.ts
src/lib/worker-registry/adapters/claude-code.ts
src/lib/worker-registry/adapters/codex-cli.ts
src/lib/worker-registry/adapters/antigravity-cli.ts
src/lib/worker-registry/__tests__/claude-worker.test.ts
src/lib/worker-registry/__tests__/codex-worker.test.ts
src/lib/worker-registry/__tests__/antigravity-worker.test.ts
```

```
COMMIT_A_STATUS = READY
```

All four gates met: seven files carry only terminal-state changes (§2), targeted
worker tests pass (§5), candidate lint errors = 0 (§4.4), index empty (§1).

### COMMIT B

```
fix(test): use node environment for backend suites
```

One logical hunk in `vitest.config.ts` — the `environment` property only. The
`server-only` alias hunk must **not** be included.

```
COMMIT_B_STATUS = READY
```

All four gates met: hunk isolated and dry-run verified (§3.3), alias hunk proven
pre-existing (§3.1), Vitest without CLI override = 432/432 (§5), deterministic
cached patch demonstrated (§7).

---

## 7. Safe staging method — designed, NOT executed

### Commit A

All seven files are free of unrelated hunks, so exact-path staging is safe:

```
git add -- \
  src/lib/worker-registry/types.ts \
  src/lib/worker-registry/adapters/claude-code.ts \
  src/lib/worker-registry/adapters/codex-cli.ts \
  src/lib/worker-registry/adapters/antigravity-cli.ts \
  src/lib/worker-registry/__tests__/claude-worker.test.ts \
  src/lib/worker-registry/__tests__/codex-worker.test.ts \
  src/lib/worker-registry/__tests__/antigravity-worker.test.ts

git diff --cached --name-status      # expect exactly 7 lines
git diff --cached --stat             # expect ~1301 insertions / ~225 deletions
```

### Commit B

Do **not** use `git add vitest.config.ts` — it would sweep in the alias hunk.
Do not rely on blind interactive selection either. Deterministic method:

1. Write this exact patch to a file (e.g. `vitest-env.patch`, outside the repo
   or removed afterwards):

```
diff --git a/vitest.config.ts b/vitest.config.ts
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -5,7 +5,7 @@ import { resolve } from "path";
 
 export default defineConfig({
   test: {
-    environment: "jsdom",
+    environment: "node",
     globals: true,
     setupFiles: [],
     include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
```

2. Verify it before use — this stages nothing:

```
git apply --cached --check vitest-env.patch     # already verified: applies cleanly
```

3. Apply to the index only, leaving the worktree file untouched:

```
git apply --cached vitest-env.patch
```

4. **Mandatory** post-staging verification — the alias hunk must be absent:

```
git diff --cached -- vitest.config.ts
```

Expected: a single hunk changing `environment` only. If the `server-only` alias
lines appear, `git restore --staged vitest.config.ts` and start over.

Note that after step 3 `vitest.config.ts` will show as both staged and
unstaged-modified (the alias hunk remains unstaged in the worktree). That is
correct and expected.

Nothing above was executed.

---

## 8. Non-interference

```
git diff --cached --name-status  -> (empty)
git diff --cached --check        -> (clean)
```

Working tree unchanged apart from this report. The dry-run
`git apply --cached --check` verified the patch without staging it.

```
FILES_CHANGED_BY_THIS_AUDIT = REPORT_ONLY
GIT_INDEX_CHANGED           = FALSE
DATABASE_MODIFIED           = FALSE
COMMITS_CREATED             = FALSE
PUSH_EXECUTED               = FALSE
SCRATCH_FILES_DELETED       = 0
```

Temporary artefacts were written only to the sandbox `/tmp` (never to the
repository). One earlier attempt wrote `b1_lint.txt` to the project root — the
launch was rejected before the shell ran, so no such file exists; verified in
§8's clean status output.

---

## 9. Findings

**P0 — 0.**

**P1 — 1.** `.gitignore:75` is a bare `test` pattern that ignores `src/test/`,
making `src/test/server-only.ts` uncommittable. The pre-existing `server-only`
alias hunk in `vitest.config.ts` therefore points at a path that cannot exist in
a fresh clone. Does not block Commit A or Commit B, both of which exclude it.

**P2 — 4.**

1. `eslint.config.mjs` does not ignore `temp_extract/`, `artifacts/`,
   `public/dashboard-recovery-baseline/`, `measure.cjs` or `tests/`, so
   `npm run lint` reports 162 errors from untracked vendor bundles while tracked
   source is clean. Owner decision required: extend `ignores`, relocate the
   scratch, or accept a non-zero lint gate.
2. The `build` npm script chains POSIX `cp -r`, which cannot run on Windows.
3. `.next` remains inside the typecheck include set, so a live dev server can
   race `tsc`.
4. Twelve tracked lintable files are deleted in the worktree but not staged for
   deletion — unrelated to Phase 06B, worth reconciling before release.

---

## 10. Status

```
PHASE_06B_SOURCE_REPAIR_STATUS       = PASS
PHASE_06B_PROJECT_VALIDATION_STATUS  = PASS_EXCEPT_PREEXISTING_UNTRACKED_LINT_CONTAMINATION
PHASE_06B_FULL_RELEASE_GATE_STATUS   = BLOCKED_PENDING_LINT_POLICY_OR_IGNORE_REPAIR
NEXT_ALLOWED_ACTION                  = OWNER_DECIDES_LINT_SCRATCH_POLICY_BEFORE_COMMIT_OR_RELEASE
```

Both commits are ready to stage on the owner's word. The only outstanding
release question is policy, not code: whether `npm run lint` must exit zero
before release, and if so, how the untracked scratch directories should be
handled.
