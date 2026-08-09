# Docker-сервисы Phase B

Compose project: `jarvis-phase-b`. Конфигурация: `infra/phase-b/compose.yaml`.

Правила:

- только loopback-порты;
- отдельные named volumes;
- `no-new-privileges`;
- никаких mount диска, профиля пользователя, `.ssh`, browser profiles, credentials или Docker socket;
- lifecycle по allowlist service name;
- проверка порта и owning PID/expected container до старта без принудительного завершения процесса;
- readiness-gate перед выполнением capability;
- on-demand запуск и ручная остановка;
- чужие Docker projects не перечисляются как targets и не изменяются.

Активный профиль `automation` содержит n8n. Остальные рекомендуемые Docker-компоненты остаются зарегистрированными, но не поднимаются без проверенного compose-профиля и необходимых credentials.

Для изолированного acceptance test разрешена только явная подмена имени named volume через `JARVIS_PHASE_B_N8N_VOLUME`; production/default остаётся `jarvis-phase-b-n8n-data`. E2E использует `jarvis-phase-b-n8n-e2e-data`, после чего контейнер возвращается на default volume.
