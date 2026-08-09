# Dashboard программ

Маршрут `/dashboard` читает только `GET /api/jarvis/programs`; hardcoded program cards отсутствуют. Записи группируются по категориям, поступившим из registry, и обновляются каждые 15 секунд или кнопкой «Обновить реестр».

Карточка показывает name/type/category, status/health/version, enabled/running, local/cloud, capabilities, path, endpoint/port, PID/container, CPU/RAM, last used, tasks/success rate/errors. Детали разворачиваются в самой карточке. Для Ollama выводится модельный список.

Доступные действия Phase A: details, test, enable/disable и registry refresh. UI русифицирован, текст имеет высокий контраст, keyboard-focus не скрыт, сетка адаптивна. API защищён существующим owner-only middleware; публичного обхода не добавлено.

E2E acceptance покрывает динамическую регистрацию dummy, появление в source-of-truth, disable и исключение из router, enable и повторный выбор, delete — без изменения frontend.
