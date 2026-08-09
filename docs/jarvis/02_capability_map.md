# JARVIS AGENT NETWORK — PHASE 2: CAPABILITY MAP

> Generated: 2026-07-21
> Status: read-only inventory completed
> Evidence: file inspection, dependency manifests, existing tests, Git status

---

## 1. Executive Summary

`FACT`: The project already contains most of the primitives required for the JARVIS Agent Network. The implementation should be additive: reuse and extend existing modules rather than replace them. The biggest gap is a unified **network orchestration layer** that ties together goal intake, agent selection, tool capability discovery, task state machine, checkpointing, verification, repair loop, and release gate.

`ASSUMPTION`: Existing modules can be extended in place; parallel duplication is unnecessary.

`UNKNOWN`: Real availability of external MCP servers and Redis/Upstash in the current environment.

---

## 2. Capability Inventory

| Capability | Status | Existing Module | Auth State | Reuse Decision | Required Changes | Evidence |
|------------|--------|-----------------|------------|----------------|------------------|----------|
| **Orchestrator goal intake + planning** | `PARTIAL` | `src/lib/orchestrator/OrchestratorEngine.ts`, `PlanningEngine.ts`, `TaskDecompositionEngine.ts` | `NOT_NEEDED` in local dev | `EXTEND` | Add explicit goal/intent model, task graph with dependencies, repair loop, release gate | `OrchestratorEngine.processMessage` handles classification, plan creation, and approval assessment |
| **Agent Registry** | `AVAILABLE` | `src/lib/agent-registry/defaults.ts`, `index.ts` | `NOT_NEEDED` | `REUSE` | Add AgentDefinition contract and capability metadata | 22 default agents with roles, prompts, visual profiles |
| **Agent Runtime / Execution** | `AVAILABLE` | `src/lib/agent-core/runtime.ts`, `src/lib/agent-runtime/agent-executor.ts` | `NOT_NEEDED` | `REUSE` | Wrap with AgentRequest/AgentResult contract, add timeout/retry | `AgentRuntime.execute` exists; `AgentExecutor` is a back-compat wrapper |
| **Agent Factory (purpose classifier)** | `AVAILABLE` | `src/lib/agent-factory/*` | `NOT_NEEDED` | `REUSE` | Expose as capability discovery helper | `purpose-classifier.ts`, `capability-matching.ts`, `unsafe-filter.ts` |
| **Tool Registry** | `AVAILABLE` | `src/lib/tool-hub/ToolRegistryService.ts`, `src/lib/tools/registry.ts` | `NOT_NEEDED` | `REUSE` | Add availability check and permission contract | `ToolRegistryService.getTools/getToolByKey`, 15 `DEFAULT_TOOLS` |
| **Tool Execution Engine** | `AVAILABLE` | `src/lib/tool-hub/ToolHub.ts`, `ToolExecutionService.ts`, `ToolAdapterRegistry.ts` | `NOT_NEEDED` | `REUSE` | Add normalized output, timeout, retry, audit logging | `ToolHub.executeTool` already does permission, approval, adapter execution |
| **MCP Client Manager** | `PARTIAL` | `src/lib/mcp/McpClientManager.ts`, `McpToolWrapper.ts`, `init.ts` | `AUTH_REQUIRED` (env keys) | `ADAPT` | Add availability check, allowlist, disabled state; register as ToolRegistry source | Connects via stdio; Brave Search and GitHub servers initialized when keys present |
| **Skills System** | `AVAILABLE` | `src/lib/skills/registry.ts`, `types.ts`, `skills/*` | `NOT_NEEDED` | `REUSE` | Map skills to AgentDefinition capabilities | `ISkill` lifecycle hooks exist; planning/summarization/validation skills registered |
| **Browser Operator** | `PARTIAL` | `src/lib/browser-operator/*`, API at `src/app/api/browser/` | `NOT_NEEDED` locally | `ADAPT` | Wrap as Browser Agent with route/action inventory, console/network capture, viewport matrix | Playwright-based service with provider adapters; DB persistence; queue processing |
| **Safety / Prompt Injection Guard** | `AVAILABLE` | `src/lib/safety/*` | `NOT_NEEDED` | `REUSE` | Integrate into orchestrator and tool execution | `detectPromptInjection`, `runSafeAction`, `SafetyValidator` |
| **Approval / Human-in-the-loop** | `AVAILABLE` | `src/lib/approval/*`, `src/app/api/approvals/` | `NOT_NEEDED` locally | `REUSE` | Wire into Repair Loop and Release Gate | `approvalEngine.createApprovalRequest`, `ApprovalStatus` |
| **Permission / Access Control** | `PARTIAL` | `src/lib/tool-hub/ToolPermissionService.ts`, `src/lib/agent-system/AgentPermissionService.ts` | `AUTH_REQUIRED` for multi-user | `EXTEND` | Add per-run budgets, max agent/task counts, tool allowlist | `canAgentUsePermission`, `checkToolPermission` exist |
| **Persistence (Database)** | `AVAILABLE` | Prisma + `src/lib/db.ts` | `NOT_NEEDED` locally | `REUSE` | Add `OrchestrationRun`, `AgentExecution`, `Artifact`, `Finding`, `VerificationResult`, `DecisionLog`, `Checkpoint` models | Prisma client singleton; existing `Project/Epic/Task/Agent/ApprovalRequest/ToolExecution` |
| **Event / Audit Logging** | `AVAILABLE` | `src/lib/event-bus/index.ts`, `EventLog` table | `NOT_NEEDED` | `REUSE` | Emit network orchestration events | Typed event bus; durable EventLog writes |
| **API Routes** | `AVAILABLE` | `src/app/api/jarvis/orchestrate/`, `plan/`, `delegate/`, etc. | `NOT_NEEDED` locally | `EXTEND` | Add `/api/jarvis/network/*` routes | Existing `parseTask`/`executeTask` and `jarvisRoleRouter.planTask` |
| **UI Shell** | `AVAILABLE` | `public/dashboard/` iframe, `src/app/agents/`, `src/components/jarvis/` | `NOT_NEEDED` | `EXTEND` | Add JARVIS Control Center view inside existing shell | New OS shell exists; existing `jarvis-unified-console.tsx` |
| **TypeScript / Build** | `AVAILABLE` | `next.config.ts`, `tsconfig.json`, `package.json` | `NOT_NEEDED` | `REUSE` | Add new files to include paths (automatic via tsconfig) | `@/*` alias, strict mode |
| **Unit/Integration Tests** | `AVAILABLE` | Vitest + `src/**/*.test.ts` | `NOT_NEEDED` | `EXTEND` | Add tests for new orchestration logic | Tests exist for agent-factory, command-router, local-operator, etc. |
| **Git** | `AVAILABLE` | Local repo; branch `wip/os-shell-before-phone-bridge` | `NOT_NEEDED` | `REUSE` | Track JARVIS changes separately; no unrelated edits | `git status` shows dirty working tree from UI refactor |
| **Deployment Configuration** | `AVAILABLE` | `next.config.ts` output standalone, Vercel/Supabase docs in README | `AUTH_REQUIRED` for prod deploy | `NOT_NEEDED` for implementation | No deployment changes required | Standalone build configured |
| **Redis / BullMQ Queue** | `NOT_AVAILABLE` locally | `src/lib/queue.ts`, `bullmq`, `@upstash/redis` | `AUTH_REQUIRED` | `NOT_NEEDED` for v1 | Use in-memory queue / Prisma fallback | `USE_QUEUE` env flag gated |
| **External AI Providers (live)** | `AUTH_REQUIRED` | `src/lib/ai-provider/*` | `AUTH_REQUIRED` | `ADAPT` | Use existing router; mark live calls as `AUTH_REQUIRED` when keys missing | Router resolves providers; fallback/mock mode possible |
| **Browser Agent (live automation)** | `NOT_AVAILABLE` runtime | `playwright` installed; browsers may not be installed | `NOT_NEEDED` for contract | `ADAPT` | Implement contract + test double; runtime marked `NOT_AVAILABLE` if Playwright browsers missing | `npx playwright install chromium` required |
| **MCP Servers (live)** | `NOT_AVAILABLE` runtime | `src/lib/mcp/init.ts` | `AUTH_REQUIRED` | `ADAPT` | Implement adapter interface; live calls marked `NOT_AVAILABLE` without env keys | Only initializes when `BRAVE_API_KEY` / `GITHUB_PERSONAL_ACCESS_TOKEN` set |

---

## 3. Reuse Decision Summary

| Decision | Count | Rationale |
|----------|-------|-----------|
| `REUSE` | 11 | Components already satisfy contract needs with no or minimal changes. |
| `EXTEND` | 6 | Need additional fields, contracts, or state machines. |
| `ADAPT` | 5 | Need a wrapper or interface to fit into Agent Network (MCP, Browser, AI providers). |
| `REPLACE` | 0 | No existing component needs replacement. |
| `NOT_NEEDED` | 3 | Deployment/queue can be deferred or mocked for v1. |

---

## 4. Capability Selection Priority Applied

1. **Existing specialized skill** — `src/lib/skills/*`, `src/lib/agent-factory/*`.
2. **Available MCP server** — `src/lib/mcp/*` (requires env keys).
3. **Connected application / tool** — `src/lib/tool-hub/*`, `src/lib/browser-operator/*`.
4. **Built-in tool** — `src/lib/tools/registry.ts`.
5. **Existing project script** — `scripts/*` for smoke verification.
6. **New adapter / local helper** — Browser Agent contract, MCP availability wrapper.
7. **New skill / MCP spec** — Only if a capability is completely missing.

---

## 5. New Capabilities Required

The following are **not** fully satisfied by existing modules and must be created:

| # | New Capability | Justification | Reuse Basis |
|---|----------------|---------------|-------------|
| 1 | `AgentRequest` / `AgentResult` contracts | No unified agent handoff contract exists | Extend `TaskContract` + `AgentChatRequest` |
| 2 | `OrchestrationRun` state machine | Existing orchestrator processes single messages, not multi-step runs | New model + service wrapping `OrchestratorEngine` |
| 3 | Task dependency graph + execution scheduler | `TaskDecompositionEngine` creates flat epics/tasks without dependencies | Extend `Task` model with `dependsOn` and add topological runner |
| 4 | Shared context / artifact / finding stores | No structured artifact or finding persistence | New Prisma models + services |
| 5 | Checkpoint + resume | No checkpoint abstraction | Persist run state after each task phase |
| 6 | Browser Agent contract + adapter | `browser-operator` is provider-task oriented, not page-inventory oriented | Wrap `BrowserOperatorService` with `IBrowserAgent` |
| 7 | Verification engine | `QualityGateService` checks agent output; no full verification pipeline | Extend quality gate + add typecheck/lint/build/browser checks |
| 8 | Repair Loop | No dedicated repair orchestration | New service driven by `Finding` model |
| 9 | Release Gate | No final verdict abstraction | New service + UI report |

---

## 6. External Dependencies / Credentials

| Service | Why Needed | Minimum Scope | Safe Storage | Environment | Status |
|---------|------------|---------------|--------------|-------------|--------|
| Brave Search MCP | Web search capability | Read-only search | `.env.local` | Optional | `AUTH_REQUIRED` |
| GitHub MCP | Repo operations | Read-only or scoped write | `.env.local` | Optional | `AUTH_REQUIRED` |
| External AI providers | Agent reasoning | Chat completions | `.env.local` | Optional (fallback/mock possible) | `AUTH_REQUIRED` |
| Redis / Upstash | Durable BullMQ queue | Queue operations | `.env.local` | Optional | `NOT_NEEDED` for v1 |
| Production deployment | Release | N/A | N/A | N/A | `BLOCKED` until explicit approval |

---

## 7. Risk Notes

- `R1`: Browser Operator and MCP are installed but may fail at runtime without browser binaries or API keys. We must code defensively with `NOT_AVAILABLE` markers.
- `R2`: Git working tree is dirty. JARVIS files should be isolated to `src/lib/jarvis/`, `src/app/api/jarvis/network/`, `src/app/jarvis/`, and `docs/jarvis/`.
- `R3`: Auth disabled in dev; ownership checks will be implemented but cannot be fully verified until auth is enabled.

---

## 8. Checkpoint

```
JARVIS IMPLEMENTATION CHECKPOINT

Phase: PHASE 2 — CAPABILITY MAP
Status: COMPLETED
Completed Tasks:
  - Inventoried orchestrator, agent registry/runtime/factory, tool hub, skills, MCP, browser operator, safety, approval, persistence, API, UI, tests, Git, deployment
  - Classified each capability status and reuse decision
  - Identified required new capabilities
  - Documented credential/external dependencies
Changed Files: none
Created Files:
  - docs/jarvis/02_capability_map.md
Verification Executed: file inspection, git status, dependency manifest review
Evidence: see tables above
Confirmed Findings: none
Open Blockers: none
Git Safety Notes: no source files modified
Next Task: PHASE 3 — TARGET ARCHITECTURE
```
