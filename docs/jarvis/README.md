# JARVIS Agent Network — Implementation Docs

> Status: PHASE 5 implementation complete (T1-T24 passed).

---

## Documents

- `01_repository_audit.md` — existing stack and constraints
- `02_capability_map.md` + `02_skill_mcp_plan.md` — capability inventory
- `03_architecture.md` + `03_gap_analysis.md` + `03_implementation_plan.md` — target design
- `04_task_ledger.md` — task tracker

---

## Quick Start

### Run a network plan (dry-run)

```bash
curl -X POST http://localhost:3000/api/jarvis/network \
  -H 'Content-Type: application/json' \
  -d '{ "goal": "create a React login page", "mode": "fast", "dryRun": true }'
```

### List agents and capabilities

```bash
curl http://localhost:3000/api/jarvis/network/agents
```

### Inspect a run

```bash
curl http://localhost:3000/api/jarvis/network/runs/{runId}
```

---

## Module Reference

| Module | Purpose |
|--------|---------|
| `src/lib/jarvis/types.ts` | Core contracts |
| `src/lib/jarvis/state.ts` | State machines + task graph scheduler |
| `src/lib/jarvis/agent-registry.ts` | `AgentDefinition` mapping over existing agents |
| `src/lib/jarvis/capability-discovery.ts` | Tool/Capability discovery from Tool Hub + MCP |
| `src/lib/jarvis/planner.ts` | Agent selection + task graph planning |
| `src/lib/jarvis/execution-engine.ts` | Schedule, run, checkpoint engine |
| `src/lib/jarvis/artifact-store.ts` | Artifact persistence |
| `src/lib/jarvis/finding-store.ts` | Finding persistence |
| `src/lib/jarvis/checkpoint-service.ts` | Save/resume checkpoints |
| `src/lib/jarvis/decision-log.ts` | Decision log persistence |
| `src/lib/jarvis/verification-engine.ts` | Verification checks (typecheck, lint, build, test, browser, security) |
| `src/lib/jarvis/verification-store.ts` | Verification result persistence |
| `src/lib/jarvis/browser-agent.ts` | Browser automation contract |
| `src/lib/jarvis/repair-loop.ts` | One finding → fix → verify |
| `src/lib/jarvis/release-gate.ts` | Release verdict logic |
| `src/lib/jarvis/orchestrator.ts` | Facade: plan → execute → repair → verify → gate |
| `src/lib/jarvis/security.ts` | Limits, allowlists, ownership guards |
| `src/lib/jarvis/skills/jarvis-skills.ts` | 4 JARVIS skills for the skill registry |
| `src/lib/jarvis/adapters/browser-agent-adapter.ts` | Browser agent adapter |
| `src/lib/jarvis/adapters/mcp-availability-adapter.ts` | MCP availability adapter |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/jarvis/network` | POST | Start a run |
| `/api/jarvis/network/agents` | GET | List agents + capabilities |
| `/api/jarvis/network/runs/[runId]` | GET | Get full run snapshot |
| `/api/jarvis/network/verify` | POST / GET | Run / list verification checks |

---

## UI

`/jarvis` — JARVIS Control Center
- Agent grid with roles and capabilities
- Capability summary cards
- Run start form (dry-run by default)
- Quick links to API endpoints

---

## Verification

```bash
npm run typecheck   # TypeScript
npm run build       # Production build
npx vitest run src/lib/jarvis   # Unit / integration tests
```

---

## Migration

SQL migration generated offline:

```
prisma/migrations/20260721000000_jarvis_agent_network/migration.sql
```

Apply only when `DATABASE_URL` is configured:

```bash
npx prisma migrate deploy
```
