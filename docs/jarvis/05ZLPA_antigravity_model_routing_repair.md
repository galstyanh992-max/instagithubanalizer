# 05ZLPA — Antigravity Explicit Model Routing Repair

- **Проект:** `D:\АГЕНТ\ДЖАРВИС`
- **ОС:** Windows 11
- **Antigravity CLI:** `C:\Users\Admin\AppData\Local\agy\bin\agy.exe`
- **Antigravity CLI version:** `1.1.7`
- **Роль:** Antigravity CLI Model Routing Engineer
- **Дата:** 2026-07-28

## Owner-approved policy

- PRIMARY MODEL = Gemini 3.1 Pro → CLI value `gemini-3.1-pro-high`
- FAST MODEL = Gemini 3.6 Flash → CLI value `gemini-3.6-flash-medium`
- `ANTIGRAVITY_MODEL_SELECTION_MODE=EXPLICIT_CLI_ARGUMENT`
- `ANTIGRAVITY_INTERNAL_DEFAULT_MODEL_ALLOWED=FALSE`
- `ANTIGRAVITY_UNKNOWN_MODEL_FALLBACK=DISABLED`

Каждый production-запуск Antigravity явно передаёт `--model <verified-cli-model-value>`.

## Итоговый вердикт

**PASS.** Repair применён и валидирован. Commit не создан, push не выполнен, Phase 06 не запущена.

## Этап 1 — Baseline

```
PRE_REPAIR_HEAD=ac4550ab169c901087d1c95491c0c988d87260f6   # совпал с ожидаемым
BRANCH=feat/jarvis-agent-hub
PRE_REPAIR_INDEX_STATUS=CLEAN (индекс пуст)
PRE_REPAIR_WORKING_TREE_STATUS=DIRTY (предсуществующие unrelated изменения owner-а сохранены)
```

## Этап 2 — Verify owner-selected CLI values

Локальный `agy.exe 1.1.7` запускался foreground, изолированно, без retry/fallback/dangerous permissions, с явным `--model`:

| Profile | `--model` value | Exit | Stdout | Verified |
|---|---|---|---|---|
| primary | `gemini-3.1-pro-high` | 0 | `MODEL_ROUTING_OK` | TRUE |
| fast | `gemini-3.6-flash-medium` | 0 | `MODEL_ROUTING_OK` | TRUE |

```
ANTIGRAVITY_PRIMARY_MODEL_CLI_VALUE_VERIFIED=TRUE
ANTIGRAVITY_FAST_MODEL_CLI_VALUE_VERIFIED=TRUE
```

## Этап 3 — Minimal production repair

Изменённые production-файлы (только model routing):

- `src/lib/worker-registry/adapters/antigravity-cli.ts`
- `src/lib/worker-registry/types.ts`

Что сделано в `antigravity-cli.ts`:

- Удалены stale constants `ALLOWED_ANTIGRAVITY_MODELS` (2.5/1.5), `DEFAULT_ANTIGRAVITY_MODEL` (`gemini-2.5-pro`) и `MODEL_PROFILE_MAP` со значениями 2.5.
- Введена typed-конфигурация:
  - `ANTIGRAVITY_MODEL_CONFIG.primary = { label: 'Gemini 3.1 Pro', cliValue: 'gemini-3.1-pro-high' }`
  - `ANTIGRAVITY_MODEL_CONFIG.fast = { label: 'Gemini 3.6 Flash', cliValue: 'gemini-3.6-flash-medium' }`
  - `ALLOWED_ANTIGRAVITY_MODELS` = ровно два verified значения.
  - `MODEL_PROFILE_MAP: Record<ModelProfile, 'primary'|'fast'>` (`FAST`/`BALANCED→fast`, `DEEP_REASONING`/`CODE_REVIEW→primary`).
- `resolveModelDescriptor(profile)` возвращает `{ tier, label, cliValue }`; **fail closed** (`ANTIGRAVITY_MODEL_PROFILE_UNKNOWN`) для unknown/missing profile; не возвращает default/undefined/2.5; не подменяет модель.
- `resolveModel(profile)` делегирует в descriptor и возвращает exact CLI value.
- `prepareExecutionPlan()` вызывает `resolveModelDescriptor(task.requestedProfile)` (fail closed до spawn) и добавляет в `args` массив: `--model`, `<resolved exact CLI value>`. Модель передаётся элементом массива, не строковой shell-командой.

Дополнительно (доказанная необходимость): `buildSafeEnv()` — окружение для spawn ранее состояло только из `{ NODE_ENV, PATH }`, из-за чего `agy.exe` не находил `%userprofile%` и падал при старте (`Failed to redirect output ... %userprofile% is not defined`). Теперь передаётся минимальный секрет-free набор OS-локаторов (`USERPROFILE`, `LOCALAPPDATA`, `APPDATA`, `HOMEDRIVE`, `HOMEPATH`, `SystemRoot`, `TEMP`, `TMP`, `ComSpec`, `OS`, `PATHEXT`, `PATH`) + `NODE_ENV`. Credentials/API keys/service-role keys/tokens не передаются.

В `types.ts` добавлены опциональные поля diagnostics в `ExecutionPlan` (`modelProfile`, `modelLabel`, `modelCliValue`) и `WorkerResult` (`modelProfile`, `modelLabel`, `modelCliValue`, `modelSelection`, `internalDefaultAllowed`, `modelFallbackUsed`, `permissionPolicy`, `writeCapability`, `commandExecutionCapability`, `dangerousPermissionsUsed`). Опциональные поля не затрагивают Codex/Claude adapters.

`healthCheck()` также теперь запускает probe с явным `--model` (Antigravity никогда не запускается без `--model`).

## Этап 4 — Security preservation

Сохранено: `shell=false`, READ_ONLY_FAIL_CLOSED, filesystem write disabled (`FILES_CREATE/FILES_MODIFY=false`), command execution disabled (`PROCESS_RUN_TESTS=false`), `validateTask` denies `requiresFilesystemWrite`/`requiresCommandExecution`, isolated workspace, real exit code, timeout, cancellation. Удалён silent fallback `DEFAULT_ANTIGRAVITY_MODEL` для unknown profile. `--dangerously-skip-permissions` не используется.

## Этап 5 — Diagnostics

Каждый выполненный `WorkerResult` содержит (non-secret):
`modelProfile`, `modelLabel`, `modelCliValue`, `modelSelection=explicit-cli-argument`, `internalDefaultAllowed=false`, `modelFallbackUsed=false`, `permissionPolicy=READ_ONLY_FAIL_CLOSED`, `writeCapability=disabled`, `commandExecutionCapability=disabled`, `dangerousPermissionsUsed=false`. Credentials/tokens отсутствуют.

## Этап 6 — Tests

`src/lib/worker-registry/__tests__/antigravity-worker.test.ts` обновлён (27 тестов): primary→`gemini-3.1-pro-high`, fast→`gemini-3.6-flash-medium`, production args содержат `--model` с exact value, stale 2.5 отсутствуют, unknown profile fail closed, internal default отсутствует, fallback отсутствует, dangerous permissions отсутствуют, `shell=false`, write/command disabled, non-zero exit→FAILED, timeout→TIMEOUT, cancellation→CANCELLED, diagnostics несут фактическую модель. Существующие read-only security tests не ослаблены (capability denial, output limit, patch-first, fake-success rejection сохранены).

`src/lib/worker-registry/__tests__/three-workers-e2e.ts` — изменена **только** Antigravity-секция: добавлен `requestedProfile: 'CODE_REVIEW'`, assertions на явный `--model`, отсутствие stale значения, `modelProfile==='primary'`, и diagnostics в результате. Codex/Claude секции не тронуты.

## Этап 7 — Static scan

```
git grep -i -E "gemini-2\.5-pro|gemini-2\.5-flash" -- src/lib/worker-registry package.json
# 0 matches
ACTIVE_STALE_ANTIGRAVITY_MODEL_CONSTANTS_FOUND=0
```

```
git grep -E "dangerously-skip-permissions|shell:\s*true" -- src/lib/worker-registry
# 2 matches — оба negative test guards (asserting absence), не production:
#   antigravity-worker.test.ts: expect(...includes('--dangerously-skip-permissions')).toBe(false)
#   three-workers-e2e.ts: if (agyPlan.args.some(arg => arg.includes('--dangerously-skip-permissions')))
# shell:true в production отсутствует.
```

## Этап 8 — Targeted validation

```
npm run workers:typecheck  -> exit 0   WORKERS_TYPECHECK_STATUS=PASS
npx vitest run .../antigravity-worker.test.ts -> 27/27 PASS   ANTIGRAVITY_UNIT_TEST_STATUS=PASS
npm run workers:test      -> 27/27 PASS   WORKERS_TEST_STATUS=PASS
```

## Этап 9 — Primary real adapter E2E

Workspace: `D:\JARVIS_WORKSPACES\phase05-verification\antigravity-primary-model-final`, foreground, ровно один запуск, `requestedProfile='DEEP_REASONING'` (primary).

```
EXECUTABLE=C:\Users\Admin\AppData\Local\agy\bin\agy.exe
VERSION=1.1.7
ARGS=["--add-dir",<ws>,"--mode","plan","--model","gemini-3.1-pro-high","-p",<prompt>]
SHELL=false
HAS_MODEL_FLAG=true  MODEL_ARG_VALUE=gemini-3.1-pro-high
MODEL_PROFILE=primary  MODEL_LABEL=Gemini 3.1 Pro  MODEL_CLI_VALUE=gemini-3.1-pro-high
DANGEROUS_FLAG=false
STATUS=SUCCESS  EXIT_CODE=0  DURATION_MS=15766
STDOUT_SUMMARY="TOKENS=3\n"  STDERR_SUMMARY=""
RESULT_MODEL_PROFILE=primary  RESULT_MODEL_CLI_VALUE=gemini-3.1-pro-high
RESULT_MODEL_SELECTION=explicit-cli-argument  RESULT_MODEL_FALLBACK_USED=false
RESULT_INTERNAL_DEFAULT_ALLOWED=false  RESULT_DANGEROUS_PERMS=false
CREATED_FILES=[]  WORKSPACE_CHANGED=false  STDOUT_HAS_TOKENS3=true
```

```
PRIMARY_MODEL_REAL_E2E_STATUS=PASS
PRIMARY_MODEL_EXPLICIT_ARGUMENT_STATUS=PASS
PRIMARY_MODEL_NO_WRITE_STATUS=PASS
PRIMARY_MODEL_NO_COMMAND_STATUS=PASS
PRIMARY_MODEL_NO_FALLBACK_STATUS=PASS
```

## Этап 10 — Fast real adapter E2E

Workspace: `D:\JARVIS_WORKSPACES\phase05-verification\antigravity-fast-model-final`, foreground, ровно один запуск, `requestedProfile='FAST'` (fast).

```
ARGS=["--add-dir",<ws>,"--mode","plan","--model","gemini-3.6-flash-medium","-p",<prompt>]
SHELL=false  HAS_MODEL_FLAG=true  MODEL_ARG_VALUE=gemini-3.6-flash-medium
MODEL_PROFILE=fast  MODEL_LABEL=Gemini 3.6 Flash  MODEL_CLI_VALUE=gemini-3.6-flash-medium
DANGEROUS_FLAG=false
STATUS=SUCCESS  EXIT_CODE=0  DURATION_MS=11008
STDOUT_SUMMARY="TOKENS=2\n"  STDERR_SUMMARY=""
RESULT_MODEL_PROFILE=fast  RESULT_MODEL_CLI_VALUE=gemini-3.6-flash-medium
RESULT_MODEL_SELECTION=explicit-cli-argument  RESULT_MODEL_FALLBACK_USED=false
RESULT_INTERNAL_DEFAULT_ALLOWED=false  RESULT_DANGEROUS_PERMS=false
CREATED_FILES=[]  WORKSPACE_CHANGED=false  STDOUT_HAS_TOKENS2=true
```

```
FAST_MODEL_REAL_E2E_STATUS=PASS
FAST_MODEL_EXPLICIT_ARGUMENT_STATUS=PASS
FAST_MODEL_NO_WRITE_STATUS=PASS
FAST_MODEL_NO_COMMAND_STATUS=PASS
FAST_MODEL_NO_FALLBACK_STATUS=PASS
```

## Этап 11 — Settings integrity

`C:\Users\Admin\.gemini\antigravity-cli\settings.json` (credentials не читались/не выводились):

```
PRE_SHA256 (baseline, до E2E)   = CA1ACB0F3F71B9A10AAB7DAC88A591610B83B7EA58570C791798284FCB2E7026
POST_FAST_SHA256 (после E2E)    = CA1ACB0F3F71B9A10AAB7DAC88A591610B83B7EA58570C791798284FCB2E7026
ANTIGRAVITY_SETTINGS_HASH_MATCH=TRUE
ANTIGRAVITY_SETTINGS_CHANGED=FALSE
```

Trusted workspace list не расширен, wildcard/`permissions.allow` не появились, временные E2E paths и выбранная модель в global settings не записаны.

## Этап 12 — Full validation

```
npm run workers:typecheck -> exit 0   WORKERS_TYPECHECK_STATUS=PASS
npm run workers:test      -> exit 0   WORKERS_TEST_STATUS=PASS
npm run typecheck          -> exit 0   PROJECT_TYPECHECK_STATUS=PASS
npm test                   -> exit 0   PROJECT_TEST_STATUS=PASS  (58 files / 395 tests)
npm run lint               -> exit 0   PROJECT_LINT_STATUS=PASS   (0 errors; 8 pre-existing warnings, вне scope)
npm run build              -> exit 0   PROJECT_BUILD_STATUS=PASS
```

## Этап 13 — Change-scope audit

`git diff --name-status -- src/lib/worker-registry`:

```
M src/lib/worker-registry/__tests__/antigravity-worker.test.ts
M src/lib/worker-registry/__tests__/three-workers-e2e.ts
M src/lib/worker-registry/adapters/antigravity-cli.ts
M src/lib/worker-registry/types.ts
```

`git diff --cached --name-status` — пусто (индекс не изменён). `git rev-parse HEAD` = `ac4550ab…` (не сдвинут).

Codex adapter (`codex-cli.ts`), Claude adapter (`claude-code.ts`), Prisma, migrations, auth-route, package.json/package-lock.json — данной правкой **не изменялись** (предсуществующие unrelated изменения owner-а сохранены как есть). База данных не модифицировалась. Global Antigravity settings не изменены.

Отчёт `docs/jarvis/05ZLPA_antigravity_model_routing_repair.md` — untracked, **в Git index не добавлен**.

```
CODEX_FILES_CHANGED_BY_THIS_RUN=FALSE
CLAUDE_FILES_CHANGED_BY_THIS_RUN=FALSE
PRISMA_CHANGED_BY_THIS_RUN=FALSE
MIGRATIONS_CHANGED_BY_THIS_RUN=FALSE
AUTH_ROUTE_CHANGED_BY_THIS_RUN=FALSE
PACKAGE_FILES_CHANGED_BY_THIS_RUN=FALSE
GIT_INDEX_CHANGED=FALSE
DATABASE_MODIFIED=FALSE
ANTIGRAVITY_SETTINGS_CHANGED=FALSE
```

## ФИНАЛЬНЫЙ БЛОК

```
ANTIGRAVITY_EXECUTABLE=C:\Users\Admin\AppData\Local\agy\bin\agy.exe
ANTIGRAVITY_VERSION=1.1.7

ANTIGRAVITY_PRIMARY_MODEL_LABEL=Gemini 3.1 Pro
ANTIGRAVITY_PRIMARY_MODEL_CLI_VALUE=gemini-3.1-pro-high
ANTIGRAVITY_PRIMARY_MODEL_CLI_VALUE_VERIFIED=TRUE

ANTIGRAVITY_FAST_MODEL_LABEL=Gemini 3.6 Flash
ANTIGRAVITY_FAST_MODEL_CLI_VALUE=gemini-3.6-flash-medium
ANTIGRAVITY_FAST_MODEL_CLI_VALUE_VERIFIED=TRUE

ANTIGRAVITY_MODEL_SELECTION_MODE=EXPLICIT_CLI_ARGUMENT
ANTIGRAVITY_INTERNAL_DEFAULT_MODEL_ALLOWED=FALSE
ANTIGRAVITY_UNKNOWN_MODEL_FALLBACK=DISABLED

ACTIVE_STALE_ANTIGRAVITY_MODEL_CONSTANTS_FOUND=0

ANTIGRAVITY_MODEL_RESOLUTION_STATUS=PASS
ANTIGRAVITY_EXECUTION_PLAN_MODEL_STATUS=PASS
ANTIGRAVITY_MODEL_DIAGNOSTICS_STATUS=PASS

ANTIGRAVITY_READ_ONLY_POLICY_STATUS=PASS
ANTIGRAVITY_WRITE_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_COMMAND_CAPABILITY_STATUS=DISABLED
ANTIGRAVITY_SETTINGS_MUTATION_STATUS=PASS
ANTIGRAVITY_BYPASS_FLAG_STATUS=PASS

ANTIGRAVITY_UNIT_TEST_STATUS=PASS
WORKERS_TEST_STATUS=PASS

PRIMARY_MODEL_REAL_E2E_STATUS=PASS
PRIMARY_MODEL_EXPLICIT_ARGUMENT_STATUS=PASS
PRIMARY_MODEL_NO_WRITE_STATUS=PASS
PRIMARY_MODEL_NO_COMMAND_STATUS=PASS
PRIMARY_MODEL_NO_FALLBACK_STATUS=PASS

FAST_MODEL_REAL_E2E_STATUS=PASS
FAST_MODEL_EXPLICIT_ARGUMENT_STATUS=PASS
FAST_MODEL_NO_WRITE_STATUS=PASS
FAST_MODEL_NO_COMMAND_STATUS=PASS
FAST_MODEL_NO_FALLBACK_STATUS=PASS

ANTIGRAVITY_SETTINGS_HASH_MATCH=TRUE
ANTIGRAVITY_SETTINGS_CHANGED=FALSE

WORKERS_TYPECHECK_STATUS=PASS
PROJECT_TYPECHECK_STATUS=PASS
PROJECT_TEST_STATUS=PASS
PROJECT_LINT_STATUS=PASS
PROJECT_BUILD_STATUS=PASS

CODEX_FILES_CHANGED_BY_THIS_RUN=FALSE
CLAUDE_FILES_CHANGED_BY_THIS_RUN=FALSE
PRISMA_CHANGED_BY_THIS_RUN=FALSE
MIGRATIONS_CHANGED_BY_THIS_RUN=FALSE
AUTH_ROUTE_CHANGED_BY_THIS_RUN=FALSE
PACKAGE_FILES_CHANGED_BY_THIS_RUN=FALSE
GIT_INDEX_CHANGED=FALSE
DATABASE_MODIFIED=FALSE
ANTIGRAVITY_SETTINGS_CHANGED=FALSE

P0_FINDINGS=0
P1_FINDINGS=0
ANTIGRAVITY_MODEL_ROUTING_REPAIR_STATUS=PASS
PHASE_05_RELEASE_STATUS=MODEL_ROUTING_REPAIR_VALIDATED_NOT_COMMITTED
NEXT_ALLOWED_ACTION=OWNER_APPROVES_ANTIGRAVITY_MODEL_ROUTING_COMMIT
```

Остановлено. Commit не создан. Push не выполнен. Phase 06 не запущена.