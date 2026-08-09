# Runtime adapters

Контракт `JarvisRuntimeAdapter` определён в `adapter-contract.ts`:

- `metadata`, `capabilities`, `health`, `version`, `configuration`;
- `execute`, `status`, `metrics`;
- опциональные `start/stop/restart/install/uninstall/update` только когда компонент действительно поддерживает безопасный lifecycle.

`runAdapterAction` добавляет timeout и структурированную ошибку `{code,message,retryable}`. Adapter не возвращает фиктивный успешный ответ. Ошибка сохраняется в счётчиках Program Registry и может инициировать fallback.

В Phase A полноценно реализован `OllamaAdapter`; существующие Tool Hub, MCP и worker adapters агрегируются без переписывания. Для внешнего кода используется `assessExternalComponent`: неизвестная лицензия/security/architecture означает quarantine, несовместимость — reject, дублирование или секреты — wrapper.
