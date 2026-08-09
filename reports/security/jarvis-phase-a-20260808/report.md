# Security Review: JARVIS Phase A

## Scope

Статический аудит новых control-plane, discovery, registry, Ollama и persistent-import поверхностей Phase A.

- Scan mode: scoped_path
- Target kind: git_worktree
- Target ID: jarvis-phase-a-worktree
- Revision: 16ab70321abbb227b7908f133a62f11453ceb485
- Snapshot digest: codex-security-snapshot/v1:sha256:3b870182a80606334f7288af7602ae4a8ee39c50f833ef79fa5fa35798067ea7
- Inventory strategy: custom
- Included paths: src/lib/jarvis/platform/, src/app/api/jarvis/, src/app/dashboard/, src/lib/supabase/middleware.ts, src/lib/jarvis/owner-guard.ts, src/lib/api.ts, src/middleware.ts, src/services/repository-import.service.ts, src/app/api/repos/import-batch/route.ts
- Excluded paths: none
- Runtime or test status: Два независимых обзора завершены; подтверждённые находки исправлены и повторно проверены.

Limitations and exclusions:
- Excluded artifacts/, public/dashboard-recovery-baseline/vendor/, temp_extract/, src/generated/: Generated, recovered, vendored, or temporary code outside the Phase A implementation scope.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | complete |
| Validation mode | source-review plus targeted runtime verification |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Однопользовательская локальная система: недоверенный веб-клиент, локальные сервисы и данные реестра не должны обходить owner-only контроль, раскрывать секреты или выполнять произвольные команды.

### Assets

- локальные программы и модели
- реестры возможностей и программ
- секреты провайдеров
- вычислительные ресурсы рабочей станции

### Trust Boundaries

- браузер — Next.js API
- Next.js — Supabase Auth/PostgreSQL
- JARVIS — локальные CLI и loopback-сервисы

### Attacker Capabilities

- неавторизованный или не-owner веб-клиент
- некорректный локальный loopback-сервис
- злоумышленник, способный влиять на PATH текущего пользователя

### Security Objectives

- fail-closed owner authorization
- отсутствие секретов во frontend и реестрах
- ограниченные входные и выходные данные
- отсутствие shell-инъекций и автоматической установки внешнего кода

### Assumptions

- JARVIS запускается без повышенных привилегий от имени единственного владельца
- компрометация учётной записи ОС владельца находится вне границы веб-приложения

## Findings

### No findings

No reportable findings survived the canonical discovery, validation, and reportability gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Owner-only middleware and route guards | not recorded | No issue found | Fail-open owner handling corrected to fail closed; sensitive Phase A APIs also verify ownership in-route. |
| Persistent registry mutation and provenance | not recorded | No issue found | Manual collisions with discovered records are rejected; record and snapshot limits are enforced. |
| Local CLI and Docker discovery | not recorded | No issue found | Fixed command probes use execFile; command-shim paths are data, not interpolated shell source; raw Docker labels are not persisted. |
| Loopback Ollama adapter | not recorded | No issue found | Endpoint and paths are fixed; elapsed time, response bytes, model count, and model-name length are bounded. |
| Persistent JSON/JSONL repository import | not recorded | No issue found | File and record limits, durable item state, atomic claims, stale recovery, and bounded provider/GitHub waits were reviewed. |
| Dynamic dashboard rendering | not recorded | No issue found | Registry values are rendered as React text; no raw HTML sink was found. |
