# Capability Registry

`src/lib/jarvis/platform/capability-registry.ts` — единый локально-персистентный реестр возможностей. Он агрегирует программы, модели Ollama, agents, skills, tool adapters, runtime tools, провайдеров и MCP tools.

Запись содержит: identity и kind; описание; `capabilities/best_for/not_for`; JSON-схемы входа/выхода; side effects и requirements; OS/CPU/GPU/RAM; зависимости и совместимость; risk/trust; installed/enabled/running/health/version/source/repository/adapter; priority/cost/latency; task/success/failure counters и последнюю ошибку.

Поддерживаемые kinds соответствуют Phase A: provider, model, agent, skill, tool, MCP, plugin, browser/crawler, document/voice/media, filesystem/terminal/git, code intelligence, Docker, automation, social, communication и system.

Правила:

- router видит только installed + enabled и не выбирает `MISSING/UNHEALTHY`;
- disable сохраняется после restart и сразу исключает capability из routing;
- исчезнувшая capability не удаляется, а становится `MISSING`;
- slash-команды формируются `compileCommands()` из активных записей;
- API: `GET/POST/PATCH/DELETE /api/jarvis/capabilities`; удалять можно только записи `manual` или `e2e-test`.
