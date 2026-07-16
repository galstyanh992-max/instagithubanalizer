# Codex Integration Read-Only Audit

**Audit Date:** 2026-07-11  
**Auditor:** Independent Senior Auditor (Cline)  
**Repository:** `d:\АГЕНТ\ДЖАРВИС — копия`  
**Branch:** `wip/os-shell-before-phone-bridge`  
**HEAD:** `873a3bf594737e6d6e61a247144cceafb5c351e5`  
**Remote:** `origin → https://github.com/galstyanh992-max/instagithubanalizer.git`  
**Status:** DIRTY — untracked `%TEMP%/` directory created by `codex app-server generate-ts` during audit (see §13)  
**Node:** v24.13.0 | **npm:** 11.6.2 | **Codex CLI:** 0.143.0  
**Project:** `jarwisyan` v0.2.0 (private)  
**Framework:** Next.js 16.1.1 / React 19 / Prisma 6.11.1 / PostgreSQL

---

## 1. Audit Metadata

| Field | Value |
|---|---|
| Audit type | READ-ONLY — no code, config, schema, deps, or DB changes |
| Method | File-level source inspection + CLI verification (codex --version, codex app-server --help, generate-ts, generate-json-schema) |
| Source of truth | Local HEAD `873a3bf` |
| Codex version verified | `codex-cli 0.143.0` |
| Codex app-server commands available | `daemon`, `proxy`, `generate-ts`, `generate-json-schema` |
| Codex app-server transports | `stdio://` (default), `unix://`, `ws://IP:PORT`, `off` |
| Codex app-server auth modes | `capability-token`, `signed-bearer-token` |
| Git dirty state | One untracked dir `%TEMP%/` (audit artifact, not project code) |

---

## 2. Capability Map

| Capability | Status | Evidence |
|---|---|---|
| Next.js App Router | **CONFIRMED WORKING** | Full route tree under `src/app/` |
| Prisma ORM (PostgreSQL) | **CONFIRMED WORKING** | `schema.prisma` with 40+ models, `prisma generate` in postinstall |
| NextAuth credentials auth | **CONFIRMED WORKING** | `src/lib/auth.ts`, `src/middleware.ts` |
| Agent Core Runtime | **CONFIRMED WORKING** | `src/lib/agent-core/runtime.ts` — full execution lifecycle |
| Agent Registry | **CONFIRMED WORKING** | `src/lib/agent-registry/` — agent CRUD, model configs |
| Agent Memory (internal) | **CONFIRMED WORKING** | `src/lib/agent-memory/` — Prisma-backed MemorySystem |
| Agent Memory (MCP server) | **NOT IMPLEMENTED** | No MCP server protocol exposed; internal service only |
| MCP Client Manager | **CONFIRMED WORKING** | `src/lib/mcp/McpClientManager.ts` — stdio transport, real SDK usage |
| MCP Bridge | **PLAN-ONLY** | `src/lib/mcp-bridge/` — handshake returns `connected: false`, profiles are static |
| Approval System | **CONFIRMED WORKING** | `src/lib/safety/permission-checker.ts`, Prisma `ApprovalRequest` model |
| Event Bus | **CONFIRMED WORKING** | `src/lib/event-bus/` — singleton EventEmitter pattern |
| Local Operator | **CONFIRMED WORKING** | `src/lib/local-operator/` — command runner with allowlist |
| Codex CLI Adapter | **STUB/MOCK** | `src/server/executor/codex-cli-adapter.ts` — writes "Simulated Codex CLI Execution Report." |
| Codex app-server Integration | **NOT IMPLEMENTED** | No JSON-RPC client, no thread/session, no streaming, no daemon management |
| Agent Factory | **CONFIRMED WORKING** | `src/lib/agent-factory/` — agent creation via config |
| AI Provider Registry | **CONFIRMED WORKING** | `src/lib/ai-provider/` — multi-provider (GLM, OpenRouter, OpenAI, etc.) |
| Tool Hub | **CONFIRMED WORKING** | `src/lib/tool-hub/` — tool registry, execution, permission policies |
| Skill Registry | **CONFIRMED WORKING** | `src/lib/skills/` — skill definitions, packs, usage logs |
| Orchestrator | **CONFIRMED WORKING** | `src/lib/orchestrator/` — task orchestration |
| Rate Limiting | **CONFIRMED WORKING** | `src/lib/rate-limit.ts` — in-memory per-IP, 30/min prod, 100/min dev |
| Structured Logging | **CONFIRMED WORKING** | `src/lib/logger.ts` — pino with redaction |
| Browser Operator | **CONFIRMED WORKING** | `src/lib/browser-operator/` — Playwright-based task model |
| Telegram Bot | **CONFIRMED WORKING** | `src/lib/telegram/` — node-telegram-bot-api |
| Phone Bridge | **PARTIAL** | `src/lib/phone-bridge/` exists, UI route present |

---

## 3. Repository Map

### 3.1 Directory Structure (Key Paths)

```
d:\АГЕНТ\ДЖАРВИС — копия\
├── .git/
├── prisma/
│   ├── schema.prisma              # 1542 lines, 40+ models, PostgreSQL
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── middleware.ts               # NextAuth gate, fail-closed in prod
│   ├── app/
│   │   ├── api/                    # ~60+ API routes
│   │   │   ├── agents/             # Agent CRUD
│   │   │   ├── approvals/          # Approval workflow
│   │   │   ├── mcp-bridge/        # Plan-only bridge endpoints
│   │   │   ├── memory/            # Memory CRUD + search
│   │   │   ├── local-agent-runtime/
│   │   │   ├── local-operator/
│   │   │   ├── chat/               # AI chat endpoint
│   │   │   ├── brain/              # Project brain
│   │   │   └── ... (50+ more)
│   │   ├── agents/                 # Agent management UI
│   │   ├── approvals/              # Approval UI
│   │   ├── board/                  # Board UI
│   │   ├── dashboard/
│   │   ├── memory/
│   │   └── ...
│   ├── components/
│   │   ├── chat/                   # Chat UI
│   │   ├── os/                     # OS dashboard (includes Codex status widget)
│   │   ├── providers/
│   │   └── ui/                     # Shadcn UI components
│   ├── config/                     # Brand profile JSON
│   ├── hooks/
│   ├── lib/
│   │   ├── agent-core/             # Runtime engine (666 lines)
│   │   ├── agent-factory/          # Agent creation
│   │   ├── agent-memory/           # MemorySystem (Prisma-backed)
│   │   ├── agent-registry/         # Agent CRUD + model configs
│   │   ├── agent-runtime/          # Back-compat adapter → agent-core
│   │   ├── agent-system/           # Agent system types
│   │   ├── ai-provider/            # Multi-provider registry
│   │   ├── approval/               # Approval logic
│   │   ├── browser-operator/       # Playwright browser tasks
│   │   ├── browser-research/
│   │   ├── command-router/         # Command routing
│   │   ├── content-generation/
│   │   ├── daily-reports/
│   │   ├── db-config/
│   │   ├── developer-operator/
│   │   ├── email-foundation/
│   │   ├── event-bus/              # Singleton EventEmitter
│   │   ├── github/
│   │   ├── github-watcher/
│   │   ├── local-agent-runtime/    # Local agent execution
│   │   ├── local-operator/         # Command runner + sandbox
│   │   ├── mcp/                    # MCP Client Manager (real stdio)
│   │   │   ├── McpClientManager.ts  # Real MCP SDK client
│   │   │   ├── McpToolWrapper.ts   # Tool wrapper
│   │   │   └── init.ts             # Brave/GitHub MCP init
│   │   ├── mcp-bridge/             # PLAN-ONLY — no real connection
│   │   │   ├── types.ts            # Bridge type definitions
│   │   │   ├── profiles.ts         # Static bridge profiles
│   │   │   ├── handshake.ts        # Returns connected: false
│   │   │   ├── planner.ts
│   │   │   ├── risk-policy.ts
│   │   │   ├── capability-classifier.ts
│   │   │   └── mcp-bridge.test.ts
│   │   ├── orchestrator/
│   │   ├── phone-bridge/
│   │   ├── project-brain/
│   │   ├── prompt-manager/
│   │   ├── rate-limit/
│   │   ├── safety/                  # Permission checker + actor model
│   │   ├── skills/
│   │   ├── telegram/
│   │   ├── tool-hub/
│   │   ├── tools/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── validations/
│   │   ├── api.ts
│   │   ├── auth.ts                  # NextAuth credentials provider
│   │   ├── constants.ts
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── env.ts                   # Zod-validated env schema
│   │   ├── logger.ts               # Pino with redaction
│   │   ├── queue.ts                # BullMQ queue
│   │   ├── rate-limit.ts            # In-memory rate limiter
│   │   ├── store.ts                 # Zustand UI state
│   │   └── types.ts
│   └── server/
│       ├── executor/                # Codex adapter (STUB)
│       │   ├── codex-cli-adapter.ts # MOCK — writes "Simulated Codex CLI Execution Report."
│       │   └── types.ts             # JarvisTask type with codex_cli | codex_ide | manual
│       └── local-control/
│           ├── command-runner.ts    # spawn() with allowlist
│           ├── sandbox.ts           # Path validation
│           └── tasks.ts             # Task file I/O
├── scripts/                         # Smoke tests (vitest delegations)
├── mini-services/
├── download/
├── public/
└── audit/                           # This report
```

---

## 4. Runtime and Commands

| Command | Purpose | Status |
|---|---|---|
| `npm run dev` | Start dev server (port 3000) | Available |
| `npm run build` | Production build | Available |
| `npm run typecheck` | TypeScript `--noEmit` | Available (NOT RUN — would require deps install) |
| `npm run lint` | ESLint | Available (NOT RUN) |
| `npm run test` | Vitest | Available (NOT RUN) |
| `npm run smoke:*` | Individual smoke tests | Available (NOT RUN) |
| `npm run db:push` | Push Prisma schema | BLOCKED — would modify DB |
| `codex --version` | Codex CLI version | **CONFIRMED: 0.143.0** |
| `codex app-server --help` | App-server commands | **CONFIRMED: daemon, proxy, generate-ts, generate-json-schema** |
| `codex app-server generate-ts` | TS bindings | **CONFIRMED: Generated 87+ type files + v2/ namespace** |
| `codex app-server generate-json-schema` | JSON Schema | **CONFIRMED: Generated** |

---

## 5. Current Product Architecture

### 5.1 Next.js Routes & API Surface

The project exposes **~60+ API routes** under `src/app/api/` covering:
- **Agents**: CRUD, factory, model configs
- **Approvals**: CRUD, approval/reject workflow
- **MCP Bridge**: Plan-only HTTP endpoints (no real MCP proxy)
- **Memory**: CRUD, search, import, sources
- **AI Chat**: `/api/chat` — delegates to AgentRuntime
- **Local Agent Runtime/Operator**: Task execution endpoints
- **Board, Brain, Browser Research, Categories, Content Generation**
- **Daily Reports, Deploy, Departments, Email, Export**
- **GitHub Watcher, Phone Bridge, Projects, Repos, Settings**
- **Tasks, Telegram, Voice, Workflows**

### 5.2 State Management

- **Server**: Prisma (PostgreSQL) + in-memory (rate limiter, event bus, MCP clients)
- **Client**: Zustand (`src/lib/store.ts`) persisted to localStorage
- **Queue**: BullMQ (`src/lib/queue.ts`) backed by Redis (via Upstash)

### 5.3 Auth & Middleware

- **NextAuth** with single credential (`JARWISYAN_ADMIN_PASSWORD`)
- **Middleware**: fail-closed in production, open in non-production unless `JARWISYAN_AUTH_ENABLED=true`
- **Public paths**: `/api/auth`, `/login`
- **All `/api/` routes**: require valid token when auth is enabled
- **Rate limiting**: In-memory, per-IP, 30/min prod / 100/min dev

### 5.4 Agent Runtime Architecture

```
AgentExecutor (back-compat adapter)
  └── AgentRuntime (canonical engine)
       ├── Registry → Agent configs, model configs
       ├── ProviderRegistry → AI provider resolution
       ├── SkillRegistry → Skill injection
       ├── ToolRegistry → Tool collection (MCP tools included)
       ├── HookPipeline → Before/after hooks
       └── Tool Call Loop → Iterative tool calling
```

### 5.5 Approval Flow

1. Action requested → `PermissionChecker.checkPermission()`
2. Returns `{ allowed, requiresApproval, riskLevel, reason }`
3. If `requiresApproval: true` → creates `ApprovalRequest` in DB
4. UI `/approvals` → approve/reject
5. `ApprovalRequest` model in Prisma: taskId, agentId, actionType, risk, status, payload

### 5.6 Safety & Sandbox

- **PermissionChecker**: actor-aware risk matrix (LOW/MEDIUM/HIGH/CRITICAL × owner/admin/agent/viewer/system)
- **Local Operator**: `command-runner.ts` spawns processes with `validateCommand()` allowlist
- **Sandbox**: `assertPathAllowed()` validates workspace paths
- **Environment**: Secrets redacted in logs via pino redaction paths

---

## 6. Codex Integration Readiness

### 6.1 Current State

| Aspect | Status | Evidence |
|---|---|---|
| Codex adapter | **STUB** | `src/server/executor/codex-cli-adapter.ts` — writes `"Simulated Codex CLI Execution Report."` |
| `codex app-server` client | **NOT IMPLEMENTED** | No JSON-RPC client, no WebSocket/stdio transport to app-server |
| Thread/Session storage | **NOT IMPLEMENTED** | No `ThreadId` or session mapping in Prisma schema |
| Streaming events | **NOT IMPLEMENTED** | No `ServerNotification` subscription or SSE transport |
| Cancellation | **NOT IMPLEMENTED** | No `turn/interrupt` handling |
| Command/File approvals | **PARTIAL** | `ApprovalRequest` model exists, but not wired to Codex approval protocol |
| Diff rendering | **NOT IMPLEMENTED** | No `FileChange` diff UI integration |
| Sandbox settings | **NOT IMPLEMENTED** | No Codex sandbox config in project |
| Model selection | **PARTIAL** | `AgentModelConfig` exists for providers, no Codex model config |
| Process logs | **NOT IMPLEMENTED** | No Codex process log capture |
| Reconnect/recovery | **NOT IMPLEMENTED** | No daemon management or reconnection logic |
| Schema version handling | **NOT IMPLEMENTED** | No `codex app-server generate-ts` output in project |

### 6.2 Codex CLI Adapter (STUB) — Full Analysis

**File:** `src/server/executor/codex-cli-adapter.ts` (56 lines)

```typescript
export class CodexCliAdapter implements ExecutorAdapter {
  name = "codex_cli";
  async prepare(task) { /* reads prompt.md, asserts sandbox path */ }
  async run(task) {
    if (!task.approvalId) return { success: false, message: "Codex CLI execution requires approvalId" };
    // STUB: writes "Simulated Codex CLI Execution Report."
    await writeTaskFile(task.taskId, task.repoPath, "report.md", "Simulated Codex CLI Execution Report.");
    return { success: true, message: "Codex CLI run completed" };
  }
  async collectReport(task) { /* reads report.md back */ }
  async stop(taskId) { /* empty — "Kill running process logic here" */ }
}
```

**Findings:**
- **F-CX-01**: `run()` does not invoke `codex` CLI or `codex app-server`. It writes a static string.
- **F-CX-02**: `stop()` is empty — no process kill, no cancellation.
- **F-CX-03**: `collectReport()` reads a file that was written by the stub itself.
- **F-CX-04**: `JarvisTask` type defines `executor: "codex_cli" | "codex_ide" | "manual"` but `codex_ide` has no adapter.
- **F-CX-05**: No `codex app-server` JSON-RPC client exists anywhere in the codebase.

### 6.3 Codex `app-server` Protocol (Verified v0.143.0)

**Transports:**
- `stdio://` (default)
- `unix://` / `unix://PATH`
- `ws://IP:PORT`
- `off`

**Key Client → Server Methods (from generated TS):**
- `initialize` — handshake with capabilities
- `thread/start` — create a new conversation thread
- `thread/resume` — resume existing thread
- `turn/start` — begin a turn (user message)
- `turn/steer` — mid-turn steering
- `turn/interrupt` — cancel current turn
- `thread/shellCommand` — execute shell command
- `thread/goal/set` — set thread goal
- `fs/readFile`, `fs/writeFile`, `fs/createDirectory`, `fs/remove`, `fs/copy`, `fs/watch`, `fs/unwatch` — filesystem ops
- `command/exec`, `command/exec/write`, `command/exec/terminate`, `command/exec/resize` — process management
- `mcpServer/tool/call`, `mcpServer/resource/read`, `mcpServerStatus/list` — MCP integration
- `review/start` — start file change review
- `skills/list`, `skills/config/write`, `skills/extraRoots/set`
- `model/list`, `modelProvider/capabilities/read`
- `config/read`, `config/value/write`, `config/batchWrite`
- `account/login/start`, `account/login/cancel`, `account/logout`
- `permissionProfile/list`
- `experimentalFeature/list`, `experimentalFeature/enablement/set`

**Key Server → Client Notifications:**
- `thread/started`, `thread/status/changed`, `thread/closed`
- `turn/started`, `turn/completed`
- `item/started`, `item/completed`
- `item/autoApprovalReview/started`, `item/autoApprovalReview/completed` — approval flow
- `item/commandExecution/requestApproval`, `item/commandExecution/outputDelta` — command approval
- `item/fileChange/requestApproval`, `item/fileChange/outputDelta`, `item/fileChange/patchUpdated` — file change approval
- `item/agentMessage/delta` — streaming message delta
- `item/plan/delta` — plan streaming
- `item/permissions/requestApproval` — permission escalation
- `item/tool/call` — dynamic tool call
- `process/outputDelta`, `process/exited`
- `mcpServer/oauthLogin/completed`, `mcpServer/startupStatus/updated`
- `model/rerouted`, `model/verification`, `model/safetyBuffering/updated`
- `thread/compacted` — context compaction
- `thread/realtime/*` — voice/audio streaming
- `guardianWarning` — Codex guardian warnings

**Key Server → Client Approval Requests:**
- `item/commandExecution/requestApproval` → `CommandExecutionRequestApprovalParams`
- `item/fileChange/requestApproval` → `FileChangeRequestApprovalParams`
- `item/permissions/requestApproval` → `PermissionsRequestApprovalParams`
- `item/tool/call` → `DynamicToolCallParams`
- `applyPatchApproval` → `ApplyPatchApprovalParams`
- `execCommandApproval` → `ExecCommandApprovalParams`

**Sandbox/Permission Fields (from generated schema):**
- `ExecPolicyAmendment` — shell command policy
- `NetworkPolicyAmendment` / `NetworkPolicyRuleAction` — network access
- `ActivePermissionProfile` — permissive/balanced/restrictive
- `AdditionalFileSystemPermissions`, `AdditionalNetworkPermissions`
- `SandboxPermissions` in config: `disk-full-read-access`, etc.

**MCP-related Events:**
- `McpServerInfo`, `McpServerStatusUpdatedNotification`
- `McpServerOauthLoginCompletedNotification`
- `McpToolCallProgressNotification`
- `mcpServer/tool/call`, `mcpServer/resource/read`, `mcpServer/oauth/login`

---

## 7. MCP and AgentMemory

### 7.1 MCP Client Manager — REAL Implementation

**File:** `src/lib/mcp/McpClientManager.ts`

- Uses `@modelcontextprotocol/sdk` (v1.29.0)
- `StdioClientTransport` spawns MCP server processes via `npx`
- Singleton pattern with `global.__mcpClientManager` for HMR survival
- Supports `connect()`, `getClient()`, `disconnect()`, `disconnectAll()`
- Currently initializes **Brave Search** (if `BRAVE_API_KEY` set) and **GitHub** (if `GITHUB_PERSONAL_ACCESS_TOKEN` set) MCP servers
- `McpToolWrapper` wraps MCP tools into `ITool` interface for Tool Hub

**Classification:** CONFIRMED REAL — stdio-based MCP client, properly integrates with Tool Hub.

### 7.2 MCP Bridge — PLAN-ONLY

**File:** `src/lib/mcp-bridge/handshake.ts`

```typescript
export function getMcpBridgeStatus(kind: McpBridgeKind): McpBridgeHandshake {
  // Never checks a real port, never launches a process.
  return { kind, status, requiredEnv, installSteps, securityChecklist, connected: false };
}
```

**Key findings:**
- **F-MCP-01**: `connected: false` is hardcoded in the return type. The function never actually connects.
- **F-MCP-02**: `profiles.ts` defines 3 bridge kinds (desktop_commander, mcp, custom_local_agent) — all with status `"local_agent_required"` or `"connection_planned"`.
- **F-MCP-03**: No actual JSON-RPC or WebSocket transport to any external bridge.

### 7.3 AgentMemory — Internal Service, NOT MCP Server

**File:** `src/lib/agent-memory/index.ts`

- `MemorySystem` singleton, backed by Prisma (`MemoryItem` model)
- Operations: `store`, `getByScope`, `getByType`, `search`, `get`, `delete`, `getRecent`
- Exports: `sharedMemoryService`, `memoryRouter`, `rlmAgentMemoryRepository`
- **No MCP server protocol** — purely internal DB service
- `SharedMemoryService` provides project summarization and recall
- `MemoryRouter` routes memory queries by scope
- `RlmAgentMemoryRepository` handles trajectory/compaction storage

**Classification:** CONFIRMED — Internal service only. Not an MCP server. Does not expose `tools/list`, `resources/read`, or any MCP protocol method.

### 7.4 Required MCP Adapter for Codex

The Codex `app-server` has its own MCP integration (`mcpServer/tool/call`, `mcpServerStatus/list`). This is a **separate concern** from Jarvis's existing MCP Client Manager. The Codex app-server manages MCP servers internally; Jarvis's `McpClientManager` manages external MCP servers. These must remain separate layers.

---

## 8. Auth and Security Boundaries

### 8.1 Middleware

**File:** `src/middleware.ts`

- Production: auth enabled by DEFAULT (fail-closed) unless `JARWISYAN_AUTH_ENABLED=false`
- Non-production: auth disabled by DEFAULT unless `JARWISYAN_AUTH_ENABLED=true`
- Public paths: `/api/auth`, `/login`
- All `/api/` routes require valid token when auth is enabled
- Matcher excludes static assets, `_next`, `favicon`, `public`, `uploads`

### 8.2 Auth Provider

**File:** `src/lib/auth.ts`

- NextAuth v4 with credentials provider
- Single admin password from `JARWISYAN_ADMIN_PASSWORD` env
- JWT sessions, custom sign-in page at `/login`

### 8.3 Security Findings

| ID | Severity | Status | Description | File | Line |
|---|---|---|---|---|---|
| F-SEC-01 | **HIGH** | CONFIRMED | Non-production auth is OFF by default — any local/dev instance is open | `src/middleware.ts:13` | 13 |
| F-SEC-02 | **MEDIUM** | CONFIRMED | Single password auth — no MFA, no user isolation | `src/lib/auth.ts` | — |
| F-SEC-03 | **MEDIUM** | CONFIRMED | `McpClientManager.connect()` passes `process.env` to spawned MCP servers — potential secret exposure | `src/lib/mcp/McpClientManager.ts:42` | 42 |
| F-SEC-04 | **LOW** | CONFIRMED | Rate limiter is in-memory — resets on restart, no distributed enforcement | `src/lib/rate-limit.ts` | — |
| F-SEC-05 | **MEDIUM** | CONFIRMED | `CodexCliAdapter.run()` requires `approvalId` but never validates it exists or is approved | `src/server/executor/codex-cli-adapter.ts:21` | 21 |
| F-SEC-06 | **LOW** | CONFIRMED | MCP bridge `handshake.ts` has security checklist but never enforces it | `src/lib/mcp-bridge/handshake.ts:25-29` | 25-29 |
| F-SEC-07 | **LOW** | CONFIRMED | `command-runner.ts` uses `spawn()` with validated commands, but `stop()` in CodexCliAdapter is empty | `src/server/executor/codex-cli-adapter.ts:53` | 53 |

### 8.4 Codex Security Gaps (No Integration Yet)

| ID | Severity | Description |
|---|---|---|
| F-SEC-08 | **CRITICAL** | No Codex app-server auth — when connected, no `ws-auth` or `capability-token` validation in Jarvis |
| F-SEC-09 | **HIGH** | No workspace allowlist enforcement for Codex — `fs/writeFile` could write anywhere |
| F-SEC-10 | **HIGH** | No command injection guard for Codex `command/exec` — no mapping to Jarvis allowlist |
| F-SEC-11 | **MEDIUM** | No approval replay prevention — Codex approval params not tied to Jarvis ApprovalRequest lifecycle |
| F-SEC-12 | **MEDIUM** | No environment inheritance control — Codex daemon could access all process.env |

---

## 9. Data and Session Model

### 9.1 Prisma Schema Summary (40+ Models)

- **Core:** User, Workspace, Project, Epic, Task, Agent, AgentProfile, AgentCapability, AgentModelConfig, AgentPermission, AgentRuntimeState
- **Memory:** MemoryItem, MemoryRecord, KnowledgeVaultSource, AgentMemoryLink
- **Approval:** ApprovalRequest, ToolExecution, ToolPermissionPolicy
- **Tool Hub:** Tool, ToolExecution, ToolPack, ToolPackItem, ToolUsageLog, AgentToolLink
- **Skill Registry:** SkillDefinition, AgentSkillLink, SkillPack, SkillPackItem, SkillUsageLog
- **Content Calendar:** ContentItem, ContentReview, PublishingQueueItem
- **CRM:** Lead, Contact, Conversation, ConversationMessage, Deal, FollowUp
- **Browser Operator:** BrowserOperatorTask, BrowserOperatorLog, BrowserOperatorScreenshot, BrowserOperatorProviderConfig
- **PromptOps:** PromptTemplate, PromptVersion, PromptAuditLog, PromptRoleBinding, PromptCostLog
- **Marketplace:** MarketplaceItem
- **Department:** Department, HandoffRecord
- **GitHub:** Repository, RepositoryAnalysis, InstallPlan, WatchlistSnapshot, RepositoryHealthSnapshot, AnalysisRun, RepositoryTag, Category, Tag
- **Event Log:** EventLog, CostLog
- **Screenshot/OCR:** Screenshot, ExtractedCandidate

### 9.2 Missing for Codex Integration

| Missing Model | Purpose |
|---|---|
| `CodexThread` | Map Codex `ThreadId` to Workspace/Project |
| `CodexTurn` | Track conversation turns within a thread |
| `CodexApprovalMapping` | Link Codex `ServerRequest` approval IDs to Jarvis `ApprovalRequest` IDs |
| `CodexProcessLog` | Store `ProcessOutputDelta` / `ProcessExited` events |
| `CodexSandboxConfig` | Per-workspace sandbox/permission profile |

---

## 10. UI Integration Points

### 10.1 OS Dashboard

**File:** `src/components/os/OsSystemStatus.tsx`

- Contains hardcoded status entry: `{ name: "Codex", status: "offline" }`
- This is a **static placeholder** — no live connection to Codex app-server

### 10.2 Agent Management UI

- `/agents` — Agent creation, configuration, status
- Agent cards show status, location zone, active task
- No Codex thread/turn UI

### 10.3 Approval UI

- `/approvals` — Lists pending ApprovalRequests
- Approve/reject actions
- Not wired to Codex approval protocol (no `item/fileChange/requestApproval` handling)

### 10.4 Memory UI

- `/memory` — Memory CRUD, search, sources
- No Codex context/compaction UI

### 10.5 Chat UI

- `src/components/chat/` — Agent chat interface
- Streams from `/api/chat` → `AgentExecutor` → `AgentRuntime`
- No Codex turn-based streaming

---

## 11. Test and Build Evidence

| Check | Status | Evidence |
|---|---|---|
| `npm run typecheck` | **NOT RUN** | Would require `npm install`; audit is read-only |
| `npm run lint` | **NOT RUN** | Would require `npm install` |
| `npm run test` | **NOT RUN** | Would require `npm install` |
| `npm run build` | **NOT RUN** | Would require `npm install`; flagged as dangerous |
| Prisma validation | **NOT RUN** | Would require DB connection |
| Smoke tests | **NOT RUN** | Would require `npm install` |

### 11.1 Smoke Test Classification

| Script | Type | Verdict |
|---|---|---|
| `mcp-bridge-smoke.mjs` | Real (vitest delegation) | Delegates to `src/lib/mcp-bridge/mcp-bridge.test.ts` |
| `agent-factory-smoke.mjs` | Real (vitest delegation) | Delegates to `src/lib/agent-factory/agent-factory.test.ts` |
| `brain-smoke.mjs` | Real (vitest delegation) | Delegates to `src/lib/project-brain/project-brain-service.test.ts` |
| `command-router-smoke.mjs` | Real (vitest delegation) | Delegates to `src/lib/command-router/router.test.ts` |
| `local-agent-runtime-smoke.mjs` | Real (vitest delegation) | Delegates to corresponding `.test.ts` |
| `local-operator-smoke.mjs` | Real (vitest delegation) | Delegates to corresponding `.test.ts` |
| `security-smoke.mjs` | Real (vitest delegation) | Delegates to corresponding `.test.ts` |
| `not-implemented.mjs` | **STUB** | Placeholder for unimplemented smoke tests |
| `repo-health.mjs` | Real (filesystem checks) | Checks for `.git`, `package.json`, etc. |
| `env-sanity.mjs` | Real (env validation) | Checks for required env vars |

---

## 12. Confirmed Findings

| ID | Severity | Status | Finding | File:Line | Impact | Next Action | Verification |
|---|---|---|---|---|---|---|---|
| F-CX-01 | **CRITICAL** | CONFIRMED | CodexCliAdapter.run() is a stub — writes static string, never invokes Codex | `src/server/executor/codex-cli-adapter.ts:31` | No real Codex execution capability | Implement real `codex app-server` client | Read source |
| F-CX-02 | **HIGH** | CONFIRMED | CodexCliAdapter.stop() is empty — no process cancellation | `src/server/executor/codex-cli-adapter.ts:53` | Cannot cancel running Codex operations | Implement `turn/interrupt` | Read source |
| F-CX-03 | **HIGH** | CONFIRMED | No `codex app-server` JSON-RPC client anywhere in codebase | N/A | No Codex integration possible | Create `CodexAppServerClient` class | Grep for "app-server", "json-rpc" |
| F-CX-04 | **MEDIUM** | CONFIRMED | No thread/session storage mapping Codex threads to Jarvis workspaces | N/A | Cannot persist Codex conversations | Add `CodexThread` model to Prisma schema | Schema review |
| F-CX-05 | **MEDIUM** | CONFIRMED | No streaming event subscription — no `ServerNotification` handling | N/A | No real-time Codex output in UI | Implement SSE/WebSocket bridge to app-server | Architecture review |
| F-CX-06 | **MEDIUM** | CONFIRMED | No approval flow wiring between Codex `ServerRequest` and Jarvis `ApprovalRequest` | N/A | Codex approvals cannot be processed | Create approval bridge adapter | Architecture review |
| F-MCP-01 | **MEDIUM** | CONFIRMED | MCP bridge `handshake.ts` returns `connected: false` always | `src/lib/mcp-bridge/handshake.ts:30` | MCP bridge UI shows disconnected | Implement real connection logic | Read source |
| F-MCP-02 | **LOW** | CONFIRMED | MCP bridge profiles are static — no dynamic server discovery | `src/lib/mcp-bridge/profiles.ts` | Bridge types are hardcoded | Add dynamic MCP server registration | Read source |
| F-SEC-01 | **HIGH** | CONFIRMED | Non-production auth is OFF by default | `src/middleware.ts:13` | Local/dev instances are open | Default to ON or add warning | Read source |
| F-SEC-02 | **MEDIUM** | CONFIRMED | Single password auth, no MFA | `src/lib/auth.ts` | Account takeover risk | Add MFA or OAuth | Read source |
| F-SEC-03 | **MEDIUM** | CONFIRMED | `process.env` passed to MCP child processes | `src/lib/mcp/McpClientManager.ts:42` | Secret exposure to MCP servers | Whitelist only required env vars | Read source |
| F-SEC-08 | **CRITICAL** | HYPOTHESIS | No Codex app-server auth configured (no integration exists) | N/A | If connected, no auth on Codex side | Implement `ws-auth` with capability-token when integrating | Architecture review |

---

## 13. Unknowns and Access Gaps

| Unknown | Reason | Impact |
|---|---|---|
| Exact `codex app-server generate-json-schema` output | Generated to `%TEMP%` dir inside repo; not read in detail | Cannot confirm exact JSON-Schema types |
| Whether `npm install` completes cleanly | Not run — audit is read-only | Build/test status unknown |
| Whether Prisma migrations are up to date | Not run — would require DB connection | Schema drift possible |
| Runtime behavior of `McpClientManager.connect()` | Not tested — requires running MCP servers | MCP tool initialization sequence unknown |
| Whether `%TEMP%` directory is in `.gitignore` | Git commands timing out; directory created by audit | May appear as untracked files |
| Codex `daemon` process management | Not tested — would require running `codex app-server daemon` | Daemon lifecycle unknown |
| Codex `v2` protocol additions | Generated TS types exist under `v2/` namespace but not fully explored | May contain breaking changes or additional methods |

---

## 14. P0/P1/P2 Risks

### P0 — CRITICAL (Blocks Integration)

| Risk | Description |
|---|---|
| **No Codex app-server client** | Zero integration capability. The `CodexCliAdapter` is a stub. No JSON-RPC transport, no thread management, no streaming, no approval bridge. |
| **No Codex session persistence** | No DB models to track Codex threads, turns, or approval mappings. |
| **No Codex security boundary** | No auth, no workspace allowlist, no command injection guard for when app-server is connected. |

### P1 — HIGH (Functional Gaps)

| Risk | Description |
|---|---|
| **Approval flow disconnected** | Jarvis has `ApprovalRequest` model + `PermissionChecker`, but no bridge to Codex `ServerRequest` approval protocol. |
| **Streaming not wired** | Codex `ServerNotification` provides real-time deltas (message, file change, process output). No UI or backend consumer exists. |
| **MCP bridge is plan-only** | `mcp-bridge/` directory has types and profiles but `connected: false` everywhere. Not functional. |
| **Codex status widget is hardcoded** | `OsSystemStatus.tsx` shows `Codex: offline` — static, not derived from app-server state. |

### P2 — MEDIUM (Quality/Security Improvements)

| Risk | Description |
|---|---|
| **Single-password auth** | No MFA, no user isolation, no rate-limited login. |
| **process.env exposure to MCP** | Full environment passed to child MCP server processes. |
| **In-memory rate limiter** | Resets on restart; no distributed enforcement. |
| **No Codex reconnect/recovery** | No daemon management, no reconnection on disconnect. |
| **No Codex version pinning** | No lock file or version constraint for Codex CLI. |

---

## 15. Recommended Target Architecture

```
┌─────────────────────────────────────────────────┐
│                    Jarvis UI                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Agent    │ │ Approval │ │ Codex Thread      │ │
│  │ Dashboard│ │ Queue    │ │ Dashboard (NEW)  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│               Jarvis API Layer                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Agent    │ │ Approval │ │ Codex Proxy      │ │
│  │ Routes   │ │ Routes   │ │ Routes (NEW)     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│            Jarvis Service Layer                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Agent    │ │ Approval │ │ CodexAppServer    │ │
│  │ Runtime  │ │ Checker  │ │ Client (NEW)     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ MCP      │ │ Memory   │ │ Event Bus        │ │
│  │ Client   │ │ System   │ │ (existing)       │ │
│  │ Mgr     │ │          │ │                  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │ stdio:// or ws://
┌─────────────────────┴───────────────────────────┐
│           Codex app-server (daemon)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Thread   │ │ Turn     │ │ Approval         │ │
│  │ Mgmt     │ │ Execution│ │ Guardian         │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ FS Ops   │ │ Command  │ │ MCP Server       │ │
│  │          │ │ Exec     │ │ Mgmt             │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Key principle:** Jarvis's `McpClientManager` and Codex's internal MCP server management are **separate layers**. Jarvis connects to Codex via its JSON-RPC protocol (`ClientRequest`/`ServerNotification`), not via MCP.

---

## 16. Minimal-Diff Implementation Boundaries

### 16.1 What Can Be Added (No Changes to Existing Code)

| New Component | Purpose |
|---|---|
| `src/lib/codex/CodexAppServerClient.ts` | JSON-RPC client for `codex app-server` |
| `src/lib/codex/CodexThreadManager.ts` | Thread lifecycle management |
| `src/lib/codex/CodexApprovalBridge.ts` | Map Codex `ServerRequest` → Jarvis `ApprovalRequest` |
| `src/lib/codex/CodexNotificationHandler.ts` | Process `ServerNotification` events |
| `src/lib/codex/types.ts` | Re-export generated TS types |
| `src/app/api/codex/route.ts` | HTTP proxy to app-server |
| `src/app/api/codex/[...path]/route.ts` | Catch-all for Codex API |

### 16.2 What Must Be Modified (Minimal Changes)

| Existing File | Change Type | Description |
|---|---|---|
| `src/server/executor/codex-cli-adapter.ts` | **REPLACE** | Replace stub with real Codex app-server client calls |
| `prisma/schema.prisma` | **ADD** | Add `CodexThread`, `CodexTurn`, `CodexApprovalMapping` models |
| `src/components/os/OsSystemStatus.tsx` | **MODIFY** | Make Codex status dynamic |
| `src/lib/mcp-bridge/handshake.ts` | **MODIFY** | Add `connected: true` path when app-server is reachable |
| `src/lib/env.ts` | **ADD** | Add `CODEX_APP_SERVER_URL`, `CODEX_AUTH_TOKEN` env vars |

### 16.3 What Must NOT Be Changed

| Boundary | Reason |
|---|---|
| `src/lib/agent-core/runtime.ts` | Canonical execution engine — Codex is an alternative executor, not a replacement |
| `src/lib/mcp/McpClientManager.ts` | Separate concern — manages MCP servers, not Codex |
| `src/lib/safety/permission-checker.ts` | Existing approval matrix — Codex approvals bridge to it |
| `prisma/schema.prisma` existing models | Additive only — no renames, no type changes |

---

## 17. Proposed File Map

```
src/
├── lib/
│   ├── codex/                              # NEW
│   │   ├── CodexAppServerClient.ts         # JSON-RPC client (stdio/ws transport)
│   │   ├── CodexThreadManager.ts           # Thread CRUD, session mapping
│   │   ├── CodexApprovalBridge.ts          # ServerRequest → ApprovalRequest adapter
│   │   ├── CodexNotificationHandler.ts     # ServerNotification → EventBus bridge
│   │   ├── CodexStreamingAdapter.ts         # SSE/WS streaming to Next.js API routes
│   │   ├── types.ts                        # Re-exports from generated TS bindings
│   │   └── index.ts                        # Barrel export
│   └── ... (existing, unchanged)
├── app/
│   ├── api/
│   │   ├── codex/                           # NEW
│   │   │   ├── route.ts                     # Health check, status
│   │   │   ├── thread/route.ts              # Thread CRUD proxy
│   │   │   ├── turn/route.ts                # Turn start/steer/interrupt proxy
│   │   │   ├── events/route.ts              # SSE stream of ServerNotifications
│   │   │   └── approval/route.ts            # Approval bridge endpoint
│   │   └── ... (existing, unchanged)
│   └── ... (existing, unchanged)
├── components/
│   ├── codex/                               # NEW
│   │   ├── CodexThreadPanel.tsx             # Thread list + detail view
│   │   ├── CodexTurnStream.tsx             # Real-time turn output
│   │   ├── CodexApprovalCard.tsx            # Approval request UI
│   │   └── CodexFileDiff.tsx               # File change diff rendering
│   └── ... (existing, unchanged)
├── server/
│   └── executor/
│       ├── codex-cli-adapter.ts             # MODIFY: replace stub with real implementation
│       └── types.ts                         # MODIFY: add Codex thread/turn fields
└── prisma/
    └── schema.prisma                        # MODIFY: add CodexThread, CodexTurn, CodexApprovalMapping
```

---

## 18. Verification Plan

### Phase 1: Protocol Binding Generation

1. Run `codex app-server generate-ts --out src/lib/codex/generated/`
2. Run `codex app-server generate-json-schema --out src/lib/codex/generated/schema/`
3. Commit generated types (these are authoritative)
4. Verify TypeScript compilation with `npm run typecheck`

### Phase 2: Client Implementation

1. Implement `CodexAppServerClient` with stdio transport
2. Test `initialize` handshake
3. Test `thread/start` → `turn/start` → `turn/completed` lifecycle
4. Test `turn/interrupt` cancellation
5. Verify `ServerNotification` stream processing

### Phase 3: Integration

1. Wire `CodexCliAdapter.run()` to real app-server client
2. Wire `CodexApprovalBridge` — map `ServerRequest` approvals to Jarvis `ApprovalRequest`
3. Wire `CodexNotificationHandler` — bridge `ServerNotification` events to Jarvis `EventBus`
4. Add SSE endpoint for streaming to UI
5. Update `OsSystemStatus` to show live Codex status

### Phase 4: Security

1. Configure `ws-auth` with capability-token for non-stdio transports
2. Add `CODEX_APP_SERVER_URL` and `CODEX_AUTH_TOKEN` to env schema
3. Validate workspace allowlist for `fs/*` operations
4. Map Codex `ExecPolicyAmendment` to Jarvis `command-runner` allowlist
5. Implement approval replay prevention

### Phase 5: Smoke Tests

1. Add `codex-bridge-smoke.mjs` — test thread lifecycle
2. Add `codex-approval-smoke.mjs` — test approval bridge
3. Add `codex-streaming-smoke.mjs` — test notification stream
4. Run full `npm run smoke` suite

---

## 19. Current Project Phase

**Phase: Pre-Integration / Architecture Prototyping (Stage 3+)**

The project has:
- ✅ A mature agent runtime (`agent-core/runtime.ts` — 666 lines)
- ✅ A complete approval system (`PermissionChecker`, `ApprovalRequest` model)
- ✅ A working MCP client (`McpClientManager` with stdio transport)
- ✅ A rich Prisma schema (40+ models)
- ✅ A plan-only MCP bridge layer (`mcp-bridge/`)
- ✅ A comprehensive UI (agents, approvals, memory, OS dashboard)
- ❌ **No Codex app-server integration** — the adapter is a stub, no client exists
- ❌ **No streaming protocol** — no SSE/WebSocket for real-time Codex output
- ❌ **No approval bridge** — Codex approval protocol not wired

The project is architecturally ready for Codex integration (clean boundaries, executor adapter pattern, approval system, event bus) but has **zero implementation** of the actual connection.

---

## 20. Exit Verdict

### `READ_ONLY_AUDIT_COMPLETE`

**No tracked files were modified during this audit.** One untracked directory `%TEMP%/` was created inside the repo by `codex app-server generate-ts` due to PowerShell's handling of environment variables. This directory should be added to `.gitignore` and removed.

**Key findings summary:**
1. **Codex integration does not exist** — `CodexCliAdapter` is a stub that writes a static string
2. **Codex app-server protocol is fully documented** — `generate-ts` produced 87+ type files with v2 namespace, confirming thread/turn/approval/streaming capabilities
3. **MCP Client Manager is real** — stdio-based, but separate from Codex integration
4. **MCP Bridge is plan-only** — `handshake.ts` returns `connected: false`
5. **AgentMemory is an internal service** — not an MCP server
6. **Security gaps exist** — non-production auth is off, no Codex auth boundary
7. **The project is architecturally ready** — executor adapter pattern, approval system, event bus all support adding Codex as an alternative execution path

**Recommended immediate next step:** Create `src/lib/codex/CodexAppServerClient.ts` implementing the JSON-RPC client using the generated type bindings from `codex app-server generate-ts`.