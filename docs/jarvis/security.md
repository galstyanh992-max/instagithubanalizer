# Безопасность Phase A

## Границы доверия

- Browser/phone UI → Supabase → локальный JARVIS daemon → локальные capabilities.
- Frontend не получает прямой доступ к Docker socket, filesystem, CLI workers, Ollama process или service-role key.
- Public signup остаётся отключённым; RLS и owner enforcement сохраняются.

## Секреты

Claude/Codex credentials, OAuth/browser cookies, Windows credentials, API/SSH keys, service-role и содержимое `.env` запрещены в frontend, Supabase records, registry metadata, errors и logs. Discovery проверяет только наличие настроенного provider ID, никогда не сохраняет значение credential.

## Выполнение

- External code не устанавливается автоматически; неизвестное помещается в quarantine.
- Terminal/filesystem/Docker/lifecycle операции проходят server adapters и существующие permission/risk policies.
- Destructive операции не реализуются как универсальная registry action.
- Adapter errors структурированы, ограничены timeout и не заменяются заглушкой.
- API валидирует вход Zod; удаление ограничено manual/e2e records; исключённый repository отклоняется на API и catalog слоях.

## Audit и rollback

Program/capability state сохраняет timestamps, counters и last error. Существующие OrchestrationRun, DecisionLog, Finding, VerificationResult, daemon event и infrastructure operation модели используются для task-level audit/checkpoint/rollback. Runtime state из `.jarvis/state` не коммитится и может быть восстановлено новым discovery без потери `MISSING`-истории в текущем state file.
