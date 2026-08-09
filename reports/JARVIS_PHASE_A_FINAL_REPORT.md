# JARVIS Phase A — итоговый отчёт

Дата проверки: 9 августа 2026 года  
Решение: **PARTIAL** — ядро Phase A, реестры, обнаружение программ, Dashboard и постоянная очередь импорта работают; часть необязательных внешних инструментов не установлена, а тестовый ответ локальной Ollama не завершился за отведённое время.

## Причина ошибки анализа JSONL

Зависание не было одной ошибкой. Оно возникало из сочетания четырёх причин:

1. После добавления Prisma-моделей старый процесс Next.js продолжал использовать устаревший Prisma Client и падал на `Cannot read properties of undefined (reading 'create')`.
2. Пул Supabase/PostgreSQL исчерпывал доступные session-соединения и возвращал `EMAXCONNSESSION: max clients reached`.
3. Несколько обработчиков могли одновременно захватить одну задачу: пакет помечался завершённым, пока элемент ещё имел состояние `analyzing`.
4. Перевод полного README запускался до проверки дубликата и мог последовательно ждать несколько AI-провайдеров по 90 секунд.

Исправления:

- JSON, JSONL и TXT теперь отправляются прямо в постоянную очередь без промежуточной загрузки в Storage;
- задача захватывается атомарно; повторно берутся только ожидающие или действительно зависшие задачи;
- итог пакета вычисляется по фактическим состояниям элементов;
- ошибки пула повторяются безопасно, а соединения Prisma ограничены;
- дубликат проверяется до GitHub-запросов, перевода и AI-анализа;
- переводятся только видимые описание и темы, исходный README не блокирует импорт;
- сетевые операции получили конечные тайм-ауты;
- действия и прогресс хранятся в PostgreSQL и не сбрасываются после перезагрузки страницы.

Проверка восстановления выполнена на двух пакетах `open-pencil/open-pencil`: оба завершились как `2/2 готово`, и это состояние сохранилось после перезагрузки страницы.

## Изменения архитектуры

- Добавлен единый слой платформы `src/lib/jarvis/platform`: контракт адаптеров, маршрутизатор возможностей, реестры программ и возможностей, автообнаружение, компилятор команд, каталог Phase A и конвейер адаптации.
- Реестры сохраняются атомарно в локальном состоянии `.jarvis/state`, имеют валидацию и ограничения размера.
- Интерфейс Dashboard получает данные через owner-only API, а не из статической разметки.
- Для Ollama используется отдельный локальный адаптер с health-check, списком моделей и ограниченным по времени inference.
- Очередь анализа репозиториев перенесена из временного состояния React в PostgreSQL через Prisma.

## Репозитории и компоненты

В каталоге Phase A зарегистрировано 35 проверенных записей с явным режимом интеграции. Каталог является декларативным: сторонний код не клонируется и не запускается автоматически. Запрещённый `galstyanh992-max/instagithubanalizer` исключён и дополнительно проверяется валидатором.

Категории: локальные CLI, npm/Python-зависимости, MCP-серверы, skills, Docker-сервисы, API-интеграции и reference-only источники. Полный перечень находится в `src/lib/jarvis/platform/phase-a-catalog.ts`.

Новые внешние программы автоматически не устанавливались. Автообнаружение нашло 33 программы/сервиса: 27 здоровы, 2 деградированы, 3 отсутствуют, 7 offline и 1 stopped.

## Programs installed / already installed / adapted

- Уже доступны: Node.js, npm, Git, Docker, Claude Code, Codex, Playwright, CamoFox, Supabase, Graphify и локальная Ollama.
- В рамках исправления обновлены безопасные версии npm-зависимостей; удалены неиспользуемые уязвимые зависимости.
- Не найдены: Antigravity, OpenCode, Desktop Commander, browser-use, Crawl4AI, Agent Reach, OpenDataLoader, Docling, faster-whisper, Chatterbox, yt-dlp и Repomix.
- Адаптировано в реестрах: 24 агента, 4 skills, 25 tools и 1 AI-provider. Живых MCP-подключений во время проверки не было.

## Skills, Agents, Tools, MCP и Providers

- Агентские и инструментальные записи нормализованы в Capability Registry.
- MCP Manager предоставляет контракт обнаружения подключений, но не подменяет отсутствие реально подключённых серверов фиктивными данными.
- Провайдеры маршрутизируются через существующий provider router; заглушка «анализ-заглушка» удалена. При невозможности реального вызова возвращается понятная русская ошибка.
- Секреты читаются только на сервере и не записываются в Dashboard, логи реестров или Docker metadata.

## Ollama

- Сервер: online.
- Версия: 0.32.6.
- Модели: `gemma4:12b`, `qwen2.5-coder:14b`, `phi4-mini:latest`, `deepseek-coder-v2:16b`.
- Health-check и получение списка моделей проходят.
- Тестовый inference `phi4-mini` не завершился за 60 секунд; измерение tokens/sec поэтому отсутствует. Адаптер останавливает такой запрос через 30 секунд и возвращает явную русскую ошибку вместо бесконечного ожидания.

## Capability Registry

Зарегистрировано 87 возможностей: system — 4, git — 1, docker service — 16, provider — 3, agent — 29, MCP server — 2, code intelligence — 1, browser — 1, skill — 1, tool — 25, model — 4. Реестр защищён от коллизий ручных и автоматически обнаруженных записей и ограничен 5000 записями/10 МиБ состояния.

## Program Registry

Реестр содержит 33 записи, хранит источник, состояние, health, версию, команды и возможности. Docker labels и секретные значения не сохраняются. Windows-обнаружение предпочитает `.exe`, корректно запускает PowerShell `.ps1` через `-File` и не выполняет произвольные shell-строки.

## Dashboard

Страница `/dashboard` переведена на динамические данные реестров. Во время финальной проверки она показала 33 программы, 87 возможностей и корректные сводные статусы без ошибки загрузки. Доступ к странице и API закрыт проверкой владельца; при отсутствии `JARVIS_OWNER_ID` проверка теперь fail-closed.

## Auto Discovery

Обнаружение покрывает системные CLI, Docker-контейнеры, AI-провайдеры, конфигурации агентов, tools, skills, MCP и модели Ollama. Оно только инвентаризирует известные источники и не устанавливает/не исполняет внешний код автоматически.

## Browser Workspace

- Playwright 1.61.1 установлен и успешно использован для проверки интерфейса.
- CamoFox отвечает на `localhost:9377`.
- browser-use, Crawl4AI, Jina MCP и Agent Reach не настроены; эти адаптеры остаются планируемыми.

## Document Center

Существующие файловые API сохранены, но единый Document Router с OpenDataLoader/Docling не реализован, поскольку оба движка отсутствуют. Это отдельный незавершённый пункт Phase A.

## Voice

Маршрут TTS очищен от уязвимой зависимости `google-tts-api`: используется фиксированный HTTPS endpoint, разбиение текста, лимит 2000 символов, timeout 15 секунд и лимит 2 МиБ на фрагмент. Локальные faster-whisper и Chatterbox не установлены.

## Media

Существующий локальный аудиоплеер не удалён. `yt-dlp` не установлен, поэтому расширенная обработка внешних медиа не заявляется как готовая.

## Supabase и постоянство данных

- Supabase/PostgreSQL доступен.
- Добавлены `RepositoryImportBatch` и `RepositoryImportItem` с миграцией.
- История последних 50 пакетов читается из БД.
- После перезапуска/перезагрузки очередь, прогресс, ошибки и результаты сохраняются.
- Ограничение Prisma pool снижает риск повторного исчерпания session pool.

## Graphify

Маршрут `/graphify` существует и загружается. Интеграция зарегистрирована как `INTEGRATED`.

## Desktop Commander

Исполняемый файл и активное MCP-подключение Desktop Commander не найдены. В каталоге присутствует только доступная для будущего подключения запись; фиктивная готовность не выставлялась.

## Безопасность

- Проведены два независимых обзора и финализация canonical security scan.
- Исправлены fail-open авторизация владельца, коллизии реестра, неограниченные тела/ответы, раскрытие сырых серверных ошибок, сохранение Docker labels и публичный доступ к Dashboard.
- `npm audit --omit=dev --audit-level=high`: 0 уязвимостей.
- Секреты не печатались и не переносились во frontend.
- Остаточное допущение: обнаружение локальных исполняемых файлов доверяет `PATH` владельца ОС; компрометация его учётной записи находится вне принятой границы угроз.

Canonical scan: `reports/security/jarvis-phase-a-20260808/scan-manifest.json`, `findings.json`, `coverage.json`, `report.md`.

## Тесты и сборка

- `npm test`: PASS — 66 файлов, 446 тестов.
- `npm run typecheck`: PASS.
- `npm run daemon:typecheck`: PASS.
- `npm run workers:typecheck`: PASS.
- Scoped ESLint для изменённых файлов Phase A: PASS.
- `npm run build`: PASS — Next.js 16.3.0, 103 маршрута/страницы.
- `npm audit --omit=dev --audit-level=high`: PASS — 0 уязвимостей.
- Scoped `git diff --check`: PASS.

Глобальный lint остаётся FAIL из-за существующих до Phase A артефактов recovery/vendor/temp/generated: 1269 ошибок и 3202 предупреждения. Глобальный `git diff --check` также видит 73 старых whitespace-проблемы в несвязанных пользовательских файлах; они намеренно не изменялись.

Предупреждения сборки: Next.js предлагает перенести legacy `middleware` в `proxy`; Turbopack сообщает о девяти существующих dynamic filesystem tracing местах. Эти предупреждения не остановили production build.

## Известные ограничения

- Локальная Ollama доступна, но тестовая генерация на текущем железе/модели не уложилась в 60 секунд.
- Нет живых MCP-подключений и MCP tools.
- Необязательные внешние CLI/voice/document/media-инструменты не устанавливались без явного разрешения.
- Единый Document Router не завершён.
- Глобальная lint-база проекта содержит большой объём старых ошибок вне изменённого контура.

## Ручные действия пользователя

Обязательных действий для сохранения JSONL-очереди нет. Для полного статуса Phase A потребуется отдельно:

1. Выбрать более быструю Ollama-модель или настроить ускорение и повторить inference benchmark.
2. Подключить нужные MCP-серверы, включая Desktop Commander/Jina при необходимости.
3. Установить только действительно нужные optional-инструменты из списка missing.
4. Отдельной задачей очистить старую глобальную lint-базу и при необходимости мигрировать Next.js middleware в proxy.

```text
PHASE_A_STATUS=PARTIAL
JARVIS_CORE=PASS
CAPABILITY_REGISTRY=PASS
PROGRAM_REGISTRY=PASS
AUTO_DISCOVERY=PASS
DASHBOARD_PROGRAMS=PASS

LOCAL_OLLAMA=PASS
OLLAMA_SERVER=ONLINE
OLLAMA_MODEL_COUNT=4
OLLAMA_TEST_INFERENCE=FAIL

CLAUDE_CODE=READY
CODEX=READY
ANTIGRAVITY=NOT_INSTALLED
OPENCODE=NOT_INSTALLED

DESKTOP_COMMANDER=NOT_FOUND
GRAPHIFY=PASS

MCP_GATEWAY=PASS
MCP_SERVER_COUNT=0
MCP_TOOL_COUNT=0

ADAPTED_AGENTS=24
ADAPTED_SKILLS=4
ADAPTED_TOOLS=25
ADAPTED_MCP=0
ADAPTED_PROVIDERS=1

BROWSER_WORKSPACE=PASS
BROWSER_USE=NOT_INSTALLED
PLAYWRIGHT=PASS
CAMOFOX=PASS
CRAWL4AI=NOT_INSTALLED
JINA_MCP=NOT_CONFIGURED
AGENT_REACH=NOT_INSTALLED

DOCUMENT_ROUTER=FAIL
OPENDATALOADER=NOT_INSTALLED
DOCLING=NOT_INSTALLED

FASTER_WHISPER=NOT_INSTALLED
CHATTERBOX=NOT_INSTALLED

YTDLP=NOT_INSTALLED
REPOMIX=NOT_INSTALLED

SUPABASE=PASS

PROGRAMS_TOTAL=33
PROGRAMS_HEALTHY=27
PROGRAMS_DEGRADED=2
PROGRAMS_OFFLINE=8
PROGRAMS_MISSING=3

TYPECHECK=PASS
LINT=FAIL
UNIT_TESTS=PASS
INTEGRATION_TESTS=PASS
BUILD=PASS

SECRETS_EXPOSED=NO
USER_FILES_DELETED=NO
FORCE_PUSH_USED=NO
PRODUCTION_TOUCHED=NO

BLOCKERS=Ollama inference did not finish in 60s; 0 live MCP connections; optional Phase A tools are not installed; global lint is blocked by pre-existing recovery/vendor/generated files.
FINAL_DECISION=PARTIAL
```

---

## Completion / Repair Pass — 9 августа 2026

Предыдущий результат `PARTIAL` выше сохранён как историческая исходная точка. После completion pass обязательные критерии Phase A закрыты, итоговое решение изменено на **PASS**. Phase B не запускалась.

### Root Causes

- Локальная Ollama считалась неработоспособной из-за единого 30-секундного тайм-аута: холодная загрузка `phi4-mini:latest` на текущем оборудовании занимает около 93 секунд.
- MCP Manager хранил только клиентские объекты без проверяемого состояния, инвентаря tools/resources/prompts и корректного HTTP-транспорта.
- Реальные Browser/Document/Voice/Media-инструменты не имели изолированных окружений и runtime-адаптеров, поэтому Dashboard мог показывать только декларативный каталог.
- PDF-конвейеру не хватало Java runtime и фактического маршрутизатора OpenDataLoader → Docling.
- Production build использовал Unix-команду `cp` и Webpack-трассировку тяжёлых локальных окружений, что было несовместимо с Windows и приводило к исчерпанию памяти.
- Старый идентификатор `mcp-server:desktop-commander` сохранялся в persistent snapshot как ложный дубликат `MISSING`.

### Fixes

- Ollama получила отдельные health/warm/cold тайм-ауты (8/30/120 секунд), streaming, structured JSON, классификацию, метрики и постоянную историю benchmark.
- Добавлен настоящий `ollama-local` provider с quality gate: тяжёлый анализ не отправляется в малую локальную модель, простые локальные задачи могут выполняться без облака.
- MCP Manager поддерживает stdio и Streamable HTTP, инвентаризацию и диагностические состояния. Подключены Playwright MCP, Desktop Commander и Jina MCP.
- Создан Document Router с проверкой пути внутри workspace, OpenDataLoader как основным PDF-движком и Docling для подтверждённо работающих форматов.
- Добавлены реальные runtime-адаптеры Browser Use, Crawl4AI, Agent Reach, Faster Whisper, yt-dlp, Repomix и Document Router.
- Автообнаружение исполняет только ожидаемые бинарники из проверяемых путей установки; произвольные PATH-записи и файлы из workspace отвергаются.
- Реестры ограничены по числу записей и размеру snapshot, discovery snapshot заменяется атомарно, устаревший Desktop Commander ID удалён.
- `npm run build` переведён на Turbopack и кроссплатформенную подготовку standalone через `scripts/prepare-standalone.mjs`.

### Actual Installations

- Java Temurin JRE 21.0.12.8 — системная установка.
- `@opendataloader/pdf` 2.5.0, `@playwright/mcp` 0.0.79 и Repomix 1.18.0 — точные project dependencies.
- Browser Use 0.13.7, Crawl4AI 0.9.2, Agent Reach 1.5.0, Faster Whisper 1.2.1, Docling 2.118.1 и yt-dlp 2026.07.04 — изолированные окружения `.jarvis/venvs`.
- Desktop Commander 0.2.43 — изолированный MCP-запуск через существующую конфигурацию, без добавления уязвимой транзитивной цепочки в project dependencies.

### Actual MCP Connections

- Playwright MCP: `READY`, 24 инструмента.
- Desktop Commander: `READY`, 26 инструментов и 2 ресурса.
- Jina MCP: `READY`, сервер предлагает 21 инструмент; без API key безопасно зарегистрированы 2 реально работающих no-key инструмента.
- Итог: 3 живых MCP-сервера, 52 доступных JARVIS MCP-инструмента.

### Actual Smoke Results

- Ollama cold inference: `PASS`, `phi4-mini:latest`, 94.109 с wall time, 92.819 с load time, ответ `OK`, 47.07 token/s.
- Ollama warm stream: `PASS`, 0.495 с; time-to-first-token 0.443 с. Structured classification: `PASS`, 22.96 token/s.
- Playwright MCP: навигация и snapshot `PASS`.
- Desktop Commander: список файлов, terminal/process operations `PASS`.
- Browser Use: реальный Chromium-сеанс и `example.com` `PASS`.
- Crawl4AI: реальный crawl `example.com`, Markdown 166 символов, 0.46 с `PASS`.
- Agent Reach: doctor и доступные GitHub/YouTube/Bilibili/V2EX/RSS/Jina Reader каналы `PASS`.
- OpenDataLoader: реальный одностраничный PDF → Markdown + JSON `PASS`.
- Docling: TXT → Markdown + JSON за 0.03 с `PASS`; PDF backend 2.118.1 на Windows оставляет открытый handle, поэтому PDF закреплён за OpenDataLoader.
- Faster Whisper: локальная CPU int8 транскрипция WAV `PASS`; tiny-модель имеет ожидаемо ограниченное качество.
- yt-dlp: реальные YouTube metadata без загрузки медиа `PASS`.
- Repomix: реальная упаковка тестового TypeScript-каталога в XML `PASS`.
- Queue regression: два пакета по 2 записи завершены; второй создан в одном процессе и автоматически продолжен в другом — `PASS`.
- UI: `/login` отрисован, `/dashboard` и `/graphify` корректно защищены redirect на login, browser page errors отсутствуют; публичный local-music API отвечает `200`.

### Security Repair

Два независимых обзора обнаружили потенциальные проблемы owner authorization, provenance collision, PATH hijacking, неограниченных тел/ответов, Docker metadata и внутренних ошибок. В текущем коде они устранены: owner guard работает fail-closed, Dashboard защищён, системные записи нельзя перезаписать вручную, Docker labels не сохраняются, тела/реестры/Ollama bounded, 500-ошибки обезличены, executable discovery ограничен доверенными путями. Финализированный canonical scan содержит 0 reportable findings: `reports/security/jarvis-phase-a-20260808/report.md`.

### Final Verification

- `npm run typecheck`: PASS.
- `npm test`: PASS — 68 файлов, 456 тестов.
- `npm run lint`: PASS — 0 ошибок, 6 существующих предупреждений.
- `npm audit`: PASS — 0 уязвимостей во всех dependency classes.
- `npm run build`: PASS — Next.js 16.3.0, 103/103 страниц, standalone assets подготовлены.
- Auto Discovery: 43 программы, 201 возможность, 37 healthy; MCP-записи имеют актуальные tool/resource/prompt counters, ложный Desktop Commander duplicate удалён.

### Remaining Optional Components

- Chatterbox TTS не устанавливался: это необязательная тяжёлая модель; рабочий CPU fallback остаётся Edge TTS.
- Jina key-dependent инструменты корректно отключены до появления `JINA_API_KEY`; 2 no-key инструмента работают.
- Docling PDF backend на Windows деградирован; обязательный PDF-маршрут полностью работает через OpenDataLoader. Другие проверенные форматы Docling доступны.
- Antigravity CLI и OpenCode отсутствуют в PATH. Они не являются обязательными условиями Phase A.

```text
PHASE_A_STATUS=PASS

QUEUE_REGRESSION=PASS

JARVIS_CORE=PASS
CAPABILITY_REGISTRY=PASS
PROGRAM_REGISTRY=PASS
AUTO_DISCOVERY=PASS
DASHBOARD_PROGRAMS=PASS

LOCAL_OLLAMA=PASS
OLLAMA_SERVER=ONLINE
OLLAMA_MODEL_COUNT=4
OLLAMA_WORKING_MODEL=phi4-mini:latest
OLLAMA_COLD_START_SECONDS=94.109
OLLAMA_WARM_TOKENS_PER_SECOND=22.96
OLLAMA_TEST_INFERENCE=PASS

CLAUDE_CODE=READY
CODEX=READY
ANTIGRAVITY=NOT_INSTALLED
OPENCODE=OPTIONAL_NOT_INSTALLED

DESKTOP_COMMANDER=PASS

GRAPHIFY=PASS

MCP_GATEWAY=PASS
MCP_SERVER_COUNT=3
MCP_TOOL_COUNT=52

PLAYWRIGHT=PASS
PLAYWRIGHT_MCP=PASS
BROWSER_USE=PASS
CAMOFOX=PASS
CRAWL4AI=PASS
JINA_MCP=PARTIAL
AGENT_REACH=PASS

DOCUMENT_ROUTER=PASS
OPENDATALOADER=PASS
DOCLING=PASS

FASTER_WHISPER=PASS
CHATTERBOX=OPTIONAL

YTDLP=PASS
REPOMIX=PASS

SUPABASE=PASS

ADAPTED_AGENTS=24
ADAPTED_SKILLS=4
ADAPTED_TOOLS=25
ADAPTED_MCP=52
ADAPTED_PROVIDERS=3

PROGRAMS_TOTAL=43
PROGRAMS_HEALTHY=37
PROGRAMS_DEGRADED=1
PROGRAMS_OFFLINE=6
PROGRAMS_MISSING=4

LINT_CHANGED_FILES=PASS
LINT_OWNED_SOURCE=PASS
LINT_GLOBAL=PASS

TYPECHECK=PASS
UNIT_TESTS=PASS
INTEGRATION_TESTS=PASS
BUILD=PASS
NPM_AUDIT=PASS

SECRETS_EXPOSED=NO
USER_FILES_DELETED=NO
FORCE_PUSH_USED=NO
PRODUCTION_TOUCHED=NO

REMAINING_BLOCKERS=none

FINAL_DECISION=PASS
```
