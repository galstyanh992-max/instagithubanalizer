# Automation Center

n8n работает как подчинённый Docker on-demand сервис, а не как отдельный интерфейс управления JARVIS. Зафиксирован образ `n8nio/n8n:2.33.7` (`sha256:3989d9b8…`), порт опубликован только как `127.0.0.1:15678`, данные находятся в отдельном named volume.

Адаптер публикует generic capabilities `automation.workflow.list/get/create/update/run/stop/status` и `automation.execution.list/inspect`. Legacy-имена принимаются только как совместимые aliases на границе адаптера. Создание и обновление из JARVIS ограничено проверенным детерминированным fixture без HTTP, shell, credentials и внешних side effects. Fixture: `infra/phase-b/fixtures/n8n-safe-workflow.json`; ожидаемый результат — `JARVIS_PHASE_B_OK`.

Lifecycle разрешён только для service name `n8n` в compose project `jarvis-phase-b`. Capability-запрос к остановленному n8n проверяет порт 15678, не убивает чужой PID, запускает профиль и ждёт `/healthz/readiness` до выполнения. Команды не используют shell-интерполяцию и не могут остановить чужой контейнер.
