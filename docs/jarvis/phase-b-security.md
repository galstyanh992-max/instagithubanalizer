# Phase B — безопасность и supply chain

Проверка выполнена 2026-08-09 по публичному GitHub API. Для каждой записи каталог хранит repository, canonical repository, release/tag, HEAD SHA, license, mode и security verdict. `EvolutionAPI/evolution-api` перенаправлен в `evolution-foundation/evolution-api` и сохранён с обоими именами.

Проверка 2026-08-09 включала GitHub HEAD tree и root manifests (`package.json`, Python packaging, Dockerfile, compose, install scripts). Искались install/postinstall, remote downloads, telemetry, env/credential access, browser cookie/profile references, shell execution, Docker privileges, host mounts и network exposure. Ни один чужой script не запускался. Нормальные для сервиса признаки не объявляются уязвимостью, но дают verdict `LIMITED` и запрещают автоматическое включение до отдельной runtime-проверки.

| Репозиторий | Статический manifest verdict | Причина ограничения |
| --- | --- | --- |
| n8n, n8n-mcp | LIMITED | install hooks; telemetry/env; n8n-mcp remote-download references |
| Postiz, Postiz Agent | LIMITED | install/telemetry/env/public-port compose; у Agent нет declared license |
| TrendRadar | VERIFIED | root manifest без risk-флагов |
| changedetection.io | LIMITED | telemetry references |
| Evolution API | LIMITED | no declared license; install/download/env/public-port compose |
| grammY | LIMITED | package install hook |
| LiveKit Agents | LIMITED | credential/env configuration |
| OpenMontage | LIMITED | env configuration |
| Video Starter Kit | LIMITED | install/telemetry references |
| MoneyPrinterTurbo | VERIFIED | root manifests без risk-флагов |
| Penpot, Paperless-ngx | LIMITED | env/download configuration |
| Sipp, cam2ip, PhoneClaw, Vespasian | VERIFIED | статический root/tree inventory без risk-флагов; всё равно disabled/POC |
| Coolify, Certimate, Meetily, NautilusTrader | VERIFIED | статический root/tree inventory без risk-флагов; remote/optional/research lifecycle |

`VERIFIED` здесь означает только проверенный source/license/manifest inventory, а не доказательство отсутствия уязвимостей. Компоненты без однозначной лицензии (`n8n` fair-code, Postiz Agent, Evolution API) остаются `LIMITED`.

Жёсткие defaults: camera OFF, live trading OFF, PSTN OFF, production deploy OFF, mass messaging OFF, external publish without approval OFF. Coolify — только remote VPS profile. NautilusTrader — research/backtesting. Sipp и PhoneClaw — POC. Vespasian — только авторизованная API-проверка.

Secrets не возвращаются из `configuration()`: Dashboard видит только имя переменной и boolean `configured`. Логи редактируют token/secret/password/api-key. Локальный approval fallback хранит только preview и не способен выполнить внешний side effect.

Supabase control-plane migration создаёт 19 single-owner таблиц с RLS для роли `authenticated`. Она не изменяет закрытые `auth`, `storage` или `realtime` schemas, не зависит от GraphQL introspection и не пинит extension version. Это учитывает breaking changes Supabase 2026: закрытый `realtime` schema, opt-in exposure новых public tables и переход self-hosted gateway на Envoy. Live migration status и transactional CRUD/RLS catalog smoke проверены после deploy.

Полные SHA, версии и лицензии находятся в `src/lib/jarvis/phase-b/catalog.ts` и проверяются unit-тестом.
