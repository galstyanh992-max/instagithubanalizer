# JARVIS AGENT NETWORK — PHASE 1: REPOSITORY AUDIT

> Generated: 2026-07-21
> Auditor: JARVIS (self-audit)
> Scope: existing `jarwisyan` / ДЖАРВИС OS project
> Constraint: read-only audit before implementation changes

---

## 1. Executive Summary

`FACT`: Project is an **existing Next.js 16 + React 19 + TypeScript** monolithic application with a large number of agent/orchestration subsystems already present. It already contains orchestrator, tool hub, agent registry, agent runtime, MCP bridge, safety/approval gates, and browser operator modules. The requested **JARVIS Agent Network** capability should be implemented as an **evolutionary layer** on top of these existing components rather than a parallel rewrite.

`FACT`: Auth is currently disabled in non-production environments (`JARWISYAN_AUTH_ENABLED` only enables middleware when explicitly `"true"` in dev or unset in prod). All API routes are effectively public locally.

`ASSUMPTION`: The implementation can rely on existing workspace/project/task/epic/approval Prisma models rather than introduce a separate database schema.

`UNKNOWN`: Whether live MCP servers are configured in the current environment (only placeholder values in `.env.example`).

---

## 2. Repository Map

```
d:\АГЕНТ\ДЖАРВИС
├── .env / .env.local / .env.example       # secrets (NOT read)
├── package.json                           # Next.js 16.2.10, React 19, Prisma 6, Tailwind v4
├── next.config.ts                         # output: standalone
├── tsconfig.json                          # @/* alias -> ./src/*
├── vitest.config.ts                       # jsdom, *.test.ts(x)
├── eslint.config.mjs                      # mostly disabled rules
├── prisma/schema.prisma                   # PostgreSQL target (dev uses SQLite historically)
├── prisma/migrations/                     # existing migrations
├── src/
│   ├── middleware.ts                      # next-auth, auth opt-in
│   ├── app/                              # Next.js App Router
│   │   ├── api/                          # 30+ API domains
│   │   │   ├── jarvis/                   # orchestrator endpoints
│   │   │   │   ├── orchestrate/route.ts  # parseTask/executeTask
│   │   │   │   ├── plan/route.ts         # jarvisRoleRouter.planTask
│   │   │   │   ├── delegate/             # role delegation
│   │   │   │   ├── design-critic/        # design review
│   │   │   │   └── hierarchy/            # model hierarchy
│   │   │   ├── chat/route.ts             # main chat + safety
│   │   │   ├── agents/                   # agent CRUD
│   │   │   ├── tasks/                    # task management
│   │   │   ├── workflows/                # workflow engine
│   │   │   ├── approvals/                # approval requests
│   │   │   ├── terminal/exec/            # safe terminal
│   │   │   ├── browser/                  # browser automation
│   │   │   ├── browser-research/         # browser research
│   │   │   ├── local-operator/           # local operator / MCP bridge
│   │   │   └── ...
│   │   ├── page.tsx                      # dashboard iframe shell
│   │   ├── dashboard/                    # legacy dashboard page
│   │   ├── agents/                       # agents UI
│   │   ├── projects/                     # projects UI
│   │   ├── repos/                        # repo analysis UI
│   │   ├── board/                        # kanban board
│   │   ├── memory/                       # memory UI
│   │   └── settings/                     # settings UI
│   ├── components/
│   │   ├── jarvis/                       # unified console, role UIs
│   │   ├── os/                           # new OS shell components
│   │   ├── futuristic/                   # 3D/sci-fi UI
│   │   ├── ui/                           # shadcn/ui base
│   │   └── ...
│   ├── lib/
│   │   ├── orchestrator/                 # OrchestratorEngine, PlanningEngine, TaskDecompositionEngine
│   │   ├── agent-registry/               # defaults + registry
│   │   ├── agent-runtime/                # agent-executor, runtime
│   │   ├── agent-factory/                # purpose classifier, draft builder, unsafe filter
│   │   ├── agent-memory/                 # memory router, shared memory
│   │   ├── agent-system/                 # AgentModelConfigService, AgentPermissionService
│   │   ├── agent-core/                   # cost guard, runtime core
│   │   ├── tool-hub/                     # ToolHub, ToolRegistryService, ToolPermissionService, adapters
│   │   ├── tools/                        # internal tool registry
│   │   ├── mcp/                          # McpClientManager, McpToolWrapper, init
│   │   ├── mcp-bridge/                   # local MCP bridge profiles
│   │   ├── browser-operator/               # browser control
│   │   ├── browser-research/               # browser research agent
│   │   ├── command-router/               # intent classification
│   │   ├── safety/                       # SafetyValidator, PromptInjectionGuard, runSafeAction
│   │   ├── approval/                     # approval lifecycle
│   │   ├── pipeline.ts                   # AI pipeline helpers
│   │   ├── db.ts                       # Prisma client singleton
│   │   ├── event-bus/                    # in-memory event bus
│   │   ├── types/                        # agents, domain, events
│   │   └── ...
│   ├── server/
│   │   └── executor/                     # Codex CLI / manual adapters
│   └── services/                         # high-level services
│       ├── jarvis-orchestrator.service.ts  # NLP parse + execute
│       ├── jarvis-role-router.service.ts   # role routing
│       ├── ai-provider-router.service.ts # AI provider routing
│       ├── ai.service.ts                 # AI abstraction
│       ├── chat.service.ts               # chat service
│       └── ...
├── public/dashboard/                     # new OS dashboard iframe
├── scripts/                              # smoke tests (20+ modules)
└── docs/jarvis/                          # (created for this implementation)
```

---

## 3. Detected Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Framework | Next.js 16.2.10 (App Router) | `FACT` |
| Build engine | Turbopack (`next dev --turbopack`) | `FACT` |
| Runtime | Node.js / Edge runtime per route | `FACT` |
| UI | React 19, Tailwind v4, shadcn/ui, Radix, Framer Motion, R3F | `FACT` |
| ORM | Prisma 6.11.1 | `FACT` |
| Database target | PostgreSQL (schema). Local dev historically SQLite | `FACT` |
| Auth | next-auth v4, opt-in middleware | `FACT` |
| State | Zustand (`src/lib/store.ts`) | `FACT` |
| AI providers | openai, gemini, groq, cerebras, openrouter, glm, ollama-cloud | `FACT` (from `src/lib/ai-provider/providers.ts`) |
| Queue/Worker | BullMQ + ioredis + Upstash Redis/ratelimit | `FACT` |
| MCP SDK | `@modelcontextprotocol/sdk` v1.29.0 | `FACT` |
| Browser automation | Playwright v1.61.0 | `FACT` |
| Testing | Vitest (jsdom) + smoke scripts | `FACT` |
| Logging | pino + pino-pretty | `FACT` |
| Error tracking | Sentry Next.js SDK | `FACT` |

---

## 4. Existing AI / Agent / Tool Infrastructure

### 4.1 Orchestrator

`FACT`: `src/lib/orchestrator/OrchestratorEngine.ts` already implements a message-processing pipeline:
- input validation
- clarification check
- task classification (small/medium/large/epic)
- approval assessment
- mode-based path selection (manual/balanced/autonomous)
- plan creation via `PlanningEngine`
- plan approval via `TaskDecompositionEngine`
- eventBus integration

`FACT`: `src/services/jarvis-orchestrator.service.ts` exposes `parseTask` + `executeTask` with chat/media/analysis/repo-analysis routing.

### 4.2 Agent Registry

`FACT`: `src/lib/agent-registry/defaults.ts` defines 22 default agents including orchestrator, analyst, architect, designer, frontend/backend engineers, data/QA/security/devops engineers, researchers, and marketing agents.

`FACT`: `src/lib/agent-registry/index.ts` resolves agents from Prisma `Agent` table and falls back to defaults.

### 4.3 Tool Hub

`FACT`: `src/lib/tool-hub/ToolHub.ts` executes tools with:
- workspace existence check
- agent/workspace ownership check
- tool existence/enabled check
- `ToolExecution` record creation
- agent category permission check
- tool permission policy check
- approval creation for high/critical risk
- adapter execution

`FACT`: `ToolRegistryService`, `ToolPermissionService`, `ToolExecutionService`, and `ToolAdapterRegistry` exist.

`FACT`: `DEFAULT_TOOLS` are seeded from `src/lib/tool-hub/defaults.ts`.

### 4.4 MCP Integration

`FACT`: `src/lib/mcp/McpClientManager.ts` wraps `@modelcontextprotocol/sdk` stdio clients.

`FACT`: `src/lib/mcp/McpToolWrapper.ts` adapts MCP tools to internal `ITool` interface.

`FACT`: `src/lib/mcp/init.ts` initializes Brave Search and GitHub MCP servers when env keys are present.

`FACT`: MCP is only active if `BRAVE_API_KEY` or `GITHUB_PERSONAL_ACCESS_TOKEN` are set; otherwise it logs warnings and continues.

### 4.5 Safety / Approvals

`FACT`: `src/lib/safety/` contains `SafetyValidator`, `PermissionChecker`, `PromptInjectionGuard`, and `runSafeAction`.

`FACT`: HIGH/CRITICAL actions require approval via `/approvals`.

### 4.6 Browser Operator

`FACT`: `src/lib/browser-operator/` and `src/lib/browser-research/` exist with Playwright-based automation.

`FACT`: API routes exist at `src/app/api/browser/` and `src/app/api/browser-research/`.

### 4.7 Execution Engine

`FACT`: `src/server/executor/` contains Codex CLI and Manual adapters.

`FACT`: `src/lib/agent-runtime/agent-executor.ts` handles agent execution.

---

## 5. Database Schema (Prisma) Relevant to Agent Network

`FACT` (from `prisma/schema.prisma`):

- `User`, `Workspace`, `UserTask`
- `Setting` (singleton)
- `Project`, `Epic`, `Task`, `Subtask`
- `Agent` (workspace-scoped)
- `ApprovalRequest`
- `ToolExecution`
- `Repository`, `RepositoryAnalysis`, `InstallPlan`
- `Screenshot`, `ExtractedCandidate`
- `Category`, `Tag`, `MemoryItem` (inferred from service code)

`ASSUMPTION`: We can reuse `Project`/`Epic`/`Task`/`Subtask`/`Agent`/`ApprovalRequest`/`ToolExecution` for orchestration runs rather than creating parallel tables. A new `OrchestrationRun` model is likely needed to group related tasks under a single user goal.

---

## 6. API and Event Patterns

### API Patterns

`FACT`: API routes use `NextResponse.json` or a custom `safe` wrapper (`src/lib/api`).
`FACT`: Zod validation is used on input.
`FACT`: Many routes call `initProviders()` before AI usage.

### Event Patterns

`FACT`: `src/lib/event-bus/` provides an in-memory typed event bus.
`FACT`: `src/lib/types/events.ts` defines `ORCHESTRATOR_*`, `AGENT_STATUS_CHANGED`, `TOOL_CREATED`, `APPROVAL_REQUESTED`, etc.

---

## 7. UI Patterns

`FACT`: Design system is dark sci-fi / holographic.
`FACT`: `src/components/ui/` contains shadcn/ui base components.
`FACT`: New OS shell exists in `public/dashboard/` and is rendered via iframe in `src/app/page.tsx`.
`FACT`: `src/components/os/` contains new OS components (e.g., `ModuleEmbedDetector`).
`FACT`: `src/components/jarvis/jarvis-unified-console.tsx` is the existing JARVIS console.

---

## 8. Security Boundaries

`FACT`:
- Auth is opt-in via `JARWISYAN_AUTH_ENABLED`.
- Middleware protects `/api/*` and non-login pages when auth is enabled.
- `runSafeAction` blocks dangerous commands.
- HIGH/CRITICAL tool actions require approval.
- Prompt injection guard runs on chat.

`ASSUMPTION`: JARVIS Agent Network must add per-run agent/task budgets, max agent/task counts, and strict tool allowlists to prevent agent-driven DoS or cost spikes.

---

## 9. Existing Tests

`FACT`: Vitest with jsdom. Test files exist for:
- `agent-factory`, `command-router`, `content-generation`, `github-watcher`, `local-agent-runtime`, `local-operator`, `mcp-bridge`, `phone-bridge`, `project-brain`, `services/*`.

`FACT`: Smoke tests exist for ~20 modules in `scripts/`.

`FACT`: No existing tests cover a full orchestration run lifecycle.

---

## 10. Integration Points

| Existing Module | How JARVIS Agent Network Can Reuse |
|-----------------|-------------------------------------|
| `orchestrator/*` | Extend `OrchestratorEngine` with explicit goal intake, task ledger, and repair loop. |
| `agent-registry/defaults.ts` | Use default agent definitions as the initial Agent Registry. |
| `tool-hub/*` | Use as Tool Registry + Execution Engine. Add availability and permission checks. |
| `mcp/*` | Wrap as MCP adapter in Tool Registry. |
| `browser-operator/` | Browser Agent adapter. |
| `safety/` | Security gate inside orchestrator and tool hub. |
| `approval/` | Human-in-the-loop for irreversible/high-risk actions. |
| `event-bus/` | State change notifications for UI. |
| `db` / Prisma | Persistence for runs, tasks, artifacts, findings. |

---

## 11. Confirmed Constraints

1. **Monolithic Next.js app** — no microservices or Kubernetes.
2. **Auth opt-in** — must not assume authenticated user in local dev.
3. **MCP servers require env keys** — unavailable unless explicitly configured.
4. **Prisma schema already large** — prefer additive migrations, not rewrites.
5. **Many UI pages are under active refactor** — avoid touching unrelated pages.
6. **Git working tree is dirty** — large refactor in progress (`wip/os-shell-before-phone-bridge`).
7. **Standalone output** — build produces `.next/standalone/`.

---

## 12. Assumptions

| # | Assumption | Rationale |
|---|------------|-----------|
| A1 | Reuse existing `Project/Epic/Task` tables for task ledger. | Avoids parallel schema. |
| A2 | Run `OrchestrationRun` as a new Prisma model linked to `Project` and `Task[]`. | Needed to group agent network runs. |
| A3 | Browser Agent can leverage existing Playwright-based browser operator. | Tool already available. |
| A4 | Local dev database is SQLite-compatible or PostgreSQL per env. | Prisma schema targets PostgreSQL. |
| A5 | UI for JARVIS Control Center can be added inside existing OS shell iframe or as a separate Next.js page. | Minimizes redesign. |
| A6 | Agent execution in first iteration can be synchronous/safe stubs with deterministic contracts. | Real external agents require more infrastructure. |

---

## 13. Unknowns

| # | Unknown | Impact |
|---|---------|--------|
| U1 | Which MCP servers are actually configured in `.env.local`? | Determines MCP adapter availability. |
| U2 | Is Redis/Upstash configured locally? | BullMQ features may be unavailable. |
| U3 | Current state of database migrations relative to `schema.prisma`. | Need to run `prisma migrate status`. |
| U4 | Are browser tests passing currently? | Need to verify before claiming browser QA. |
| U5 | Exact auth model for production (user roles). | Affects access control for runs. |
| U6 | Whether `Project` model in Prisma already contains required fields. | Need to inspect full schema. |

---

## 14. Blockers

| # | Blocker | Severity | Mitigation |
|---|---------|----------|------------|
| B1 | Git working tree is dirty with many unrelated changes. | `P2` | Stage/branch JARVIS changes separately; avoid touching existing files. |
| B2 | MCP servers not configured by default. | `P3` | Mark MCP as `AUTH_REQUIRED`; create local adapters. |
| B3 | Auth disabled in dev; access control cannot be fully verified locally. | `P2` | Implement ownership checks but flag as `NOT_RUN` for auth-on scenario. |

---

## 15. Implementation Plan (High-Level)

1. **Create JARVIS domain models** (`src/lib/jarvis/types.ts`, Prisma migration for `OrchestrationRun`, `AgentExecution`, `Artifact`, `Finding`, `VerificationResult`, `DecisionLog`, `Checkpoint`).
2. **Build Agent Registry adapter** using existing `src/lib/agent-registry/defaults.ts`.
3. **Build Tool Registry adapter** using existing `src/lib/tool-hub/ToolRegistryService` + MCP wrapper.
4. **Implement Orchestrator v2** (`src/lib/jarvis/JarvisNetworkOrchestrator.ts`) with goal intake → task graph → agent assignment → execution → verification → repair → release gate.
5. **Implement Browser Agent adapter** using existing `browser-operator`.
6. **Add API routes** under `src/app/api/jarvis/network/`.
7. **Add minimal UI** for Control Center inside existing `/agents` or new `/jarvis` page.
8. **Add tests** for task graph, state transitions, tool permission, release verdict.
9. **Run build, typecheck, tests**.
10. **Document** in `docs/jarvis/`.

---

## 16. Git Status Snapshot

```
Branch: wip/os-shell-before-phone-bridge
Head:   4a03ee6 feat: Implement Jarvis Orchestrator and Role Router services
Status: many modified/deleted/untracked files (large UI refactor in progress)
New:    .agent.md, .vscode/, public/dashboard/, src/components/os/ModuleEmbedDetector.tsx, etc.
```

`FACT`: The project is mid-refactor. JARVIS Agent Network implementation should be additive and avoid the active UI refactor area unless required.
