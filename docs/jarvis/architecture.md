# JARVIS Phase A — архитектура

## Инварианты

- `JARVIS Core` — единственный верхнеуровневый оркестратор. Claude Code, Codex, Antigravity, OpenCode и специализированные агенты являются подчинёнными workers.
- Локальный контур работает без Docker и облачного провайдера. Облачные сервисы и Docker расширяют возможности, но не являются условием запуска ядра.
- Любой внешний компонент проходит `DISCOVERY → LICENSE_CHECK → SECURITY_REVIEW → DUPLICATE_CHECK → JARVIS_ADAPTATION → CAPABILITY_EXTRACTION → TEST → REGISTER → ENABLE`.
- Неизвестные или конфликтующие компоненты остаются выключенными в `QUARANTINE`; конфликтующая функция оборачивается adapter-слоем и не становится вторым оркестратором.
- Секреты не хранятся в реестрах, frontend или логах.

## Поток управления

`UI/Voice/API → Intent Router → Task Planner → Capability Router → Adapter → Worker/Provider/Tool → Verification → Audit/Registry metrics`.

Capability Router учитывает пригодность, специализацию, доступность, здоровье, историю успеха, задержку, цену, приватность, локальность, ресурсы и риск. Ошибка основного кандидата приводит к выбору следующего, а не к немедленному завершению задачи.

## Слои

- `src/lib/jarvis/platform`: единый runtime-контракт, реестры, discovery, scoring, fallback и command compiler.
- `src/lib/jarvis`: планирование, execution engine, проверки, журнал решений и release gate.
- `src/lib/tool-hub`, `src/lib/tools`, `src/lib/skills`, `src/lib/mcp`, `src/lib/worker-registry`: существующие специализированные реестры и runtimes, агрегируемые Phase A.
- `src/daemon`: получение, claim, выполнение, события, завершение, отмена и восстановление локальных задач.
- Supabase/Prisma: удалённая плоскость данных с сохранением RLS и owner-only доступа.
- `.jarvis/state`: локальное персистентное состояние реестров; каталог исключён из Git.

## Внешние компоненты

`phase-a-catalog.ts` хранит только способы минимальной интеграции и никогда не выполняет auto-install. Импортируемые файлы должны иметь source repo, commit SHA/tag, лицензию, hash, дату импорта и security verdict. `galstyanh992-max/instagithubanalizer` явно исключён как внешняя capability; исторические сведения и Git origin проекта не переписываются.
