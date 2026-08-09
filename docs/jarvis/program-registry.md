# Program Registry

Program Registry — source of truth для `/dashboard`. Файл runtime-состояния: `.jarvis/state/program-registry.json`, запись выполняется через временный файл и rename.

Каждая запись содержит обязательные Phase A поля: identity/type/category/description/source; installed/enabled/running/status/health; version; path/executable/command; endpoint/port/PID; Docker id/image; capabilities/dependencies; CPU/RAM/disk; last seen/start/stop/use; task/success/failure counters, success rate, error и timestamps. Расширенные безопасные сведения находятся в `metadata`.

Discovery обновляет наблюдаемые поля, сохраняя пользовательский `enabled`, историю задач и дату последнего использования. Исчезнувшая программа остаётся в реестре как `MISSING`; это делает изменения окружения видимыми и проверяемыми.

API `GET/POST/PATCH/DELETE /api/jarvis/programs` поддерживает refresh, health test, enable/disable и регистрацию контролируемых записей. Автоматически обнаруженные записи нельзя удалить через API.
