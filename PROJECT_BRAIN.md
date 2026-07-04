# Project Brain

Central shared memory. Reuses the existing `MemoryRecord` Prisma model (no new model, no migration).

## Entry types
`user_command | router_decision | safety_decision | approval_event | action_result | error | user_preference | project_decision | daily_note | research_note | api_reference | tool_reference | agent_reference`

Brain type → `MemoryRecord.kind` mapping lives in `prisma-adapter.ts`; the exact brain type is preserved in `metadata.__brainType`.

## What is stored
Commands, router decisions, safety decisions, approvals, project decisions, user preferences, notes/reports, future API/tool/agent references. Actor id/role/source + importance stored in `metadata`.

## What is NOT stored / how sensitive is handled
- Secret-like content is auto-detected (`memorySafetyService.checkMemory`) and flagged `sensitive`.
- Sensitive entries are persisted but **never expose content** in `search`/`list` public projections → `"[SENSITIVE — HIDDEN]"`.
- `metadata` is JSON-sanitized (circular refs dropped).
- Recording never throws to callers; failures go to the audit log so command execution is never broken.

## Service (`src/lib/project-brain/project-brain-service.ts`)
`recordBrainEntry, recordUserCommand, recordRouterDecision, recordSafetyDecision, recordProjectDecision, recordUserPreference, searchBrainEntries, listRecentBrainEntries`, `setBrainAdapter` (adapter swap for tests).

Adapters: `PrismaBrainAdapter` (runtime DB), `InMemoryBrainAdapter` (tests / no DB).

## API
- `GET /api/brain` — recent entries (public projection)
- `POST /api/brain` — create entry (validated; never echoes sensitive content)
- `GET /api/brain/search?q=` — search (public projection)

## Command router integration
Router records `user_command` on entry, `safety_decision` on deny, `router_decision` on approval/safe paths — all non-fatal (`void`), DB-failure tolerant.

## NOT IMPLEMENTED
- Vector search / embeddings
- Long-term server mode
- Telegram memory integration
- AI summarization of memory
- Runtime DB persistence verification (NOT RUN — no live DATABASE_URL)
