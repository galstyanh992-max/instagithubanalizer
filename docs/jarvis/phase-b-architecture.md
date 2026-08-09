# JARVIS Phase B — архитектура

Phase B расширяет, а не заменяет Phase A. Единственной точкой оркестрации остаётся JARVIS. Все 22 внешних компонента представлены `JarvisRuntimeAdapter`, автоматически попадают в существующие Program Registry и Capability Registry и отображаются текущим Dashboard без статических карточек.

Поток выполнения: команда пользователя → JARVIS → Capability Router → Phase B adapter → policy/approval gate → локальный сервис или внешний API → метрики и сохранённое состояние. Профиль агента не является моделью: выбор LLM всегда выполняет существующий Provider Router.

Состояния расширены значениями `DISCOVERED`, `CONFIGURED`, `QUARANTINED` при сохранении всех Phase A состояний. Действия Centers сначала сохраняются атомарно в `.jarvis/state/phase-b-center.json`, затем best-effort дублируются в Phase B control-plane Supabase. При недоступной БД ответ честно содержит `local_fallback`; секреты и authoritative provider content в control plane не копируются. Registry продолжает использовать существующее хранилище `.jarvis/state`.

Категории: AUTOMATION, SOCIAL, MESSAGING, CALLS, MEDIA, VIDEO, DESIGN, MONITORING, DOCUMENT ARCHIVE, EDGE AI, MOBILE, DEPLOYMENT, SECURITY TOOLS, TRADING RESEARCH.

Интерфейсы:

- `/dashboard` — живой реестр и lifecycle программ;
- `/phase-b` — объединённые Centers и безопасные fixtures;
- `/api/jarvis/programs` — discovery, lifecycle, test, logs, configuration и adapter execution;
- `/api/jarvis/phase-b` — локальные планы/черновики/сессии;
- `/api/approvals` — существующая DB-очередь и безопасные локальные Phase B approval previews; локальное одобрение меняет статус, но не запускает внешний side effect.
