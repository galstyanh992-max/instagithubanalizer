# Phase 06BD — Targeted Validation Environment Diagnostic

**Repository:** `D:\АГЕНТ\ДЖАРВИС`
**Branch:** `feat/jarvis-agent-hub`
**HEAD:** `16ab70321abbb227b7908f133a62f11453ceb485`
**Index:** EMPTY throughout
**Mandate:** diagnose only. No production code, no worker code, no worker tests,
no config, no dependency install, no commit, no push, no process killed.

---

## 0. Headline result

**Both Phase 06B blockers are environmental, pre-existing, and now precisely
characterised. Neither was introduced by Phase 06B. Both are already resolved
or resolvable without touching any source file.**

| Blocker | Verdict |
|---|---|
| 1. `.next/dev/types/validator.ts` breaking typecheck/build | **Transient read-during-write race** against the owner's live dev server. **Already clears on re-run — typecheck and `next build` both now exit 0.** |
| 2. Project-wide Vitest failures | **Single-line config defect**: `environment: "jsdom"` is applied globally, but **zero suites in this repo need a DOM**. Under `--environment node`, **all 59 files / 432 tests pass**. |

The Phase 06B report's estimate that fixing blocker 2 requires editing
`vitest.config.ts` plus ~25 test files is **corrected here**: a one-line change
to `vitest.config.ts` is sufficient and no test file needs to change.

---

## 1. Baseline

```
git rev-parse --show-toplevel  -> /…/АГЕНТ/ДЖАРВИС
git branch --show-current      -> feat/jarvis-agent-hub
git rev-parse HEAD             -> 16ab70321abbb227b7908f133a62f11453ceb485
git diff --cached --name-status -> (empty)  INDEX=EMPTY
```

Phase 06B working-tree manifest, confirmed present and **untouched by this
diagnostic**:

```
M  src/lib/worker-registry/types.ts
M  src/lib/worker-registry/adapters/claude-code.ts
M  src/lib/worker-registry/adapters/codex-cli.ts
M  src/lib/worker-registry/adapters/antigravity-cli.ts
M  src/lib/worker-registry/__tests__/claude-worker.test.ts
M  src/lib/worker-registry/__tests__/codex-worker.test.ts
M  src/lib/worker-registry/__tests__/antigravity-worker.test.ts
```

---

## 2. Next dev process identification

`Get-CimInstance Win32_Process` located a complete dev-server tree owned by this
project:

| PID | PPID | Command | Project match |
|---|---|---|---|
| 28248 | 19796 | `powershell.exe … VS Code shellIntegration.ps1` | VS Code integrated terminal (owner's) |
| 27624 | 28248 | `cmd /c npm run dev` | root of the tree |
| 26936 | 27624 | `npm-cli.js run dev` | — |
| 26532 | 26936 | `cmd /d /s /c node scripts/dev.mjs` | `scripts/dev.mjs` exists only in this repo |
| 26060 | 26532 | `node scripts/dev.mjs` | **YES** |
| 25924 | 26060 | `next dev -p 3000 --turbopack` | **YES** |
| 24872 | 25924 | `D:\АГЕНТ\ДЖАРВИС\node_modules\next\…\start-server.js` | **YES** — absolute project path; owns listening port 3000 |
| 10524 | 24872 | `node D:\АГЕНТ\ДЖАРВИС\.next\dev\build\56416d4ae4ce586f.js 49228` | **YES** — absolute project path |
| 28156 | 24872 | `node D:\АГЕНТ\ДЖАРВИС\.next\dev\build\56416d4ae4ce586f.js 49233` | **YES** — absolute project path |
| 19160 | 26060 | `node vendor/camofox-browser/server.js` | sibling service started by `dev.mjs` |

Corroborating evidence:

* `Get-NetTCPConnection -LocalPort 3000 -State Listen` → `OwningProcess = 24872`.
* PIDs 10524 / 28156 have the literal string `D:\АГЕНТ\ДЖАРВИС\.next\dev\build\…`
  in their command line — unambiguous ownership of the `.next` directory.
* Tree creation time **08.08.2026 15:26:56–15:27:06**, launched from a VS Code
  integrated PowerShell terminal — i.e. by the **owner**, not by this session.
  No Phase 06B or 06BD command ever ran `npm run dev`.

```
NEXT_DEV_PROCESS_FOUND = TRUE
NEXT_DEV_PID           = 26936 (tree root) / 24872 (server, owns :3000)
NEXT_DEV_COMMAND       = cmd /c npm run dev  ->  node scripts/dev.mjs  ->  next dev -p 3000 --turbopack
NEXT_DEV_PROJECT_MATCH = VERIFIED
```

**No process was terminated.**

---

## 3. `.next` artifact forensics

```
Test-Path ".next\dev\types\validator.ts"        -> True
LastWriteTime                                   -> 08.08.2026 15:27:06
Length                                          -> 60765

git check-ignore -v ".next/dev/types/validator.ts"
  -> .gitignore:17:/.next/   .next/dev/types/validator.ts
git ls-files ".next/dev/types/validator.ts"     -> (0 results)
git ls-files ".next"                            -> 0 files
git ls-tree -r HEAD | grep "^\.next/"           -> 0 files
```

```
NEXT_VALIDATOR_TRACKED = FALSE
NEXT_VALIDATOR_IGNORED = TRUE
```

### 3.1 The error was a torn read, not a corrupt file

The Phase 06B failures were:

```
tsc:   .next/dev/types/validator.ts(1614,1): error TS1128: Declaration or statement expected.
build: .next/dev/types/validator.ts:1611:18  Type error: Cannot find name '__IsExpected'.
```

Reading the file **now** at exactly those coordinates:

```
1611| // Validate ../../../src/app/layout.tsx
1612| {
1613|   type __IsExpected<Specific extends LayoutConfig<"/">> = Specific
1614|   const handler = {} as typeof import("../../../src/app/layout.js")
1615|   type __Check = __IsExpected<typeof handler>
1616|   // @ts-ignore
1617|   type __Unused = __Check
1618| }
```

The current content at 1611 and 1614 is structurally valid and does **not**
match either reported error. Structural integrity confirmed: 174 `__IsExpected`
declarations against 174 uses (`grep -c "__IsExpected<"` = 348 = 174 declaration
lines + 174 use lines), and the file terminates on a balanced block.

Conclusion: `tsc` observed the file **mid-rewrite** while the Turbopack dev
server was regenerating it. The two error coordinates differ between the
`typecheck` and `build` runs, which is the signature of a race, not of a
persistently corrupt artifact. The file is git-ignored and regenerated
continuously, so it can never be a tracked-source defect.

---

## 4. Typecheck without modifying source

`npm run typecheck` (`tsc --noEmit`), re-run in this diagnostic:

```
> jarwisyan@0.2.0 typecheck
> tsc --noEmit

TYPECHECK_RESULT=PASS
```

Raw `npx tsc --noEmit` output captured to a file: **0 bytes, 0 errors.**

| Error | Source path | Git tracked | Generated | 06B-related | Verdict |
|---|---|---|---|---|---|
| *(none)* | — | — | — | — | Clean run |

Historical (Phase 06B run only, no longer reproducible):

| Error | Source path | Git tracked | Generated | 06B-related | Verdict |
|---|---|---|---|---|---|
| `TS1128 Declaration or statement expected` | `.next/dev/types/validator.ts` | **NO** | **YES** | **NO** | Transient torn read of a dev-server artifact |

```
TRACKED_SOURCE_TYPE_ERRORS   = 0
GENERATED_NEXT_TYPE_ERRORS   = 0  (was 1, transient, not reproducible)
PHASE06B_SOURCE_TYPECHECK_STATUS = PASS
```

This is a genuine clean typecheck, not merely
`PASS_BLOCKED_BY_GENERATED_ARTIFACT` — the blocking condition cleared.

---

## 5. Build classification

`npx next build` run in isolation:

```
✓ Compiled successfully in 38.1s
  Running TypeScript ...
✓ Generating static pages using 35 workers (102/102) in 6.5s
NEXT_BUILD_EXIT=0
```

No `Type error`, no `Failed to type check`, full 102-route table emitted.

```
BUILD_COMPILE_STATUS             = PASS
BUILD_GENERATED_VALIDATOR_STATUS = PASS (no longer failing)
TRACKED_SOURCE_BUILD_ERRORS      = 0
BUILD_SOURCE_STATUS              = PASS
```

### 5.1 Separate, pre-existing observation on the `build` npm script

```json
"build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
```

`cp` is a POSIX command and is not available in Windows `cmd`/PowerShell, so the
two post-build copy steps cannot succeed on this machine. This is a **script
portability defect predating Phase 06B**, unrelated to type checking, and it
does not affect `next build` itself. Fixing it would require editing
`package.json`, which is forbidden at this stage. Logged as P2.

Two non-blocking Turbopack **warnings** (not errors) are also emitted, about
`next.config.ts` appearing in the NFT trace via
`src/app/api/files/raw/route.ts`. Pre-existing; logged as P2.

---

## 6. Vitest config forensics

Configuration files present: **`vitest.config.ts` only.** No `vite.config.*`,
no `vitest.workspace.*`, no `projects:`, no `environmentMatchGlobs`.

```ts
test: {
  environment: "jsdom",          // <-- global, applies to every suite
  globals: true,
  setupFiles: [],
  include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
}
```

Test scripts: `test => vitest run`, `test:watch => vitest`,
`daemon:test => vitest run src/daemon`,
`workers:test => vitest run …/antigravity-worker.test.ts`.

```
DEFAULT_VITEST_ENVIRONMENT      = jsdom (global, from vitest.config.ts)
NODE_TEST_ENVIRONMENT_OVERRIDES = 3   (the Phase 06B worker suites, via // @vitest-environment node)
JSDOM_TEST_ENVIRONMENT_OVERRIDES = 0
```

No file was modified.

---

## 7. Exact failing suites

`npm test` (authoritative), reproduced:

```
Test Files  33 failed | 26 passed (59)
     Tests   9 failed | 274 passed (283)
```

25 suites fail **before any test runs** (`0 test` each) with an identical
error; the 9 individual test failures are all downstream consumers of the
aborted `command-router` suite, not independent defects.

### 7.1 The 25 pre-test suite aborts

```
src/app/api/jarvis/network/route.test.ts
src/app/api/providers/codex-subscription/__tests__/routes.test.ts
src/app/api/telegram/music/audio/route.test.ts
src/app/api/voice/command/route.test.ts
src/daemon/executors/__tests__/process-runner.test.ts
src/daemon/sandbox/path-guard.test.ts
src/lib/ai-provider/codex-subscription/__tests__/adapter.test.ts
src/lib/ai-provider/codex-subscription/__tests__/app-server-client.test.ts
src/lib/ai-provider/codex-subscription/__tests__/safety.test.ts
src/lib/chat/attachment-policy.test.ts
src/lib/command-router/router.test.ts
src/lib/developer-operator/developer-operator.test.ts
src/lib/ecosystem/catalog.test.ts
src/lib/execution/__tests__/approval-engine.test.ts
src/lib/jarvis/orchestrator.test.ts
src/lib/jarvis/resume-service.test.ts
src/lib/local-agent-runtime/local-agent-runtime.test.ts
src/lib/local-operator/local-operator.test.ts
src/lib/mcp-bridge/mcp-bridge.test.ts
src/lib/phone-bridge/phone-bridge.test.ts
src/lib/safety/safety.test.ts
src/lib/youtube-oauth.test.ts
src/server/local-control/__tests__/command-runner.test.ts
src/server/local-control/__tests__/sandbox.test.ts
src/services/project-infrastructure.service.test.ts
```

| Property | Finding |
|---|---|
| Failure point | **Before tests start** — every one reports `(0 test)` |
| Error | `Error: No such built-in module: node:` |
| Requires DOM | **No** — none of them |
| Requires Node | **Yes** — all 25 |
| Trigger | Import graph reaches a Node built-in |
| Classification | Environment misconfiguration, not a source defect |

### 7.2 Root cause, proven

Vitest's `jsdom` environment makes Vite treat the module graph as
browser-targeted. Vite then externalises Node built-ins — visible in the run
output as `Module "path"/"fs"/"child_process" has been externalized for browser
compatibility`. Under Vitest 4.1.9 that externalisation emits a **bare `node:`
specifier**, and Node rejects it with `No such built-in module: node:`.

Worked example — `src/lib/safety/safety.test.ts`:

```
safety.test.ts
  -> ./permission-checker  -> ./actor            (pure TS, no builtins)
  -> ./terminal-guard      -> import { resolve, isAbsolute } from "path"   <-- Node builtin
```

Contrast with a **passing** jsdom suite, `src/lib/auth.test.ts`, whose only
import is `vitest` itself — its graph never reaches a Node built-in.

The rule is therefore exact and mechanical:

> A suite fails **iff** its import graph reaches a Node built-in.
> It has nothing to do with the suite's own content or intent.

Repo-wide, 30 `from "node:…"` specifiers exist across 16 source files
(`node:path`, `node:fs`, `node:fs/promises`, `node:crypto`, `node:os`,
`node:stream`, `node:events`, `node:util`, `node:readline`), plus bare
`path` / `fs` / `child_process` imports as above.

The diagnostic timing line confirms the failure is environmental, not import
related: `Duration 1.75s (transform 81ms, import 0ms, tests 0ms, **environment 1.36s**)`.

---

## 8. Test-environment reachability

Repo-wide scan for anything that would actually need a DOM:

```
find src -name "*.test.tsx"                                  -> 0 files
grep -rlE "@testing-library|document\.|window\.|localStorage|navigator\." \
     src --include=*.test.ts --include=*.test.tsx            -> 0 files
```

**There is not a single DOM-dependent test in this repository.** The global
`jsdom` environment is providing no value to any suite and is actively breaking
25 of them.

```
NODE_ENVIRONMENT_REQUIRED_SUITE_COUNT = 59   (all suites; 25 currently broken by jsdom)
JSDOM_REQUIRED_SUITE_COUNT            = 0
UNKNOWN_SUITE_COUNT                   = 0
```

Existing annotations: 3 files carry `// @vitest-environment node` (the Phase 06B
worker suites). No `environmentMatchGlobs`, no workspace/projects config.

---

## 9. Control runs

The CLI flag was verified against the installed binary before use, not guessed:

```
npx vitest --help
  --environment <name>   Specify runner environment, if not running in the browser (default: node)
```

**Control 1 — failing backend suite, node override, file unmodified**

```
npx vitest run src/lib/safety/safety.test.ts --environment node
  ✓ src/lib/safety/safety.test.ts (17 tests) 13ms
  Test Files  1 passed (1)
       Tests  17 passed (17)
```

**Control 2 — passing worker suite (already node via docblock)**

```
npm run workers:test  ->  35/35 passed, exit 0
```

**Control 3 — a genuine DOM/UI suite**

None exists (§8). `JSDOM_CONTROL_STATUS = NOT_APPLICABLE_NO_DOM_SUITES_EXIST`.
This is itself the strongest evidence that the global jsdom setting is
unnecessary.

**Control 4 — whole suite under node override (decisive)**

```
npx vitest run --environment node
  Test Files  59 passed (59)
       Tests  432 passed (432)
  VITEST_NODE_EXIT=0
```

| Run | Files | Tests | Exit |
|---|---|---|---|
| `npm test` (jsdom, current config) | 26 passed / **33 failed** | 274 passed / 9 failed (283 collected) | non-zero |
| `--environment node` (override only) | **59 passed / 0 failed** | **432 passed / 0 failed** | **0** |

The 432 − 283 = 149 test difference is the tests inside the 25 suites that never
even got collected under jsdom.

```
NODE_OVERRIDE_CONTROL_STATUS = PASS  (59/59 files, 432/432 tests)
JSDOM_CONTROL_STATUS         = NOT_APPLICABLE_NO_DOM_SUITES_EXIST
```

No file was modified to obtain these results — the override was CLI-only and is
**not** proposed as the permanent fix.

---

## 10. Dependency / version consistency (read-only)

```
node --version         -> v24.18.0
npm --version          -> 11.16.0
npx vitest --version   -> vitest/4.1.9 win32-x64 node-v24.18.0
```

Resolved installed versions:

```
vitest      4.1.9    (devDependency ^4.1.9)   OK
jsdom      29.1.1    (devDependency ^29.1.1)  OK
vite        8.1.3    (transitive via vitest)  OK
next       16.2.10   (dependency ^16.1.1)     OK
typescript  5.9.3                             OK
```

`npm ls --depth=0` exits 0 with no `UNMET`, `invalid`, `extraneous` or `missing`
entries. `node_modules/.package-lock.json` is PRESENT. No lockfile/manifest
mismatch.

**Resolved false alarm.** `npm ls vitest vite jsdom --depth=0` initially printed
`(empty)`. Cause: the machine has **`NODE_ENV=production`** set in the ambient
environment, so npm defaults to `omit=dev` (`npm config get omit -> dev`) and
hides devDependencies. With `--include=dev` both packages list normally. The
install is healthy; only the *listing* was filtered.

`rolldown` is not a direct dependency (bundled inside Vitest 4), hence `(empty)`
for that query too — expected, not a defect.

```
NODE_VERSION           = v24.18.0
NPM_VERSION            = 11.16.0
VITEST_VERSION         = 4.1.9
JSDOM_VERSION          = 29.1.1
DEPENDENCY_TREE_STATUS = HEALTHY
```

Note: a Linux-sandbox invocation of Vitest fails with
`Cannot find module '@rolldown/binding-linux-x64-gnu'`. This is expected —
`node_modules` was installed on Windows and contains only win32-x64 native
bindings. It is not a defect and all validation in this diagnostic was executed
natively on Windows.

---

## 11. Baseline attribution

| Claim | Evidence | Result |
|---|---|---|
| 06B did not change `vitest.config.ts` | `git show HEAD:vitest.config.ts` already contains `environment: "jsdom"` at line 8. The only working-tree delta is a `server-only` alias present at the 06B Stage-1 baseline. | **Confirmed** |
| `jsdom` predates 06B entirely | Introduced in commit `ffd6d33` "Prepare JARVIS agent OS for GitHub" | **Confirmed** |
| 06B did not change `package.json` | Modified at the 06B Stage-1 baseline; untouched by 06B and by 06BD | **Confirmed** |
| 06B did not change `package-lock.json` | Same as above | **Confirmed** |
| 06B did not create `.next/dev` | `.next` is git-ignored and untracked at HEAD (0 files); the owning dev server was launched by the owner from VS Code at 15:26:56 | **Confirmed** |
| Failing suites are outside the 06B manifest | The 25 aborting suites are disjoint from the 7 worker-registry files; all 3 worker suites pass under both runs | **Confirmed** |

```
VITEST_BLOCKER_INTRODUCED_BY_06B       = FALSE
NEXT_ARTIFACT_BLOCKER_INTRODUCED_BY_06B = FALSE
```

---

## 12. Repair classification

**Result B — TEST CONFIG REPAIR REQUIRED.**

* Not **A** (dev server only): the `.next` blocker has already self-cleared and
  needs no owner action, but the Vitest blocker is real and independent.
* Not **C**: the dependency tree is healthy; the `npm ls` anomaly was
  `NODE_ENV=production` filtering, and native bindings are correct for Windows.
* Not **D**: `TRACKED_SOURCE_TYPE_ERRORS = 0`, all 7 Phase 06B files typecheck
  and all 84 worker tests pass. No source defect exists.

```
NEXT_ACTION = RUN_PROMPT_6BDR_VITEST_ENVIRONMENT_REPAIR
```

---

## 13. Recommended minimal fix — prepared, NOT executed

### 13.1 `.next` / dev server — **no action required**

Typecheck and `next build` both pass now. Stopping the dev server is
**unnecessary**. If a future run hits the same race, the minimal remedy is:

1. Confirm the tree is still the verified one (PIDs 26936 → 26060 → 25924 →
   24872, port 3000, absolute project paths).
2. Stop **only** that verified tree; confirm termination.
3. Remove **only** `D:\АГЕНТ\ДЖАРВИС\.next`.
4. Re-run `npm run typecheck` and `npm run build` with no dev server running.

Not performed. No process was killed and nothing under `.next` was deleted.

A cheaper, permanent alternative worth considering: exclude `.next` from the
typecheck `tsconfig.json` include set so a live dev server can never race the
type checker. Out of scope here.

### 13.2 Vitest — one line, centralised

Because `JSDOM_REQUIRED_SUITE_COUNT = 0`, the correct fix is centralised routing,
**not** 25 file edits:

```diff
  test: {
-   environment: "jsdom",
+   // No suite in this repository requires a DOM (0 *.test.tsx, 0 references to
+   // document/window/localStorage/@testing-library). Every suite is backend or
+   // library code that imports Node built-ins, which the jsdom environment
+   // externalises into an invalid bare `node:` specifier. Individual suites can
+   // still opt in with `// @vitest-environment jsdom` if a DOM test is added.
+   environment: "node",
    globals: true,
```

Proven outcome: **59/59 files, 432/432 tests, exit 0.**

Optional follow-up (not required): once the default is `node`, the three
`// @vitest-environment node` docblocks in the worker suites become redundant
and could be removed — harmless either way, so leaving them is fine.

If DOM tests are ever added, prefer `environmentMatchGlobs` (or Vitest 4
`projects`) over per-file docblocks, so environment routing stays centralised.

**Not applied. `vitest.config.ts` is byte-identical to its pre-diagnostic state.**

---

## 14. Final non-interference

```
git diff --cached --name-status  -> (empty)
```

Working tree vs. the state at the start of this diagnostic: identical except for
this report. The seven Phase 06B files remain modified exactly as they were; no
config, package, Prisma, migration, database or test file changed.

Seven temporary diagnostic log files (`tc_06bd.txt`, `build_06bd.txt`,
`nb_06bd.txt`, `vt_06bd.txt`, `vt2_06bd.txt`, `vtnode_06bd.txt`,
`npmls_06bd.txt`) were created during measurement and deleted; no residue
remains.

```
PRODUCTION_FILES_CHANGED_BY_THIS_DIAGNOSTIC = FALSE
TEST_FILES_CHANGED_BY_THIS_DIAGNOSTIC       = FALSE
PACKAGE_FILES_CHANGED_BY_THIS_DIAGNOSTIC    = FALSE
CONFIG_FILES_CHANGED_BY_THIS_DIAGNOSTIC     = FALSE
GIT_INDEX_CHANGED                           = FALSE
DATABASE_MODIFIED                           = FALSE
PROCESSES_TERMINATED                        = 0
```

---

## 15. Findings

**P0 — 0.** No source defect, no data-integrity issue, no Phase 06B regression.

**P1 — 1 (open, actionable, one line).**
`vitest.config.ts` sets `environment: "jsdom"` globally while zero suites need a
DOM, breaking 25 backend suites and hiding 149 tests. Fix is a single-line change
proven to yield 59/59 files and 432/432 tests.

**P2 — 4 (open, informational, all pre-existing and out of scope).**

1. `.next/dev/types/validator.ts` can be read mid-write by `tsc` while the dev
   server runs, producing spurious, non-reproducible type errors. Consider
   excluding `.next` from the typecheck include set.
2. The `build` npm script chains POSIX `cp -r`, which cannot run on Windows, so
   the standalone-copy steps always fail there. `next build` itself is unaffected.
3. `NODE_ENV=production` is set machine-wide, which makes `npm ls` silently omit
   devDependencies and can alter other tooling behaviour.
4. Two Turbopack NFT-trace warnings from `next.config.ts` reached via
   `src/app/api/files/raw/route.ts`.

---

## 16. Status

```
VALIDATION_ENVIRONMENT_DIAGNOSTIC_STATUS = PASS
PHASE_06B_STATUS                         = BLOCKED_BY_TEST_ENVIRONMENT_CONFIG_ONLY
NEXT_ALLOWED_ACTION                      = RUN_PROMPT_6BDR_VITEST_ENVIRONMENT_REPAIR
```

Phase 06B's own deliverable is sound: source typecheck is clean, `next build`
exits 0, and all 84 worker terminal-state tests pass. The single remaining gate
is a one-line Vitest environment setting that predates Phase 06B by several
commits. No commit was created; no push was performed; no blocker was fixed.
