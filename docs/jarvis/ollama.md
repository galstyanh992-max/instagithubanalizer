# Ollama Local

Официальный Windows runtime обнаруживается через PATH, основной endpoint — `http://127.0.0.1:11434`.

Adapter использует официальные endpoints:

- `/api/version` — версия;
- `/api/tags` — установленные модели;
- `/api/ps` — загруженные модели, RAM/context;
- `/api/generate` — короткий явный inference-test.

Dashboard показывает online/offline, endpoint, версию, имя/размер/parameters/quantization/loaded/context и рекомендуемое применение моделей. Метрики включают число установленных/загруженных моделей и RAM загруженных моделей.

Большие модели автоматически не скачиваются. Pull/delete/load/unload не вызываются discovery. Удаление модели считается destructive и требует отдельной явной операции с проверкой, что модель не используется. API Phase A разрешает только health, list models и test inference.
