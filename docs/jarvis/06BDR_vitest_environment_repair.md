# Phase 06BDR — Vitest Environment Repair (one-line fix)

**Repository:** `D:\АГЕНТ\ДЖАРВИС`
**Branch:** `feat/jarvis-agent-hub`
**HEAD:** `16ab70321abbb227b7908f133a62f11453ceb485` (unchanged)
**Index:** EMPTY throughout
**Commit:** NONE. **Push:** NONE. **Dev server:** left running. **`.next`:** untouched.

---

## 1. Baseline

```
git rev-parse HEAD              -> 16ab70321abbb227b7908f133a62f11453ceb485
git diff --cached --name-status -> (empty)   INDEX = EMPTY
```

Pre-existing Phase 06B working-tree manifest present and untouched (7 files
under `src/lib/worker-registry/`).

---

## 2. The change

Exactly one line, in exactly one file:

```diff
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

`git diff -- vitest.config.ts` shows a second hunk (the `server-only` resolve
alias). That hunk is **not** from this run — it was already present in the
working tree at the Phase 06B Stage-1 baseline and is reproduced here only
because `git diff` compares against HEAD, not against the pre-run working tree.

```
VITEST_CONFIG_SCOPE_STATUS = PASS
```

Rationale (established in 06BD, not re-litigated here): the repository contains
**0** DOM test suites — no `.test.tsx`, and no test references
`document`, `window`, `localStorage`, `navigator` or `@testing-library`. The
global `jsdom` environment caused Vite to externalise Node built-ins into an
invalid bare `node:` specifier, aborting 25 backend suites before collection.

---

## 3. Verification without CLI override

`npx vitest run` — **no `--environment` flag**, config only:

```
Test Files  59 passed (59)
     Tests  432 passed (432)
VITEST_EXIT=0
```

The result previously obtainable only via a CLI override is now the config
default.

| | Before (jsdom) | After (node) |
|---|---|---|
| Test files | 26 passed / **33 failed** | **59 passed / 0 failed** |
| Tests | 274 passed / 9 failed (283 collected) | **432 passed / 0 failed** |
| Exit code | non-zero | **0** |

The +149 tests are those inside the 25 suites that never got collected under
jsdom.

```
VITEST_TEST_FILE_COUNT    = 59
VITEST_TEST_COUNT         = 432
VITEST_TEST_FAILURE_COUNT = 0
VITEST_TEST_STATUS        = PASS
```

---

## 4. Phase 06B worker re-verification

| Check | Result |
|---|---|
| `npm run workers:typecheck` | **PASS** |
| `vitest run …/claude-worker.test.ts` | **PASS** — 23/23 |
| `vitest run …/codex-worker.test.ts` | **PASS** — 26/26 |
| `vitest run …/antigravity-worker.test.ts` | **PASS** — 35/35 |
| `npm run workers:test` | **PASS** — 35/35, exit 0 |

All 84 worker terminal-state tests pass. The three suites carry
`// @vitest-environment node` docblocks, which were already authoritative for
them; the config change does not alter their behaviour — it extends the same
environment to the other 56 suites.

---

## 5. False-success recheck

```
git grep -n -E "exitCode\s*\?\?\s*0|exitCode\s*\|\|\s*0|code\s*\?\?\s*0|code\s*\|\|\s*0" \
  -- "src/lib/worker-registry"
```

→ **no matches** (`rc=1`).

```
ACTIVE_NULL_EXIT_TO_SUCCESS_COERCIONS_FOUND = 0
```

Structural confirmation across the three adapters:

| Adapter | `classifyWorkerTerminal(` | `claimTerminal()` | `cancelledRuns` |
|---|---|---|---|
| `claude-code.ts` | 2 | 3 | 4 |
| `codex-cli.ts` | 2 | 3 | 4 |
| `antigravity-cli.ts` | 2 | 3 | 4 |

Each adapter routes both terminal handlers (`close`, `error`) through the shared
precedence classifier, claims finalization synchronously in all three sites
(guard + 2 handlers), and tracks owner cancellation explicitly.

```
CLAUDE_CANCELLATION_STATUS      = PASS
CODEX_CANCELLATION_STATUS       = PASS
ANTIGRAVITY_CANCELLATION_STATUS = PASS
CLAUDE_NULL_EXIT_STATUS         = PASS
CODEX_NULL_EXIT_STATUS          = PASS
ANTIGRAVITY_NULL_EXIT_STATUS    = PASS
SINGLE_FINALIZATION_STATUS      = PASS
```

---

## 6. Full project validation

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** — 0 errors |
| `npm test` | **PASS** — 59/59 files, 432/432 tests, exit 0 |
| `npm run lint` | see §6.1 — **0 errors in tracked source**, 162 errors in untracked scratch |
| `npx next build` | **PASS** — compiled in 61s, 102/102 static pages, exit 0 |

```
PROJECT_TYPECHECK_STATUS = PASS
PROJECT_TEST_STATUS      = PASS
PROJECT_TEST_COUNT       = 432   (matches the 06BD projection exactly)
PROJECT_BUILD_STATUS     = PASS
```

### 6.1 Lint — correction to the Phase 06B report

**The Phase 06B report stated `PROJECT_LINT_STATUS=PASS`. That was wrong.** In
that run the lint output was inspected with a `tail` that showed only Babel
deoptimisation notices; the ESLint summary line was never read. Corrected here
with a full JSON-formatted run and a per-file tracked/untracked split:

```
✖ 1873 problems (162 errors, 1711 warnings)

TRACKED (git-versioned) files : 0 errors, 5 warnings
UNTRACKED files              : 162 errors, 1706 warnings
```

Every one of the 162 errors originates in untracked scratch, recovery and
vendor bundles that ESLint is walking because they are not in
`eslint.config.mjs`'s ignore list:

| Location | Errors | Tracked? |
|---|---|---|
| `temp_extract/**` (vendored three.js, GLTFLoader, Next chunks) | 65 | untracked |
| `public/dashboard-recovery-baseline/vendor/**` | 36 | untracked |
| `artifacts/recovery/current-broken-dashboard/vendor/**` | 36 | untracked |
| `temp_extract/dist/client/_next/static/chunks/**` | 12 | untracked |
| `measure.cjs` | 3 | untracked |
| `tests/capture-sidebar.js`, `tests/test-path.js` | 3 | untracked |

Scope check:

```
worker-registry / vitest.config problems -> (none)
tracked files with errors                -> (none)
```

**Phase 06B and 06BDR contribute zero lint problems.** All six offending
locations were already untracked and present at the Phase 06B Stage-1 baseline.

Remediation would mean extending the `ignores` array in `eslint.config.mjs` (or
removing the scratch directories) — neither is permitted by this run's scope,
which allows changes to `vitest.config.ts` only. Logged as P2.

```
PROJECT_LINT_STATUS = PASS_ON_TRACKED_SOURCE / FAIL_ON_UNTRACKED_SCRATCH (pre-existing, out of scope)
```

### 6.2 `npm run build` script portability (unchanged, pre-existing)

```json
"build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
```

`cp` is a POSIX command and does not exist in Windows `cmd`/PowerShell, so the
two post-build copy steps cannot run on this machine. `npx next build` — the
part that compiles and type-checks — exits 0. Fixing this requires editing
`package.json`, which is forbidden here. Logged as P2, unchanged from 06BD.

---

## 7. Scope check

```
git diff --cached --name-status -> (empty)
git diff --cached --check       -> (clean)
```

Changed **by this 6BDR run**:

```
M  vitest.config.ts                                    (one line: jsdom -> node)
?? docs/jarvis/06BDR_vitest_environment_repair.md      (this report, untracked)
```

Everything else in `git status` — the 7 Phase 06B worker files, `package.json`,
`package-lock.json`, all `prisma/` entries and the untracked scratch — was
already in that state before this run.

```
WORKER_FILES_CHANGED_BY_THIS_RUN  = FALSE
PACKAGE_FILES_CHANGED_BY_THIS_RUN = FALSE
PRISMA_CHANGED_BY_THIS_RUN        = FALSE
DATABASE_MODIFIED                 = FALSE
GIT_INDEX_CHANGED                 = FALSE
PROCESSES_TERMINATED              = 0
NEXT_DIRECTORY_TOUCHED            = FALSE
```

Six temporary log files created during measurement (`r1_vitest.txt`,
`r2_workers.txt`, `r3_test.txt`, `r4_lint.txt`, `r5_build.txt`, `r6_lint.json`
and companions) were deleted; no residue remains.

---

## 8. Findings

**P0 — 0.**

**P1 — 0.** The Vitest environment blocker is resolved: the whole suite passes
from configuration alone, with no CLI override and no test-file edits.

**P2 — 3 (all pre-existing, all out of this run's scope).**

1. `eslint.config.mjs` does not ignore `temp_extract/`, `artifacts/`,
   `public/dashboard-recovery-baseline/`, `measure.cjs` or `tests/`, so
   `npm run lint` reports 162 errors from untracked vendor bundles while
   tracked source is clean. Recommend extending the `ignores` array.
2. The `build` npm script chains POSIX `cp -r`, which cannot run on Windows.
   `next build` itself is unaffected.
3. `.next` remains inside the typecheck include set, so a live dev server can in
   principle race `tsc` again (observed once during Phase 06B, not reproducible
   since). Recommend excluding `.next` from `tsconfig.json`'s include.

Also corrected in this report: the Phase 06B lint result, which was reported as
PASS on incomplete evidence (§6.1).

---

## 9. Status

```
VITEST_ENVIRONMENT_REPAIR_STATUS      = PASS
PHASE_06B_VALIDATION_BLOCKER_RESOLVED = TRUE
PHASE_06B_STATUS                      = PASS_REPAIRED_NOT_COMMITTED
NEXT_ALLOWED_ACTION                   = OWNER_REVIEWS_PHASE_06B_COMMIT_MANIFEST
```

### Proposed commit manifest for owner review

Phase 06B — worker terminal-state correctness repair (7 files):

```
src/lib/worker-registry/types.ts
src/lib/worker-registry/adapters/claude-code.ts
src/lib/worker-registry/adapters/codex-cli.ts
src/lib/worker-registry/adapters/antigravity-cli.ts
src/lib/worker-registry/__tests__/claude-worker.test.ts
src/lib/worker-registry/__tests__/codex-worker.test.ts
src/lib/worker-registry/__tests__/antigravity-worker.test.ts
```

Phase 06BDR — test environment repair (1 file):

```
vitest.config.ts        (environment: "jsdom" -> "node")
```

Reports (untracked, include or omit at the owner's discretion):

```
docs/jarvis/06B_worker_terminal_state_repair.md
docs/jarvis/06BD_validation_environment_diagnostic.md
docs/jarvis/06BDR_vitest_environment_repair.md
```

Caution for whoever stages this: `vitest.config.ts` also carries a
pre-existing `server-only` alias hunk from before Phase 06B. Staging the file
wholesale includes that hunk. Use `git add -p` if only the environment line
should go into the Phase 06BDR commit.

Nothing was staged, committed or pushed.
