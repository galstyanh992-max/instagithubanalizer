# JARVIS Phase B — final integration report

Дата проверки: 2026-08-09. Ветка: `feat/jarvis-agent-hub`. Базовый commit: `16ab70321abbb227b7908f133a62f11453ceb485`.

## Решение

Phase B завершена со статусом PASS. Существующая архитектура Phase A расширена без второго оркестратора: 22 внешних компонента представлены единым каталогом программ, capability registry, runtime adapters и десятью subordinate agent profiles. Реальные публикации, массовые сообщения, PSTN-звонки, сделки и production deploy не выполнялись.

Финальный реестр содержит 74 динамически обнаруженные программы. Из них ровно 22 — записи Phase B; остальные изменения относительно baseline 43 возникли из текущего auto-discovery локальной машины. Capability registry содержит 368 уникальных capability names; 79 из них добавлены каталогом Phase B.

## Реализованная архитектура

- Automation Center: Docker-on-demand n8n, lifecycle start/stop/restart/status/logs/configuration, детерминированный fixture workflow, execution history и observability summary.
- Social Center: research/idea/draft/preview/approval pipeline. Approval не публикует контент автоматически.
- Messages Center: MANUAL, DRAFT_ONLY и AUTO_SAFE policy, классификация риска и escalation event. Текст сообщения не сохраняется в локальном control-plane.
- Calls Center: локальная LiveKit-shaped session; внешний звонок требует approval и не выполнялся.
- Video Center: сценарий, storyboard fixture, profile 9:16/16:9 и очередь без внешней публикации.
- Design, Document, Meeting, Vision, Mobile, Security API, Trading и Deployment centers зарегистрированы как ограниченные или отключённые профили.
- Dashboard Programs и `/phase-b` показывают lifecycle, Docker state, center counters, tasks/logs и Approval Center.
- Supabase используется как single-owner control plane; локальный JSON остаётся безопасным fallback.

## Third-party inventory

Проверены repository identity, canonical repository, release/tag, current HEAD SHA, license и root manifests для всех 22 компонентов. Чужие install/postinstall scripts не запускались. n8n runtime закреплён по OCI digest `sha256:3989d9b8ebb77b4ee8f604519eb73e44f4384bfaa689526e0104eed79a237d30`.

Enabled/on-demand: n8n, TrendRadar, Telegram grammY, Penpot, Paperless-ngx. Остальные сервисы сохранены как registered-disabled, optional, remote profile, research-only или POC согласно policy. Это не выдаётся за живую установку.

## Supabase

Миграция `20260809000000_phase_b_control_plane` добавила 19 metadata-only таблиц: social accounts/sources/competitors, ideas/drafts/assets/publication jobs/metrics, message accounts/references/attachments/events/escalations, call sessions/events/transcripts/summaries и automation workflow/run references.

Для всех 19 таблиц включён RLS, ownerUserId обязателен, authenticated policy использует `(select auth.uid())::text = "ownerUserId"`. Миграция применена к подключённой Supabase, `prisma migrate status` подтверждает: 7 migrations, schema up to date. Transactional CRUD и RLS catalog smoke прошли.

## Docker и n8n acceptance

- Контейнер: `jarvis-phase-b-n8n`.
- Порт: только `127.0.0.1:15678`.
- Persistent volume: `jarvis-phase-b-n8n-data`, сохранён.
- Чистый isolated E2E volume был создан только на время проверки и удалён после неё.
- Lifecycle и deterministic workflow integration: 2/2 tests PASS.
- Старый том после аварийного выключения повторно проверен: readiness вернул HTTP 200; контейнер затем штатно остановлен.
- Финальное состояние: Docker доступен, Phase B services running = 0, n8n = stopped/on-demand.

## Browser acceptance

Authenticated headless Playwright flow прошёл через реальный Supabase owner session. Проверены dashboard, n8n stop → automatic start → readiness → fixture import/run, metrics/logs, social draft + approval, sensitive-message escalation, video storyboard, local call и Approval Center.

Результат: dashboard, lifecycle, workflow, metrics, logs, social draft/approval, message escalation, video fixture и local call — PASS. `externalSideEffects=false`.

## Security

Codex Security standard scan завершён и запечатан:

- Scan ID: `30d61668-e9f5-42c0-a3a8-bcd57d95e668`.
- Исходный snapshot: 1546 файлов.
- Pre-remediation findings: 2 high, 5 medium, 3 low.
- Canonical artifacts: `scan-manifest.json`, `findings.json`, `coverage.json`, `report.md`, SARIF.

После scan исправлены обе high-находки: active HTML/SVG/JS больше не выдаётся inline с origin JARVIS, а safe-prefix terminal commands отклоняют shell control syntax. Также исправлены component-aware path containment и link resolution, arbitrary n8n workflow approval bypass, disabled-program execution, plaintext message/raw n8n result persistence, owner-scoping/atomic approval decisions, raw DSN diagnostics, mutable n8n image и Docker log redaction. Queue fallback теперь восстанавливается после I/O failure и пишет файл с restrictive mode; межпроцессный CAS для JSON fallback остаётся low residual hardening item, а Supabase остаётся primary transactional control-plane.

Secret smoke подтверждает: real `.env` не tracked, `.env.example` не содержит real-looking secrets, production auth fail-closed. `npm audit` — 0 известных уязвимостей.

## Quality gates и regression

- TypeScript: PASS.
- ESLint: PASS, 0 errors, 6 existing warnings.
- Unit/regression: 69 files passed, 1 skipped; 480 tests passed, 2 skipped.
- n8n integration: 2/2 PASS на isolated volume; persistent-volume readiness PASS.
- Production build: PASS, 103 routes.
- npm audit: PASS, 0 vulnerabilities.
- Repo health, security smoke, command router, brain, MCP bridge, DB config и local-agent-runtime smoke: PASS.
- Phase A baseline и task/queue behaviors: PASS.

`git diff --check` всё ещё сообщает whitespace в ранее существовавших пользовательских изменениях вне Phase B; эти файлы не переписывались. Force push, commit, удаление пользовательских данных и production actions не выполнялись.

## Документация

Обновлены Phase B architecture, automation, social, messages, calls, video, design, Docker services и security/supply-chain документы. Этот отчёт является итоговой точкой handoff. Следующий этап может добавить credential-backed Postiz/Telegram/LiveKit adapters, registry-signature verification и DB-only fallback locking, не меняя текущие safety defaults.

PHASE_B_STATUS=PASS

PHASE_A_REGRESSION=PASS
QUEUE_REGRESSION=PASS

JARVIS_CORE=PASS
CAPABILITY_REGISTRY=PASS
PROGRAM_REGISTRY=PASS
AUTO_DISCOVERY=PASS
DASHBOARD_PROGRAMS=PASS

PHASE_A_PROGRAMS_BASELINE=43
PROGRAMS_TOTAL=74
NEW_PROGRAMS_REGISTERED=22
PROGRAMS_HEALTHY=30
PROGRAMS_DEGRADED=2
PROGRAMS_OFFLINE=9
PROGRAMS_DISABLED=17
PROGRAMS_MISSING=20

CAPABILITIES_BASELINE=201
CAPABILITIES_TOTAL=368
NEW_CAPABILITIES=79

MCP_SERVERS_BASELINE=3
MCP_SERVER_COUNT=3

MCP_TOOLS_BASELINE=52
MCP_TOOL_COUNT=52

AUTOMATION_CENTER=PASS
N8N=PASS
N8N_MCP=NOT_INSTALLED
N8N_WORKFLOW_SMOKE=PASS

SOCIAL_CENTER=PASS
POSTIZ=REGISTERED_DISABLED
POSTIZ_AGENT=REGISTERED_DISABLED
TREND_RADAR=NOT_INSTALLED
CHANGEDETECTION=REGISTERED_DISABLED
SOCIAL_DRAFT_PIPELINE=PASS
SOCIAL_APPROVAL_PIPELINE=PASS
REAL_SOCIAL_POST_SENT=NO

MESSAGES_CENTER=PASS
EVOLUTION_API=REGISTERED_DISABLED
TELEGRAM=NOT_CONFIGURED
MESSAGE_ESCALATION=PASS
MASS_MESSAGES_SENT=NO

CALLS_CENTER=PASS
LIVEKIT=REGISTERED_DISABLED
LOCAL_VOICE_SESSION=PASS
EXTERNAL_CALLS_MADE=NO

VIDEO_CENTER=PASS
OPENMONTAGE=REGISTERED_DISABLED
VIDEO_STARTER_KIT=REGISTERED_DISABLED
MONEY_PRINTER_TURBO=REGISTERED_DISABLED
VIDEO_PIPELINE_SMOKE=PASS

DESIGN_CENTER=PASS
PENPOT=REGISTERED_DISABLED

DOCUMENT_ARCHIVE=PASS
PAPERLESS=REGISTERED_DISABLED

MEETING_CENTER=PASS
MEETILY=REGISTERED_DISABLED

EDGE_AI=PASS
SIPP=DISABLED

VISION_CENTER=PASS
CAM2IP=DISABLED
CAMERA_DEFAULT_OFF=YES

MOBILE_WORKER=PASS
PHONECLAW=NO_TEST_DEVICE

SECURITY_API_TOOL=PASS
VESPASIAN=REGISTERED_DISABLED

TRADING_RESEARCH=PASS
NAUTILUS_TRADER=REGISTERED_DISABLED
LIVE_TRADING_ENABLED=NO
REAL_TRADES_EXECUTED=NO

DEPLOYMENT_CENTER=PASS
COOLIFY=REMOTE_PROFILE
CERTIMATE=REGISTERED_DISABLED
PRODUCTION_DEPLOYED=NO

DOCKER=PASS
DOCKER_PHASE_B_SERVICES=1
DOCKER_RUNNING_SERVICES=0
DOCKER_ON_DEMAND_POLICY=PASS

APPROVAL_CENTER=PASS

ADAPTED_AGENTS_TOTAL=34
ADAPTED_SKILLS_TOTAL=4
ADAPTED_TOOLS_TOTAL=25
ADAPTED_MCP_TOTAL=52
ADAPTED_PROVIDERS_TOTAL=3

TYPECHECK=PASS
LINT=PASS
UNIT_TESTS=PASS
INTEGRATION_TESTS=PASS
BUILD=PASS
NPM_AUDIT=PASS

SECRETS_EXPOSED=NO
USER_FILES_DELETED=NO
FORCE_PUSH_USED=NO
REAL_SOCIAL_POST_SENT=NO
MASS_MESSAGES_SENT=NO
EXTERNAL_CALLS_MADE=NO
REAL_TRADES_EXECUTED=NO
PRODUCTION_TOUCHED=NO

DEV_SERVER=ONLINE
DEV_SERVER_URL=http://localhost:3000

BLOCKERS=none

FINAL_DECISION=PASS

## REGISTRY RECONCILIATION

Дата проверки: 2026-08-09. Reconciliation выполнялась без Phase C, без установки новых программ и без добавления продуктовых функций. Единственное исправление — удаление доказанных stale implementation records, возникавших после пересоздания Docker-контейнера под тем же уникальным Docker name.

### Каноническая модель подсчёта

В предыдущем блоке были смешаны две разные единицы:

- `201` в отчёте Phase A — физические `CapabilityRecord` в snapshot реестра;
- `79` — generic identifiers внутри `capabilities[]` 22 записей Phase B;
- `368` — прежнее количество уникальных строк после flatten всех `capabilities[]`, а не количество записей реестра.

Поэтому арифметический остаток `368 - 201 - 79 = 88` не является множеством 88 новых capabilities: из агрегатов разных размерностей невозможно и неправильно строить перечень таких ID. После полного authoritative refresh актуальны две независимые проверяемые метрики:

- physical capability records: `242`;
- unique generic capability identifiers: `375` (против прежних `368`; 18 materialized internal records добавили только 7 новых generic names, остальные пересекаются с уже зарегистрированными names).

Физический реестр точно сходится: `201 baseline + 22 Phase B implementation records + 1 auto-discovered n8n Docker implementation + 18 materialized internal records = 242`. Состояние до очистки содержало ещё 8 stale Docker capability records (`250`); они не входят в итог.

Текущие 242 записи распределены так: 66 program-derived, 25 tool-adapter, 67 runtime-tool, 24 agent, 3 skill, 1 provider, 4 model и 52 MCP-tool records. Generic capability — строка в `capabilities[]`; implementation — отдельная запись с собственными `id`, `source`, `adapter`, enabled/health. Совпадение generic name у разных implementations является маршрутизируемым выбором провайдера, а не дублем. Например browser operations одновременно реализуются CamoFox, Browser Use, Playwright MCP и runtime tool bridge, при этом их implementation IDs различны.

### Program count: происхождение +9 и исправление

До исправления было 74 записи. Относительно `43 + 22` разницу объясняли ровно одна действующая auto-discovered implementation и восемь stale Docker-ID aliases:

| id | name | type | category | source | why_created | installed / enabled / health до очистки | discovered_by | adapter | phase | classification |
|---|---|---|---|---|---|---|---|---|---|---|
| `docker:2db589cc7146` | jarvis-phase-b-n8n | docker_service | DOCKER SERVICES | docker-discovery | Реальный контейнер n8n появился при Phase B | true / true / UNKNOWN | `docker ps -a` | docker_service inventory | B implementation | AUTO_DISCOVERED |
| `docker:842e88e5808d` | jarvis-phase-b-n8n | docker_service | DOCKER SERVICES | docker-discovery | Старый ID того же пересозданного контейнера | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | B implementation | STALE |
| `docker:c059dd49e5bc` | jarvis-phase-b-n8n | docker_service | DOCKER SERVICES | docker-discovery | Старый ID того же пересозданного контейнера | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | B implementation | STALE |
| `docker:d9e9338a8d59` | jarvis-phase-b-n8n | docker_service | DOCKER SERVICES | docker-discovery | Старый ID того же пересозданного контейнера | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | B implementation | STALE |
| `docker:78a9d37d96a3` | chatbot-ragflow-es01-1 | docker_service | DOCKER SERVICES | docker-discovery | Старый ID контейнера с тем же Docker name | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | A implementation | STALE |
| `docker:69567bca10d2` | chatbot-ragflow-minio-1 | docker_service | DOCKER SERVICES | docker-discovery | Старый ID контейнера с тем же Docker name | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | A implementation | STALE |
| `docker:31b6f18b4231` | chatbot-ragflow-mysql-1 | docker_service | DOCKER SERVICES | docker-discovery | Старый ID контейнера с тем же Docker name | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | A implementation | STALE |
| `docker:91acf1bd006c` | chatbot-ragflow-ragflow-cpu-1 | docker_service | DOCKER SERVICES | docker-discovery | Старый ID контейнера с тем же Docker name | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | A implementation | STALE |
| `docker:5bc8d53ae8c9` | chatbot-ragflow-redis-1 | docker_service | DOCKER SERVICES | docker-discovery | Старый ID контейнера с тем же Docker name | false / true / MISSING | сохранён merge старого snapshot | docker_service inventory | A implementation | STALE |

Исправленные `ProgramRegistry.mergeDiscovery` и `CapabilityRegistry.mergeDiscovery` теперь считают текущую Docker-запись с тем же case-normalized уникальным Docker name заменой старого container ID. Исчезнувшие компоненты с другим name по-прежнему сохраняются как `MISSING`; valid entries ради цифры не удаляются. Тесты проверяют обе семантики. После authenticated authoritative refresh: 66 programs, duplicate IDs 0, duplicate names 0, stale Docker records 0. Формула: `43 + 22 + 1 = 66`.

### Capability record provenance

22 Phase B implementation records (в скобках число generic bindings): `n8n(9)`, `n8n-mcp(2)`, `postiz(5)`, `postiz-agent(1)`, `trend-radar(4)`, `changedetection(4)`, `evolution-api(4)`, `telegram-grammy(3)`, `livekit-agents(4)`, `openmontage(3)`, `video-starter-kit(2)`, `money-printer-turbo(3)`, `penpot(3)`, `paperless(4)`, `sipp(1)`, `cam2ip(6)`, `phoneclaw(5)`, `vespasian(5)`, `coolify(3)`, `certimate(2)`, `meetily(2)`, `nautilus-trader(4)`. Итого 22 records / 79 unique declared generic bindings; IDs уникальны, source program совпадает с record id, source adapter соответствует `kind`, alias отсутствует.

Одна дополнительная auto-discovered запись: `docker:2db589cc7146`, kind `docker_service`, implementation `jarvis-phase-b-n8n`, source program `jarvis-phase-b-n8n`, source adapter `docker_service`, phase B, enabled=true, health=UNKNOWN в штатном STOPPED режиме, generic binding `container_service`, alias=false.

18 materialized internal records существовали в кодовых реестрах до reconciliation, но отсутствовали в persisted snapshot:

- runtime tools (15, kind=tool, source=`runtime-tool-registry`, enabled=true, health=HEALTHY): `browser_operator`, `calculator`, `file_reader`, `filesystem.list`, `filesystem.read`, `filesystem.search`, `filesystem.write`, `git.status`, `http_request`, `memory.search`, `project.build`, `project.lint`, `project.typecheck`, `terminal.exec`, `web.search`;
- skills (3, kind=skill, source=`jarvis-skill-registry`, adapter=`skill-runtime`, enabled=true, health=HEALTHY): `planning`, `summarization`, `validation`.

Они являются internal implementation records Phase A, не aliases и не фальшивыми generic capabilities. Восемь удалённых stale capability records имели те же Docker IDs, что и восемь удалённых program records в таблице выше. После очистки: duplicate capability IDs 0, semantic implementation duplicates 0, orphan records 0, stale Docker capabilities 0, invalid health 0.

### Phase A regression: 43/43

Phase A не сохраняла отдельный исторический status каждого Docker row, только агрегат `37 healthy / 1 degraded / 6 offline / 4 missing`; поэтому ниже `phase_a_status` берётся из финальных component gates, а не реконструируется выдуманным per-row значением. Все текущие значения получены новым discovery.

| program | phase_a_status | current_status | health | enabled | running | reason_for_change |
|---|---|---|---|---:|---:|---|
| Node.js | READY | OFFLINE | HEALTHY | true | false | CLI установлен; OFFLINE означает не daemon |
| Python | READY | OFFLINE | HEALTHY | true | false | CLI установлен; OFFLINE означает не daemon |
| Git | READY | OFFLINE | HEALTHY | true | false | CLI установлен; OFFLINE означает не daemon |
| Docker | PASS | OFFLINE | HEALTHY | true | false | CLI/daemon доступны; command record не long-running |
| Claude Code | READY | OFFLINE | HEALTHY | true | false | on-demand CLI, не запущен сейчас |
| Codex CLI | READY | OFFLINE | HEALTHY | true | false | on-demand CLI, не запущен сейчас |
| Antigravity | NOT_INSTALLED | MISSING | MISSING | true | false | допустимый optional CLI отсутствует |
| OpenCode | OPTIONAL_NOT_INSTALLED | MISSING | MISSING | true | false | допустимый optional CLI отсутствует |
| Ollama Local | PASS | ONLINE | HEALTHY | true | true | `/api/tags` отвечает, модели обнаружены |
| JARVIS Core | PASS | ONLINE | HEALTHY | true | true | internal runtime |
| Graphify | PASS | ONLINE | HEALTHY | true | true | модуль и endpoint обнаружены |
| CamoFox Browser | PASS | ONLINE | HEALTHY | true | true | browser worker online |
| Browser Use | PASS | READY | HEALTHY | true | false | реальный venv 0.13.7, on-demand |
| Crawl4AI | PASS | READY | HEALTHY | true | false | реальный venv 0.9.2, on-demand |
| Agent Reach | PASS | READY | HEALTHY | true | false | реальный venv 1.5.0, on-demand |
| Faster Whisper | PASS | READY | HEALTHY | true | false | реальный venv 1.2.1, on-demand |
| yt-dlp | PASS | READY | HEALTHY | true | false | executable 2026.07.04, on-demand |
| Repomix | PASS | READY | HEALTHY | true | false | Node implementation 1.18.0, on-demand |
| Chatterbox TTS | OPTIONAL | NOT_INSTALLED | MISSING | true | false | optional heavyweight; Edge TTS fallback сохранён |
| Document Router | PASS | DEGRADED | DEGRADED | true | false | 2/2 engines доступны; PDF идёт через OpenDataLoader, Docling PDF fallback ограничен |
| MCP Runtime | PASS | ONLINE | HEALTHY | true | true | 3 connections, live discovery |
| Desktop Commander MCP | PASS | ONLINE | HEALTHY | true | true | 26 tools обнаружены |
| Playwright MCP | PASS | ONLINE | HEALTHY | true | true | 24 tools обнаружены |
| Jina MCP | PARTIAL | ONLINE | HEALTHY | true | true | 2 разрешённых no-key tools; key-dependent tools не подменены |
| JARVIS Agents | PASS | ONLINE | HEALTHY | true | true | 24 agent records |
| JARVIS Skills | PASS | ONLINE | HEALTHY | true | true | 3 materialized skill records |
| JARVIS Tool Adapters | PASS | ONLINE | HEALTHY | true | true | 25 adapters |
| Cloud AI Providers | PASS | ONLINE | HEALTHY | true | true | provider router configured |
| chatbot-embedding | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| chatbot-ragflow-es01-1 | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| chatbot-ragflow-minio-1 | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| chatbot-ragflow-mysql-1 | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| chatbot-ragflow-ragflow-cpu-1 | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| chatbot-ragflow-redis-1 | REGISTERED | ONLINE | HEALTHY | true | true | Docker container реально running/healthy |
| legal-armenia-prompt19-db | REGISTERED | STOPPED | UNKNOWN | true | false | NOT_CURRENTLY_RUNNING; локальный контейнер не является JARVIS dependency |
| supabase_analytics_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | старый локальный stack остановлен; canonical remote Supabase доступен |
| supabase_auth_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_db_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_inbucket_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_kong_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_pg_meta_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_rest_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |
| supabase_storage_avmgtsonawtzebvazgcr | REGISTERED | STOPPED | UNKNOWN | true | false | то же |

Текущая Phase A taxonomy: 30 HEALTHY, 1 DEGRADED, 9 UNKNOWN/STOPPED и 3 optional MISSING. Снижение агрегата 37→30 не скрывает BROKEN/FAILED: семь пунктов различия относятся к изменившемуся runtime snapshot/taxonomy остановленных Docker implementations. Targeted Phase A smoke: 10 файлов / 41 тест PASS; OpenDataLoader/Docling routing включён в него. Реальных регрессий: 0.

### Phase B reality: 22/22

`adapter_real=YES` означает: зарегистрирован `PhaseBServiceAdapter`, capabilities и configuration schema доступны, status/health вычисляются из credentials/lifecycle/runtime, а неподдержанная внешняя операция возвращает явный `EXTERNAL_OPERATION_NOT_IMPLEMENTED`, не fake success.

| program | integration_mode | installed | registered | enabled | running | adapter_real | health_check_real | smoke_test | reason_if_disabled |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| n8n | docker / DOCKER_ON_DEMAND | true | true | true | false | yes | Docker readiness | PASS workflow | штатно STOPPED после smoke |
| n8n MCP | mcp / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | не нужен для работающего CLI path; env отсутствует |
| Postiz | docker / DOCKER_ON_DEMAND | false | true | false | false | yes | config-aware | CONTRACT_PASS | POSTIZ API env отсутствует |
| Postiz Agent | api / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | POSTIZ API env отсутствует |
| TrendRadar | docker / DOCKER_ON_DEMAND | true | true | true | false | yes | lifecycle-aware | CONTRACT_PASS | on-demand/offline |
| changedetection.io | docker / DOCKER_ON_DEMAND | false | true | false | false | yes | config-aware | CONTRACT_PASS | API key отсутствует |
| Evolution API | docker / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | optional unofficial transport, env отсутствует |
| Telegram grammY | api / ENABLED_ON_DEMAND | true | true | true | false | yes | endpoint/config-aware | CONTRACT_PASS | adapter готов, transport on-demand |
| LiveKit Agents | api / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | LiveKit env отсутствует |
| OpenMontage | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | optional disabled |
| Video Starter Kit | api / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | FAL_KEY отсутствует |
| MoneyPrinterTurbo | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | optional disabled |
| Penpot | docker / DOCKER_ON_DEMAND | true | true | true | false | yes | lifecycle-aware | CONTRACT_PASS | on-demand/offline |
| Paperless-ngx | docker / DOCKER_ON_DEMAND | true | true | true | false | yes | lifecycle-aware | CONTRACT_PASS | on-demand/offline |
| Sipp | reference / POC_ONLY | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | POC only |
| cam2ip | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | camera default off |
| PhoneClaw | reference / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | no test device |
| Vespasian | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | authorized-use only, disabled |
| Coolify | remote / REMOTE_VPS_PROFILE | false | true | false | false | yes | config-aware | CONTRACT_PASS | remote env absent |
| Certimate | api / OPTIONAL_DISABLED | false | true | false | false | yes | config-aware | CONTRACT_PASS | API env absent |
| Meetily | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | optional disabled |
| NautilusTrader | native / OPTIONAL_DISABLED | false | true | false | false | yes | lifecycle-aware | CONTRACT_PASS | research-only, live trading false |

Итог: real adapters 22, placeholder adapters 0, installed 5, registered-disabled/not-configured 17, running 0 после возврата on-demand services в исходное состояние.

### n8n exact integration

- runtime: Docker Compose profile `automation`, OCI image pinned by digest, loopback endpoint `http://127.0.0.1:15678`;
- health: HTTP `GET /healthz/readiness` внутри/через loopback;
- workflow mechanism: `docker exec ... n8n import:workflow`, `list:workflow`, `execute --id=jarvisPhaseBSmoke001 --rawOutput`;
- evidence: `JARVIS_PHASE_B_N8N_E2E=1` — 2/2 integration tests PASS, deterministic fixture finished with `status=success`; arbitrary workflow IDs остаются approval-gated;
- n8n-mcp: `NOT_INSTALLED`, поскольку рабочий CLI path полностью покрывает Phase B и установка ради счётчика не выполнялась;
- после smoke контейнер возвращён в `STOPPED`.

### Dashboard/API/runtime consistency

Authenticated browser сверил один и тот же record между persisted registry, `/api/jarvis/programs`, DOM `data-status`/`data-health` и реальным discovery. Все 10 случаев совпали:

| component | Registry/API/Dashboard | real runtime evidence |
|---|---|---|
| Ollama Local | ONLINE / HEALTHY | `/api/tags` отвечает, models > 0 |
| Claude Code | OFFLINE / HEALTHY | executable существует; on-demand CLI не daemon |
| Antigravity | MISSING / MISSING | command отсутствует |
| Document Router | DEGRADED / DEGRADED | 2/2 engines; OpenDataLoader PDF fallback тест PASS |
| Browser Use | READY / HEALTHY | venv Python, version 0.13.7 |
| n8n | STOPPED / UNKNOWN | Docker state `exited` после smoke |
| cam2ip | DISABLED / UNKNOWN | installed=false, camera default off |
| Postiz | NOT_INSTALLED / MISSING | обязательные API settings отсутствуют |
| Telegram grammY | DEGRADED / DEGRADED | adapter installed, remote transport не запущен |
| chatbot-embedding | ONLINE / HEALTHY | Docker state `running healthy` |

Dashboard формирует cards из API payload; hardcoded program cards не обнаружены.

### Integrity и финальные gates

- Program IDs duplicates 0; capability IDs duplicates 0; semantic same-source implementations duplicates 0.
- Orphan capability records 0; orphan Phase B adapters 0; stale Docker implementations 0.
- Invalid program status 0; invalid program health 0; invalid capability health 0.
- Prisma schema valid; 7 migrations найдены; remote database schema up to date; broken migration/FK signal отсутствует.
- Registry reconciliation unit tests: 4/4 PASS.
- Phase A/Phase B centers/dashboard registry smoke: PASS.
- n8n integration: 2/2 PASS.
- Full unit suite: 70 files PASS, 1 skipped; 482 tests PASS, 2 skipped.
- Typecheck PASS; lint PASS с 0 errors и прежними 6 warnings; production build PASS, 103/103 pages.

```text
PHASE_B_RECONCILIATION=PASS

PROGRAMS_BASELINE=43
PHASE_B_REQUESTED_PROGRAMS=22
AUTO_DISCOVERED_PROGRAMS=1
INTERNAL_PROGRAM_RECORDS=0
DUPLICATE_PROGRAMS_REMOVED=8
PROGRAMS_TOTAL=66
PROGRAM_COUNT_RECONCILED=YES

CAPABILITIES_BASELINE=201
PHASE_B_DECLARED_NEW_CAPABILITIES=79
AUTO_DISCOVERED_CAPABILITIES=1
IMPLEMENTATION_CAPABILITIES=22
INTERNAL_CAPABILITIES=18
DUPLICATE_CAPABILITIES_REMOVED=8
CAPABILITIES_TOTAL=242
CAPABILITY_COUNT_RECONCILED=YES

PHASE_A_COMPONENTS_CHECKED=43
PHASE_A_REAL_REGRESSIONS=0
PHASE_A_REGRESSION=PASS

PHASE_B_COMPONENTS_CHECKED=22
REAL_ADAPTERS=22
PLACEHOLDER_ADAPTERS=0
REGISTERED_DISABLED=17
ACTUALLY_INSTALLED=5

N8N_INTEGRATION_MODE=DOCKER_COMPOSE_ON_DEMAND_PLUS_N8N_CLI
N8N_WORKFLOW_SMOKE=PASS

DASHBOARD_REALITY_CHECK=PASS
REGISTRY_INTEGRITY=PASS

TYPECHECK=PASS
LINT=PASS
UNIT_TESTS=PASS
INTEGRATION_TESTS=PASS
BUILD=PASS

FINAL_DECISION=PASS
```
