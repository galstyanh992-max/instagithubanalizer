# 06A — Phase 06 Mock & False-Success Forensic Audit

- **Проект:** `D:\АГЕНТ\ДЖАРВИС`
- **Ветка:** `feat/jarvis-agent-hub`
- **HEAD:** `16ab70321abbb227b7908f133a62f11453ceb485`
- **Режим:** read-only. Код/tests/migrations не редактировались, Git index не изменялся, commit/push не выполнялись, real Codex/Claude/Antigravity E2E не запускались, DB не модифицировалась.
- **Дата:** 2026-07-28

## Цель

Найти все места, где система может вернуть SUCCESS без реального выполнения, создать fake evidence, имитировать worker output, подменить CLI mock-ответом, считать null/undefined exit code успехом, создать ожидаемые файлы до проверки worker, показать завершённую задачу при незавершённом process, использовать demo fallback в production path, скрыть failure за optimistic UI. Ничего не исправлять — только план.

## Baseline

```
git rev-parse --show-toplevel = D:/АГЕНТ/ДЖАРВИС
git branch --show-current      = feat/jarvis-agent-hub
git rev-parse HEAD             = 16ab70321abbb227b7908f133a62f11453ceb485
git diff --cached --name-status = empty   (INDEX=EMPTY)
.git/index.lock = absent
```

~281 unrelated working-tree entries сохранены. Аудит читал working tree (включая pre-existing unrelated изменения); код не изменён.

## Архитектура execution-путей (важно для классификации)

В кодовой базе сосуществуют четыре execution-парадигмы:

1. **worker-registry** (`src/lib/worker-registry/adapters/{codex-cli,claude-code,antigravity-cli}.ts`) — Phase 05 hardened path: CLI spawn, SUCCESS gated на exit code 0, timeout/cancel/capability handling. Это основной worker-путь.
2. **agent-runtime** (`src/lib/agent-core/runtime.ts`, `src/lib/jarvis/execution-engine.ts`) — LLM-агенты через tool-hub; `status:'success'` = LLM вернула ответ, не «цель доказана». Tasks → `'passed'` по AgentResult.status.
3. **daemon** (`src/daemon/poller/index.ts`) — отдельный полер, обрабатывает задачи из gateway; no-plan путь исполняет **mock**-команды.
4. **legacy server/executor** (`src/server/executor/*`) — ManualAdapter/CodexCli/repair-loop/verification; **не импортируется** ни одним production route/lib/service (только self + tests) → dead code.

## 2. Production search — сводка

Поиск по `mock|stub|fake|simulate|demo|placeholder|synthetic|hardcoded|success:true|status:'SUCCESS'|completed:true|Promise.resolve|Math.random|fallback|optimistic|dryRun` в production (tests/docs классифицированы отдельно). Ключевые совпадения:

- `src/daemon/poller/index.ts` — mock-команды (MockExecutors).
- `src/app/api/os-metrics/route.ts` — `Math.random()` для gpu/vram/temp/network + комментарий "Mock GPU/Mock Temp".
- `src/lib/os-mock-data.ts`, `src/components/os/OsSystemStatus.tsx` — mock OS dashboard data.
- `src/lib/tool-hub/adapters/index.ts` — mock tool-адаптеры, gated `MOCKS_ENABLED = process.env.ENABLE_MOCK_TOOLS === 'true'` (в .env **не задан** → off в prod).
- `src/services/ai-provider-router.service.ts`, `ai.service.ts`, `chat.service.ts`, `pipeline.service.ts`, `integration-plan.service.ts`, `ocr.service.ts` — mock/fallback режимы AI/анализа при недоступности providers (disclosed через `isMock`/`mock:true`).
- `src/lib/worker-registry/adapters/*.ts` — `exitCode ?? 0` (null→0).
- `src/lib/agent-core/runtime.ts:163,211` — `status:'success'` на LLM-ответ.
- `src/components/sidebar/task-list-sidebar.tsx:59`, `src/lib/jarvis/repair-loop.ts:91`, `src/lib/jarvis/browser-agent.ts:47` — optimistic UI / optimistic finding / immediate queued return.
- `Math.random` в UI-косметике (voice waveform, three-background, sidebar skeleton, terminal/repo-import IDs) — cosmetic.
- `scripts/run-daemon-e2e.mjs`, `scripts/not-implemented.mjs` — demo/placeholder scripts.

## 3. Execution path forensics

| Layer | Real implementation | Mock/stub | Failure propagation | False-success risk |
|---|---|---|---|---|
| UI request | real | optimistic UI updates (task-list-sidebar) | errors surface | optimistic completion до server confirm (P2) |
| API routes | real (Next.js) | os-metrics mock fields | catch→500 (ok:false) | низкий; API не возвращает 200 при ошибке |
| Orchestrator (jarvis) | real state machine (state.ts) | — | guarded transitions throw | низкий на машине; риск на app-слое (evidence) |
| Task creation/decomposition | real (TaskDecompositionEngine) | — | errors propagated | низкий |
| Worker routing | real (worker-router, agent-core) | — | — | низкий |
| Adapter spawn (worker-registry) | real CLI spawn, shell:false | — | exit code / timeout / cancel / capability | Claude cancellation→SUCCESS (P2) |
| Exit event | exit code gated (Codex/Antigravity) | `exitCode ?? 0` (null→0) | FAILED/TIMEOUT/CANCELLED | null-exit edge (P2) |
| Evidence | WorkerSession/WorkerPatch persisted | summary-string evidence | — | weak binding (P2) |
| Database state | Task.status, WorkerSession.status (free string) | — | — | no SUCCESS↔exitCode/session constraint (P2) |
| UI state | real | optimistic | — | optimistic completion (P2) |
| Daemon poller | plan→ProcessRunner (real) | no-plan→MockExecutors (mock) | failed→failTask | mock execution path (P1) |
| Legacy server/executor | ManualAdapter/CodexCli | manual "success on handoff", "success on start" | — | unreachable (P3) |

## 4. Worker result audit

| Adapter | SUCCESS gate | null exit code | spawn error | timeout | cancellation | verdict |
|---|---|---|---|---|---|---|
| Codex (worker-registry) | `code===0?SUCCESS:FAILED` | `exitCode ?? 0` → 0 (mitigated by cancelledRuns + timeout flags) | → FAILED | → TIMEOUT | → CANCELLED (cancelledRuns) | PASS_WITH_EDGE |
| Antigravity | `code===0?SUCCESS:FAILED`; `if(exitCode===null&&signal)code=-1` | null+signal→-1; null w/o signal→0 | → FAILED | → TIMEOUT | signal==='SIGTERM'→CANCELLED | PASS_WITH_EDGE |
| Claude | `code===0?SUCCESS:FAILED` | `exitCode ?? 0` → 0 | → FAILED | → TIMEOUT | **нет CANCELLED-ветви / нет signal-check** → SIGTERM kill → exitCode null → SUCCESS | GAP (P2) |

- Empty output не подменяется fabricated output ни в одном adapter (stdout/stderr пробрасываются как есть).
- Expected files не создаются worker-harness’ом до worker (worker-registry tests используют mocks; `antigravity-e2e.ts` создаёт `input/sample.ts` как вход, но это standalone-скрипт вне vitest).
- warnings не скрывают FAILED (errors[] заполняется при code!==0).

**Claude cancellation (зафиксировано ранее):** `claude-code.ts` close-handler: `const code = exitCode ?? 0;` без проверки `signal==='SIGTERM'` и без `cancelledRuns`-множества (как в Codex). `cancel()` шлёт SIGTERM, но результат классифицируется по exit code: null→0→SUCCESS (если не timeout). Фактический риск: отменённая write-capable задача Claude может быть показана как SUCCESS, маскируя незавершённую работу. Repair scope: group C — добавить CANCELLED-ветвь по signal/cancelledRuns и убрать `exitCode ?? 0`→SUCCESS для null-exit.

**`exitCode ?? 0` pattern** (все три adapter): null exit code трактуется как 0. В Codex/Antigravity смягчено cancel/timeout/signal-проверками; в Claude — нет. Базовый pattern рискован; рекомендация — `code = exitCode === null ? -1 : exitCode` + явные timeout/cancel/signal-ветви.

## 5. Task state machine

`src/lib/jarvis/state.ts`:

- `ORCHESTRATION_RUN_TRANSITIONS` и `TASK_NODE_TRANSITIONS` — guarded; `transitionRun`/`transitionTask` **throw на невалидный переход**. Terminal-статусы (`COMPLETED/FAILED/CANCELLED` для run; `passed/failed/blocked/skipped` для task) не имеют исходящих переходов → **двойной terminal-transition невозможен** через эти хелперы.
- `failed`/`blocked` могут вернуться в `ready` (repair loop) — это soft-terminal, корректно.
- Машина **не требует evidence** для перехода в `passed`/`COMPLETED` — это app-layer ответственность.
- Optimistic completion до worker exit — не в машине, а в UI/repair-loop (см. §7).

```
TASK_STATE_MACHINE_STATUS=SOUND_GUARDED_TRANSITIONS_BUT_NO_EVIDENCE_ENFORCEMENT
```

Кто переводит task в SUCCESS: `execution-engine.ts:260` `nextStatus = result.status==='passed'?'passed':...` по AgentResult; run→COMPLETED когда все tasks passed/skipped (`execution-engine.ts:193-196`). Evidence = `result.summary` (строка).

## 6. Evidence integrity

`prisma/schema.prisma`:

```
model WorkerSession { id; runId; workerId; taskId; workspaceRoot; status:String @default("PENDING"); exitCode:Int?; patchId; stdout; stderr; ... patches }
model WorkerPatch   { id; sessionId; diffContent:String; changedFiles:String; status; securityFlags; ... session }
```

Находки:

- `WorkerSession.exitCode` — `Int?` (nullable), **нет DB-constraint** `status='SUCCESS' ⇒ exitCode=0`. Можно записать SUCCESS с null exitCode.
- `Task.status` — free `String` (комментарий перечисляет значения, но нет enum/constraint). `Task` **не имеет FK на WorkerSession** → возможна задача `done` без WorkerSession.
- `WorkerSession.taskId` — free `String`, **нет FK на Task** → возможна orphan session.
- Нет unique-constraint на `(taskId, runId)` → возможна повторная/duplicate session/lease.
- `WorkerPatch.diffContent` — free text, **нет checksum/integrity field** → возможен fabricated diff.
- Terminal status хранится в двух местах (`Task.status` и `WorkerSession.status`) без enforced consistency.
- В execution-engine evidence = `result.summary` (строка), не привязана структурно к exit code / session / checksum.

```
EVIDENCE_INTEGRITY_STATUS=GAP
```

## 7. API and UI false-success

- **API:** catch-блоки в `src/app/api/**` возвращают `NextResponse.json({ok:false/error}, {status:500})` (approvals, files, candidates, youtube и др.). **Не найдено** route, возвращающего 200/success при внутренней ошибке. Несколько `.catch(()=>null/undefined)` — best-effort cleanup/status (development/status, chat/attachments cleanup), низкий риск. `youtube/status` catch → `{configured:false,connected:false}` (graceful degradation, не false success).
- **UI:** optimistic updates:
  - `src/components/sidebar/task-list-sidebar.tsx:59` — "Optimistic UI update" для task list (P2).
  - `src/lib/jarvis/repair-loop.ts:91` — "Return an updated Finding object (optimistic)" (P2).
  - `src/lib/jarvis/browser-agent.ts:47-50` — "return the queued task immediately" (optimistic queued→completed mapping) (P2).

```
API_FALSE_SUCCESS_STATUS=PASS
UI_FALSE_SUCCESS_STATUS=GAP
```

## 8. Database persistence

(см. §6) Summary:

- terminal status в нескольких таблицах без constraints;
- SUCCESS без WorkerSession — возможен (нет FK);
- SUCCESS без exitCode=0 — возможен (exitCode nullable, нет check);
- SUCCESS без evidence — возможен (нет constraint);
- orphan session — возможен (нет FK WorkerSession.taskId→Task);
- повторная обработка lease — возможна (нет unique на taskId/runId);
- fabricated diff — возможен (нет checksum).

Не выполнялись DB writes / migrations.

## 9. Test quality

- `.skip`/`.only` по всем `*.test.ts(x)` — **0 совпадений** (хорошо).
- Codex worker test (18) покрывает cancellation/timeout/spawn-error/argument-rejection — хорошо.
- Antigravity worker test (27) покрывает timeout/cancellation/non-zero-exit/fail-closed model — хорошо.
- **Claude worker test не покрывает cancellation** (нет CANCELLED-теста) — gap (P2).
- Agent-runtime `status:'success'`-gate (LLM-ответ=success) не покрыт тестом на «ответ с failure-контентом» — gap.
- Mock-based worker tests используют EventEmitter-mock, эмитящий `close(0)`/`close(1)` — тестируют handling adapter’а (корректно), не hardcoded fake success.
- `antigravity-e2e.ts` (standalone script, вне vitest) создаёт `input/sample.ts` вручную и ожидает созданные файлы — test-harness pattern, не production.

## 10. Classification

| ID | File | Line(s) | Reachability | Risk | Severity | Recommended repair |
|---|---|---|---|---|---|---|
| 6A-1 | src/daemon/poller/index.ts | 65-101 | daemon poller (gateway tasks без plan) | mock execution path; `completeTask(... result.resultData \|\| 'Success')` | P1 | group A/F: убрать MockExecutors из production dispatch; no-plan → fail-closed или real executor |
| 6A-2 | src/app/api/os-metrics/route.ts | 38-44 | production API | fabricated gpu/vram/temp/network (Math.random) без mock-флага | P1 | group F: пометить mock-поля или убрать; не выдавать fabricated как real |
| 6A-3 | src/lib/os-mock-data.ts; src/components/os/OsSystemStatus.tsx | 24-28; 40 | production UI | mock dashboard data (random jitter) | P1 | group F: явно label `mock` или real OS source |
| 6A-4 | src/lib/worker-registry/adapters/claude-code.ts | close-handler | production worker | cancellation (SIGTERM) → SUCCESS (нет CANCELLED) | P2 | group C: CANCELLED по signal/cancelledRuns |
| 6A-5 | codex-cli.ts/claude-code.ts/antigravity-cli.ts | `exitCode ?? 0` | production worker | null exit → 0 → SUCCESS edge | P2 | group C: `exitCode===null?-1:exitCode` + явные ветви |
| 6A-6 | src/lib/agent-core/runtime.ts | 163,211 | agent-runtime (LLM) | `status:'success'` = LLM ответил, не цель | P2 | group B/D: success-gate по goal/tool-result, не по ответу |
| 6A-7 | src/lib/jarvis/execution-engine.ts | 260,283 | orchestrator | task `'passed'` по AgentResult; evidence=summary string | P2 | group D: require evidence (exit code/session/patch) перед passed |
| 6A-8 | src/components/sidebar/task-list-sidebar.tsx; src/lib/jarvis/repair-loop.ts | 59;91 | UI/logic | optimistic UI / optimistic finding | P2 | group E: server-confirm перед completion-UI |
| 6A-9 | src/lib/jarvis/browser-agent.ts | 47-50 | agent path | immediate queued→completed mapping | P2 | group E: различать queued vs completed |
| 6A-10 | src/lib/tool-hub/adapters/index.ts | 52-273 | tool-hub (gated) | mock tools за `ENABLE_MOCK_TOOLS=true` (off в prod) | P3 | group G: ensure env var never set in prod; optional remove |
| 6A-11 | src/server/executor/* | manual-adapter:27; codex-cli-adapter:45 | **unreachable** (нет importers) | legacy "success on handoff/start" | P3 | group G: удалить или явно пометить dead/legacy |
| 6A-12 | ai-provider-router/ai/chat/pipeline/integration-plan/ocr services | various | services | disclosed mock/fallback (isMock/mock:true) | P3 | group G: сохранить disclosure; не использовать как execution success |
| 6A-13 | UI Math.random (voice/three/sidebar/ids) | various | UI | cosmetic random | P3 | group G: no action |
| 6A-14 | scripts/run-daemon-e2e.mjs; scripts/not-implemented.mjs | — | scripts | demo/placeholder | P3 | group G: no action |
| 6A-15 | src/components/voice/use-voice.ts | 81 | UI | "Fake level animation" | P3 | group G: no action |
| 6A-16 | prisma/schema.prisma (WorkerSession/WorkerPatch/Task) | 1544-1571;431 | DB | no SUCCESS↔exitCode/session constraints; no patch checksum; orphan/duplicate possible | P2 | group D + DB constraints |
| 6A-17 | claude-worker.test.ts | — | tests | no cancellation coverage | P2 | group F: add Claude cancellation test |

## 11. Repair groups

- **A. REMOVE_PRODUCTION_MOCKS:** `src/daemon/poller/index.ts` (6A-1).
- **B. FIX_FALSE_SUCCESS_TRANSITIONS:** `src/lib/agent-core/runtime.ts` (6A-6), `src/lib/jarvis/execution-engine.ts` (6A-7).
- **C. FIX_CANCELLATION_AND_TIMEOUT:** `src/lib/worker-registry/adapters/claude-code.ts` (6A-4), `codex-cli.ts`/`antigravity-cli.ts`/`claude-code.ts` `exitCode ?? 0` (6A-5).
- **D. REQUIRE_EVIDENCE_BEFORE_SUCCESS:** `src/lib/jarvis/execution-engine.ts` (6A-7), `prisma/schema.prisma` (6A-16) — bind SUCCESS↔exitCode=0/WorkerSession/patch-checksum; FK WorkerSession.taskId→Task; unique(taskId,runId).
- **E. REMOVE_OPTIMISTIC_UI_COMPLETION:** `src/components/sidebar/task-list-sidebar.tsx` (6A-8), `src/lib/jarvis/repair-loop.ts` (6A-8), `src/lib/jarvis/browser-agent.ts` (6A-9).
- **F. IMPROVE_TEST_COVERAGE / REMOVE_MOCK_DATA:** `claude-worker.test.ts` (6A-17); `src/app/api/os-metrics/route.ts` + `src/lib/os-mock-data.ts` + `OsSystemStatus.tsx` (6A-2,6A-3).
- **G. TEST_OR_DOC_ONLY_NO_ACTION:** `src/lib/tool-hub/adapters/index.ts` (6A-10, gated), `src/server/executor/*` (6A-11, unreachable), AI/services disclosed fallback (6A-12), UI Math.random cosmetics (6A-13), scripts (6A-14), voice fake animation (6A-15).

## 12. Implementation plan (repair prompts, не выполнять)

- **6B — worker terminal-state correctness:** fix Claude CANCELLED (6A-4) + `exitCode ?? 0` (6A-5) во всех трёх adapter’ах; add Claude cancellation test (6A-17).
- **6C — task state-machine integrity:** enforce evidence перед `passed`/`COMPLETED` в execution-engine (6A-7); убедиться что transition-хелперы — единственный путь смены статуса.
- **6D — evidence requirements:** DB constraints — SUCCESS↔exitCode=0, Task→WorkerSession FK, unique(taskId,runId), WorkerPatch checksum (6A-16); bind execution-engine evidence к session/exit code (6A-7).
- **6E — API/UI false-success removal:** server-confirm перед completion-UI (6A-8,6A-9); keep API error→500.
- **6F — production mock elimination:** daemon poller mock dispatch (6A-1); os-metrics/os-mock-data fabricated data (6A-2,6A-3); ensure ENABLE_MOCK_TOOLS never in prod (6A-10); decide on legacy server/executor (6A-11).
- **6G — full Phase 06 E2E and audit:** real worker E2E re-run + full validation + audit.

## Финальный блок

```
AUDIT_HEAD=16ab70321abbb227b7908f133a62f11453ceb485
BRANCH=feat/jarvis-agent-hub
GIT_INDEX_STATUS=EMPTY

PRODUCTION_MOCK_FINDING_COUNT=6
FALSE_SUCCESS_FINDING_COUNT=4
FABRICATED_EVIDENCE_FINDING_COUNT=2
OPTIMISTIC_UI_FINDING_COUNT=3
TEST_COVERAGE_GAP_COUNT=2

P0_FINDINGS=0
P1_FINDINGS=3
P2_FINDINGS=9
P3_FINDINGS=6

CLAUDE_CANCELLATION_STATUS=GAP
WORKER_SUCCESS_GATE_STATUS=PASS_WITH_GAPS
TASK_STATE_MACHINE_STATUS=SOUND_GUARDED_TRANSITIONS_BUT_NO_EVIDENCE_ENFORCEMENT
EVIDENCE_INTEGRITY_STATUS=GAP
API_FALSE_SUCCESS_STATUS=PASS
UI_FALSE_SUCCESS_STATUS=GAP

FILES_MODIFIED_BY_THIS_AUDIT=1
GIT_INDEX_CHANGED=FALSE
COMMITS_CREATED=FALSE
GIT_PUSH_EXECUTED=FALSE
DATABASE_MODIFIED=FALSE

PHASE_06_AUDIT_STATUS=PASS_PLAN_READY
NEXT_ALLOWED_ACTION=OWNER_REVIEWS_PROMPT_6B_WORKER_TERMINAL_STATE_REPAIR
```

## Замечания

- P0 = 0: в hardened worker-registry path нет норм-path false success или fabricated evidence; SUCCESS gated на exit code 0 (с edge-caveats). Основные риски — cancellation/null-exit edge (Claude), слабый evidence-binding, mock-data в dashboard/API, daemon mock-dispatch.
- Аудит read-only: код/tests/migrations/DB/Git index не изменены; создан только этот отчёт.
- Отчёт `docs/jarvis/06A_mock_false_success_audit.md` — untracked, в Git index не добавлен.

Остановлено. Findings не исправляются. Commit/push не выполняются. Phase 07 не запускается.