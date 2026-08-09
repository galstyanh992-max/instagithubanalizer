# JARVIS AGENT NETWORK — PHASE 3: IMPLEMENTATION PLAN

> Generated: 2026-07-21
> Status: actionable plan
> Constraint: minimal diff, reuse existing modules, no production deployment

---

## 1. Implementation Principles

1. **Additive only** — create new files under `src/lib/jarvis/`, `src/app/api/jarvis/network/`, `src/app/jarvis/`, `src/components/jarvis/network/`, `prisma/migrations/`, `docs/jarvis/`.
2. **Reuse before create** — extend existing orchestrator, agent registry, tool hub, safety, approval, event bus, Prisma.
3. **No unrelated edits** — avoid touching files currently being refactored by the user (OS shell, dashboard iframe, pages under heavy change).
4. **Defensive availability** — every external capability (MCP, browser, AI providers) must report `available`/`auth_required`/`not_available`.
5. **Evidence-based status** — never report `PASSED` for a check that wasn't run.
6. **Stop only on real blockers** — missing credentials or browser binaries are not blockers; implement interfaces and adapters anyway.

---

## 2. File Layout

```
src/lib/jarvis/
  types.ts                      # AgentRequest, AgentResult, RunContext, contracts
  state.ts                      # OrchestrationRun state machine + TaskNode state machine
  agent-registry.ts             # AgentDefinition mapping from existing defaults
  capability-discovery.ts       # Tool/MCP/skill/script capability discovery
  planner.ts                    # AgentNetworkPlanner: select agents, build task graph
  execution-engine.ts           # ExecutionEngine: schedule, run, checkpoint
  artifact-store.ts             # Artifact persistence
  finding-store.ts              # Finding persistence
  verification-engine.ts        # Run verification pipeline
  browser-agent.ts              # BrowserAgent contract + adapter
  repair-loop.ts                # Repair loop orchestration
  release-gate.ts               # Release verdict
  checkpoint-service.ts         # Checkpoint persistence/resume
  decision-log.ts               # Decision log service
  orchestrator.ts               # JarvisNetworkOrchestrator (facade)
  index.ts                      # barrel export
  skills/                       # new JARVIS-only skills
    jarvis-context-skill.ts
    evidence-recorder-skill.ts
    repair-skill.ts
    browser-agent-skill.ts
  adapters/
    mcp-availability-adapter.ts
    browser-agent-adapter.ts

src/app/api/jarvis/network/
  runs/route.ts                 # POST list, POST create
  runs/[id]/route.ts            # GET run
  runs/[id]/cancel/route.ts     # POST cancel
  runs/[id]/resume/route.ts     # POST resume
  runs/[id]/tasks/route.ts      # GET tasks
  runs/[id]/artifacts/route.ts  # GET artifacts
  runs/[id]/findings/route.ts   # GET findings
  runs/[id]/verify/route.ts     # POST verify
  runs/[id]/release/route.ts    # POST release
  agents/route.ts               # GET agent definitions
  tools/route.ts                # GET tool capabilities

src/app/jarvis/
  page.tsx                      # JARVIS Control Center (minimal)
  layout.tsx                    # layout wrapper

src/components/jarvis/network/
  run-creator.tsx
  run-overview.tsx
  task-graph.tsx
  agent-list.tsx
  tool-list.tsx
  artifact-list.tsx
  finding-list.tsx
  release-report.tsx

prisma/migrations/
  20260721000000_jarvis_agent_network/  # new migration

docs/jarvis/
  04_task_ledger.md
  (subsequent docs)

tests (co-located):
  src/lib/jarvis/*.test.ts
```

---

## 3. Prisma Migration Plan

Create migration `20260721000000_jarvis_agent_network` with models:

- `OrchestrationRun`
- `AgentTask`
- `AgentExecution`
- `Artifact`
- `Finding`
- `VerificationResult`
- `DecisionLog`
- `Checkpoint`

No changes to existing tables. Use `prisma migrate dev --name jarvis_agent_network` after schema edit.

`ASSUMPTION`: Local dev database is SQLite-compatible or PostgreSQL. Migration will be generated but **not** applied destructively.

---

## 4. Implementation Order

| Step | Task | Why First |
|------|------|-----------|
| 1 | Types + contracts | Foundation for all other modules |
| 2 | State machines | Define behavior before logic |
| 3 | Prisma schema + migration | Persistence foundation |
| 4 | Agent registry extension | Map existing agents to new contract |
| 5 | Capability discovery | Know what tools are available |
| 6 | Planner + task graph | Build executable plan |
| 7 | Execution engine + checkpoint | Run tasks, resume |
| 8 | Artifact + finding stores | Record results |
| 9 | Verification engine | Validate results |
| 10 | Browser agent adapter | Required verification element |
| 11 | Repair loop | Close findings |
| 12 | Release gate | Final verdict |
| 13 | API routes | Expose to UI |
| 14 | UI Control Center | User interface |
| 15 | Security hardening | Limits, allowlists, ownership |
| 16 | Tests | Prove correctness |
| 17 | Documentation | Operational docs |

---

## 5. Verification After Each Group

After each numbered step group:

1. `npm run typecheck`
2. `npm run test -- src/lib/jarvis/*.test.ts` (when tests exist)
3. `npm run lint` (selective)
4. `npm run build` (after API routes and UI)

Record results in Task Ledger.

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Prisma migration conflicts with dirty tree | Additive only; no renames/deletions |
| UI refactor conflicts | Keep UI in `/jarvis` page, not OS shell |
| Auth disabled in dev | Implement ownership checks, test when auth enabled |
| MCP/browser unavailable | Always check availability; create test doubles |
| Large test load | Co-locate focused tests, run incrementally |

---

## 7. Checkpoint

```
JARVIS IMPLEMENTATION CHECKPOINT

Phase: PHASE 3 — IMPLEMENTATION PLAN
Status: COMPLETED
Completed Tasks:
  - Defined implementation principles
  - Created file layout
  - Planned Prisma migration
  - Ordered implementation steps
  - Defined verification cadence
  - Listed risk mitigations
Changed Files: none
Created Files:
  - docs/jarvis/03_implementation_plan.md
Verification Executed: design review
Evidence: file layout and step order
Confirmed Findings: none
Open Blockers: none
Git Safety Notes: no source files modified
Next Task: PHASE 4 — TASK LEDGER
```
