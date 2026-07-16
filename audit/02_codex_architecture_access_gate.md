# Codex Architecture Lock & Access Gap Plan

**Date:** 2026-07-11  
**Architect:** Senior Solution Architect  
**Repository:** `d:\АГЕНТ\ДЖАРВИС — копия`  
**Branch:** `wip/os-shell-before-phone-bridge`  
**HEAD at audit:** `873a3bf594737e6d6e61a247144cceafb5c351e5`  
**HEAD at gate:** `972ccda63ce6b40b833fd64a20c69d80013c53b2` (drift detected — see §2)  
**Codex CLI:** `0.143.0`  
**Audit Reference:** `audit/01_codex_integration_readonly_audit.md`  
**Active Model:** GLM 5.2  
**Project:** `jarwisyan` v0.2.0  
**Framework:** Next.js 16.1.1 / React 19 / Prisma 6.11.1 / PostgreSQL

---

## 1. Gate Metadata

| Field | Value |
|---|---|
| Document type | Architecture Lock & Access Gap Plan |
| Source of truth | `audit/01_codex_integration_readonly_audit.md` + local HEAD implementation files |
| Codex version | `codex-cli 0.143.0` |
| Codex transports verified | `stdio://` (baseline), `unix://`, `ws://IP:PORT`, `off` |
| Codex auth modes | `capability-token`, `signed-bearer-token` (for ws:// only) |
| Protocol types generated | 87+ TypeScript files + `v2/` namespace (confirmed by `generate-ts`) |
| Status vocabulary | `FACT`, `CONFIRMED`, `ASSUMPTION`, `HYPOTHESIS`, `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `REJECTED` |
| Mandatory constraints | 15 constraints (see §5) |

---

## 2. Repository Hygiene Status

### 2.1 Git State

| Check | Value | Status |
|---|---|---|
| Branch | `wip/os-shell-before-phone-bridge` | CONFIRMED |
| HEAD at audit | `873a3bf` | STALE — HEAD has moved |
| HEAD at gate | `972ccda` | CONFIRMED (workspace config) |
| Remote | `origin → https://github.com/galstyanh992-max/instagithubanalizer.git` | CONFIRMED |
| Tracked file modifications | UNKNOWN — `git status` timed out during audit | BLOCKED |
| `%TEMP%/` directory | Created by `codex app-server generate-ts` inside repo root | **MUST NOT auto-delete** |

### 2.2 `%TEMP%/` Classification

**Status:** UNTRACKED artifact from audit Protocol Truth verification.

**Contents:** Generated Codex app-server TypeScript bindings (`codex-audit-ts/`, `codex-audit-schema/`).

**Classification:** Audit artifact — NOT project code. Contains authoritative protocol types that SHOULD be committed separately under `src/lib/codex/generated/` in G2.

**Recommended manual action:**
1. Move `%TEMP%/codex-audit-ts/` content to `src/lib/codex/generated/` during G2 (Protocol Bindings Lock)
2. Delete `%TEMP%/` directory manually: `rm -rf "d:\АГЕНТ\ДЖАРВИС — копия\%TEMP\"`
3. Add `%TEMP%/` to `.gitignore`

### 2.3 `mini-services/` Status

**Contents:** `.gitkeep` only — empty placeholder directory.

**Classification:** FACT — no companion process or mini-service exists yet. This is the correct location for the future Codex companion.

### 2.4 Deployment Model

**Current:** Next.js standalone build (`npm run build` → `.next/standalone/`), Caddyfile for reverse proxy. Single-process deployment.

**Codex companion:** MUST run as a separate long-lived process (mandatory constraint #6). Not embedded in Next.js.

---

## 3. Accepted Audit Findings

| Audit ID | Severity | Decision | Reason |
|---|---|---|---|
| F-CX-01 | CRITICAL | **ACCEPT** | CodexCliAdapter is a stub — confirmed, must replace |
| F-CX-02 | HIGH | **ACCEPT** | CodexCliAdapter.stop() empty — confirmed, must implement turn/interrupt |
| F-CX-03 | HIGH | **ACCEPT** | No app-server JSON-RPC client — confirmed, must create |
| F-CX-04 | MEDIUM | **ADAPT** | No thread/session storage — only `CodexThread` needed now, `CodexTurn` deferred |
| F-CX-05 | MEDIUM | **ADAPT** | No streaming — SSE projection added in G5, not G3 |
| F-CX-06 | MEDIUM | **ACCEPT** | No approval bridge — must create |
| F-MCP-01 | MEDIUM | **ACCEPT** | MCP bridge handshake returns false — confirmed, but see §4 |
| F-MCP-02 | LOW | **ACCEPT** | MCP bridge profiles static — confirmed |
| F-SEC-01 | HIGH | **ADAPT** | Non-production auth OFF — add warning banner, don't change default |
| F-SEC-02 | MEDIUM | **ACCEPT** | Single password auth — acknowledged, out of scope for Codex integration |
| F-SEC-03 | MEDIUM | **ADAPT** | process.env passed to MCP — whitelist env vars in companion too |
| F-SEC-08 | CRITICAL | **ADAPT** | No Codex auth — stdio transport doesn't need ws-auth; add when ws:// enabled |

---

## 4. Audit Corrections

### 4.1 Correction Table

| Audit Proposal | Decision | Reason | Evidence | Safe Replacement |
|---|---|---|---|---|
| Modify `src/lib/mcp-bridge/handshake.ts` | **REJECT** | Mandatory constraint #4: "handshake.ts не изменяется ради Codex status". Codex is NOT an MCP bridge — it's a separate JSON-RPC transport. Modifying handshake.ts conflates two different layers. | `handshake.ts` manages `desktop_commander`, `mcp`, `custom_local_agent` bridge kinds — none are Codex. | Create `src/lib/codex/CodexCompanionStatus.ts` instead |
| Generic catch-all Codex API route `[...path]` | **REJECT** | Mandatory constraint #5: "Не создаётся generic JSON-RPC passthrough endpoint". This would allow arbitrary method calls, bypassing all security gates. | Codex `ClientRequest` has 80+ methods including `command/exec`, `fs/writeFile`, `fs/remove` — none should be passable without validation. | Explicit narrow routes only (see §8) |
| `CODEX_APP_SERVER_URL` env var | **REJECT** | Mandatory constraint #7: first version uses stdio. stdio doesn't need a URL. A URL would encourage ws:// which is deferred to a separate security gate. | `codex app-server --help` confirms `--listen stdio://` is default transport. | Use `CODEX_CLI_PATH` env var instead (path to codex binary, default: `codex`) |
| `CODEX_AUTH_TOKEN` env var | **REJECT** | stdio transport on localhost does not require auth tokens. Capability tokens are for `ws://` non-loopback connections (mandatory constraint #8). | `codex app-server --help` shows `--ws-auth` only applies to `ws://` transport. | No auth env var needed for stdio. Add `CODEX_WS_AUTH_MODE` and `CODEX_CAPABILITY_TOKEN_PATH` in G6 when ws:// is enabled |
| 5 new Prisma models | **ADAPT** | Only `CodexThread` is needed immediately. `CodexTurn` can be inferred from thread state. `CodexApprovalMapping` is deferred to G6 (approval lifecycle is complex enough to warrant its own gate). `CodexProcessLog` is deferred to G5 (streaming). `CodexSandboxConfig` is deferred to G6 (security). | Prisma schema is 1542 lines already. Adding 5 models at once creates migration risk and scope creep. | Add 1 model now (`CodexThread`), defer 4 |
| Embed companion process in Next.js | **REJECT** | Mandatory constraint #6: "App-server process lifecycle принадлежит отдельному long-lived companion/service". Next.js serverless lifecycle (startup/shutdown per request) is incompatible with persistent stdio connections. | Codex app-server requires a persistent JSON-RPC connection; Next.js API routes are request-scoped. | Separate Node.js process in `mini-services/companion/` |
| Use WebSocket transport (ws://) | **REJECT** (for G0–G5) | Mandatory constraint #7 and #8: stdio first, ws:// deferred. | stdio is simpler, has no network exposure, no auth complexity. ws:// adds loopback binding, CSRF, and token management. | stdio in G0–G5, ws:// security gate in G6+ |
| Commit generated Codex types | **ACCEPT** | The `codex app-server generate-ts` output is authoritative protocol documentation. Committing it provides type safety and prevents version drift. | 87+ TypeScript files + v2 namespace = single source of truth for protocol. | Commit to `src/lib/codex/generated/` with version annotation |
| `CodexCliAdapter` replacement | **ACCEPT** | The stub must be replaced with real app-server client calls. | Lines 26-33 write a static string. | Replace with `CodexCompanion` client calls |
| Add `CodexAppServerClient.ts` | **ADAPT** → rename to `CodexCompanion.ts` | The term "AppServerClient" implies a direct connection from Next.js. The actual architecture is a companion process that manages the app-server lifecycle. The client should reflect this indirection. | Mandatory constraint #6 (separate process). | `src/lib/codex/CodexCompanion.ts` — manages companion process AND provides JSON-RPC client |

---

## 5. Final Architecture (Locked)

### 5.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (User)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ Agent     │ │ Approval │ │ Codex Thread Dashboard    │ │
│  │ Dashboard │ │ Queue    │ │ (NEW — SSE-fed)          │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS + SSE (authenticated)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                Jarvis Next.js Server                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ Existing │ │ Existing │ │ /api/codex/* (NEW)       │ │
│  │ API      │ │ Approval │ │ 6 narrow routes only     │ │
│  │ Routes   │ │ Routes   │ │ NO generic passthrough   │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ Agent    │ │ Approval │ │ CodexCompanion (NEW)      │ │
│  │ Runtime  │ │ Checker  │ │ ← manages companion proc │ │
│  └──────────┘ └──────────┘ │ ← provides JSON-RPC API  │ │
│                              └──────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ MCP      │ │ Memory   │ │ Event Bus               │ │
│  │ Client   │ │ System   │ │ (existing)              │ │
│  │ Mgr      │ │          │ │                         │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ Managed stdio pipe
                       │ (NOT direct from browser)
                       ▼
┌──────────────────────────────────────────────────────────┐
│          Codex Companion Process (NEW, separate)           │
│  mini-services/companion/index.ts                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ CodexCompanion                                    │    │
│  │  • spawn codex app-server --stdio                  │    │
│  │  • JSON-RPC request/response over stdin/stdout    │    │
│  │  • JSONL notification listener on stdout          │    │
│  │  • health check / restart / graceful shutdown    │    │
│  │  • environment whitelist (no full process.env)    │    │
│  │  • workspace path allowlist                       │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────┘
                       │ stdio:// (JSON-RPC JSONL)
                       ▼
┌──────────────────────────────────────────────────────────┐
│              codex app-server (daemon)                     │
│  Thread Mgmt │ Turn Execution │ Approval Guardian         │
│  FS Ops      │ Command Exec  │ MCP Server Mgmt           │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Mandatory Constraints (Locked)

| # | Constraint | Rationale |
|---|---|---|
| 1 | Browser never launches Codex, never accesses stdio | Security: browser is untrusted client |
| 2 | `codex app-server` does not masquerade as MCP | Layer separation: Codex has its own JSON-RPC protocol |
| 3 | `src/lib/mcp/McpClientManager.ts` not used as Codex transport | Architecture: different layers, different protocols |
| 4 | `src/lib/mcp-bridge/handshake.ts` not modified for Codex status | Scope: handshake manages MCP bridges, not Codex |
| 5 | No generic JSON-RPC passthrough endpoint | Security: prevents arbitrary method execution |
| 6 | App-server process lifecycle owned by separate companion | Lifecycle: Next.js can't manage persistent stdio connections |
| 7 | First version uses stdio only | Simplicity: no network exposure, no auth complexity |
| 8 | Network/WebSocket transport deferred to separate security gate | Security: ws:// requires auth, CSRF, token management |
| 9 | All workspace paths pass allowlist + canonical-path validation | Security: prevent path traversal |
| 10 | Codex approvals linked to existing Jarvis approval lifecycle | Consistency: one approval system, not two |
| 11 | One-time approval response; replay and stale approvals forbidden | Security: prevents approval replay attacks |
| 12 | Child process receives only whitelisted environment variables | Security: prevent secret leakage |
| 13 | stdout used only as JSON-RPC channel; diagnostics read separately | Protocol integrity: no mixed output on stdout |
| 14 | On companion termination, all child processes gracefully stopped | Process hygiene: prevent orphan processes |
| 15 | AgentMemory remains internal service until separate evidentiary MCP adapter | Scope: don't conflate memory service with Codex layer |

---

## 6. Trust Boundaries

| Boundary | Protocol | Auth | Data | Threat Model |
|---|---|---|---|---|
| Browser → Jarvis API | HTTPS | JWT (NextAuth) | Narrow API: 6 endpoints only | CSRF, XSS, session hijacking |
| Jarvis API → CodexCompanion | Internal function call | None (same process) | Method calls + SSE events | Internal trust; no network exposure |
| CodexCompanion → codex app-server | stdio JSON-RPC JSONL | None (localhost pipe) | Thread/turn/approval operations | Process isolation; env whitelist |
| Jarvis → PostgreSQL | Prisma client | `DATABASE_URL` (env) | All persistent data | SQL injection via Prisma (mitigated), DB credential exposure |
| Jarvis → Redis/Upstash | BullMQ | Redis URL (env) | Queue data | Queue poisoning, credential exposure |
| codex app-server → Filesystem | Codex sandbox | Sandbox permissions | Workspace files only | Path traversal (mitigated by allowlist) |
| codex app-server → MCP servers | stdio JSON-RPC | Per-MCP config | Tool calls | MCP tool injection |

---

## 7. Component Map

| # | Component | Responsibility | Proposed Path | Input | Output | Failure Behavior | Security Boundary | Test Strategy |
|---|---|---|---|---|---|---|---|---|
| 1 | **CodexCompanion** | Spawn/manage app-server process, provide JSON-RPC client API | `src/lib/codex/CodexCompanion.ts` | Config (CLI path, workspace), JSON-RPC requests | JSON-RPC responses, lifecycle events | Auto-restart on crash (max 3 attempts), emit error event | Owns child process; env whitelist; workspace allowlist | Unit: mock child_process; Integration: real `codex app-server` |
| 2 | **StdioTransport** | JSON-RPC JSONL over stdin/stdout | `src/lib/codex/StdioTransport.ts` | ChildProcess stdin/stdout streams | Parsed JSON-RPC messages | Reconnect with exponential backoff (max 5) | stdout is JSON-RPC ONLY; diagnostics on stderr | Unit: mock streams; Integration: real pipe |
| 3 | **RequestCorrelation** | Map request IDs to promises | `src/lib/codex/RequestCorrelation.ts` | JSON-RPC request with id | Promise resolution/rejection | Reject all pending on transport disconnect | No security boundary (internal) | Unit: id generation, timeout |
| 4 | **InitializeHandshake** | Send `initialize`, validate server capabilities | `src/lib/codex/InitializeHandshake.ts` | Client capabilities, protocol version | Server capabilities, confirmed protocol version | Fail-fast if version mismatch; emit `protocol_error` event | Protocol version check prevents version drift | Unit: mock responses; Integration: real `initialize` |
| 5 | **ThreadManager** | CRUD for Codex threads | `src/lib/codex/ThreadManager.ts` | `thread/start`, `thread/resume`, `thread/list`, `thread/read` | Thread objects, event emission | Reject on transport error; thread state in DB | Workspace-scoped; thread creation requires auth | Unit: mock transport; Integration: real threads |
| 6 | **TurnManager** | Start/steer/interrupt turns | `src/lib/codex/TurnManager.ts` | `turn/start`, `turn/steer`, `turn/interrupt` | Turn state, event emission | Reject on transport error; turn timeout (configurable) | Turn start requires workspace membership | Unit: mock transport; Integration: real turns |
| 7 | **NotificationRouter** | Route ServerNotifications to handlers and SSE | `src/lib/codex/NotificationRouter.ts` | ServerNotification stream | Dispatched events (approval, message, file change, process) | Buffer on high volume; drop stale after timeout | Notifications are read-only; no mutation from client | Unit: event dispatch; Integration: real notifications |
| 8 | **SSEProjection** | Project ServerNotifications to browser via SSE | `src/app/api/codex/threads/[id]/events/route.ts` | NotificationRouter events | SSE stream to browser | Reconnect on disconnect; last-event-id resume | Auth required; workspace-scoped; no arbitrary data | Unit: SSE format; Integration: browser client |
| 9 | **ApprovalBridge** | Map Codex ServerRequest → Jarvis ApprovalRequest | `src/lib/codex/ApprovalBridge.ts` | ServerRequest (approval params) | Jarvis ApprovalRequest creation + response | Queue on transport error; timeout after configurable period | One-time response only; no replay; stale rejection | Unit: mapping logic; Integration: real approval flow |
| 10 | **WorkspacePolicy** | Validate workspace paths, canonical-path resolution | `src/lib/codex/WorkspacePolicy.ts` | File paths from Codex, workspace root | Allow/deny decision + canonical path | Deny by default on any validation failure | Path traversal prevention; must be within workspace root | Unit: path traversal vectors; Integration: real fs ops |
| 11 | **EnvironmentWhitelist** | Filter process.env for companion child process | `src/lib/codex/EnvironmentWhitelist.ts` | process.env | Filtered env object | Deny all if whitelist is empty | Prevents secret leakage to Codex process | Unit: whitelist filtering; Integration: real spawn |
| 12 | **StructuredLogging** | Pino child logger with redaction for Codex operations | `src/lib/codex/Logging.ts` | All Codex operations | Structured JSON logs | Fail-open (log error but continue) | Redacts: apiKey, token, secret, password, DATABASE_URL, cookie, authorization | Unit: redaction patterns |
| 13 | **HealthStatus** | Check companion and app-server health | `src/lib/codex/HealthStatus.ts` | Health check request | `{ companion: boolean, appServer: boolean, version: string }` | Report unhealthy on timeout | No security boundary (read-only status) | Unit: mock health; Integration: real daemon |
| 14 | **GracefulShutdown** | Stop companion, drain turns, kill child process | `src/lib/codex/GracefulShutdown.ts` | SIGTERM/SIGINT | Clean exit: drain → stop → kill (escalation) | Force-kill after timeout (10s) | Prevents orphan processes | Unit: signal handling; Integration: real shutdown |
| 15 | **ProtocolVersionGuard** | Validate Codex protocol version on handshake | `src/lib/codex/ProtocolVersionGuard.ts` | InitializeResponse | Version compatibility check | Block connection if version mismatch | Prevents protocol version drift | Unit: version comparison logic |

---

## 8. Narrow API Contract

### 8.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/codex/status` | Companion + app-server health |
| GET | `/api/codex/threads` | List threads for workspace |
| POST | `/api/codex/threads` | Create new thread |
| POST | `/api/codex/threads/:id/turns` | Start a turn (send message) |
| POST | `/api/codex/threads/:id/interrupt` | Cancel current turn |
| GET | `/api/codex/threads/:id/events` | SSE stream of notifications |

### 8.2 Per-Endpoint Contract

#### `GET /api/codex/status`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Any authenticated user |
| Validation | None |
| Request shape | `{}` |
| Response shape | `{ companion: boolean, appServer: boolean, version: string, protocolVersion: string, activeThreads: number }` |
| Error codes | `503` — companion not running |
| Rate limit | 60/min |
| Audit event | `codex.status_checked` |
| Forbidden fields | None |

#### `GET /api/codex/threads`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Workspace member |
| Validation | `workspaceId` required, must exist |
| Request shape | `{ workspaceId: string }` |
| Response shape | `{ threads: CodexThread[] }` |
| Error codes | `400` — missing workspaceId; `403` — not workspace member |
| Rate limit | 60/min |
| Audit event | `codex.threads_listed` |
| Forbidden fields | No `appServerInternalId`, no `rawProtocolData` |

#### `POST /api/codex/threads`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Workspace member |
| Validation | `workspaceId` required; `model` optional, validated against whitelist; `goal` optional string |
| Request shape | `{ workspaceId: string, model?: string, goal?: string }` |
| Response shape | `{ thread: CodexThread }` |
| Error codes | `400` — validation failed; `403` — not workspace member; `503` — companion unavailable |
| Rate limit | 10/min |
| Audit event | `codex.thread_created` |
| Forbidden fields | No `executable`, `cwd`, `environment`, arbitrary `fs/*` paths, arbitrary JSON-RPC method |

#### `POST /api/codex/threads/:id/turns`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Thread owner or workspace admin |
| Validation | `content` required string (1–32000 chars); `threadId` must exist and belong to workspace |
| Request shape | `{ content: string }` |
| Response shape | `{ turnId: string, status: string }` |
| Error codes | `400` — content validation; `403` — not thread owner; `404` — thread not found; `409` — turn already active; `503` — companion unavailable |
| Rate limit | 20/min |
| Audit event | `codex.turn_started` |
| Forbidden fields | No `modelOverride` (use thread model), no `sandboxPermissions` override, no `execPolicyAmendment` |

#### `POST /api/codex/threads/:id/interrupt`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Thread owner or workspace admin |
| Validation | Thread must exist and have active turn |
| Request shape | `{}` |
| Response shape | `{ status: "interrupted" }` |
| Error codes | `404` — thread not found; `409` — no active turn; `503` — companion unavailable |
| Rate limit | 10/min |
| Audit event | `codex.turn_interrupted` |
| Forbidden fields | None |

#### `GET /api/codex/threads/:id/events`

| Field | Value |
|---|---|
| Authentication | Required (NextAuth JWT) |
| Authorization | Thread owner or workspace member |
| Validation | Thread must exist |
| Request shape | SSE connection with `Last-Event-ID` header for resume |
| Response shape | SSE stream: `event: notification\ndata: { type: string, payload: object }\n\n` |
| Error codes | `404` — thread not found; `503` — companion unavailable |
| Rate limit | 1 concurrent connection per thread per user |
| Audit event | `codex.sse_connected` |
| Forbidden fields | No raw JSON-RPC passthrough; only mapped notification types |

### 8.3 Universal Restrictions

**The following are FORBIDDEN in all Codex API endpoints:**

- Passing arbitrary `executable` paths
- Passing arbitrary `cwd` paths
- Passing arbitrary `environment` variables
- Passing arbitrary `filesystem` paths (only workspace-relative paths resolved by WorkspacePolicy)
- Passing arbitrary JSON-RPC method names
- Passing `sandboxPermissions` overrides (set at companion config level)
- Passing `execPolicyAmendment` (set at companion config level)
- Direct access to `fs/*`, `command/exec/*`, `config/*` Codex methods

---

## 9. Process Lifecycle

```
┌─────────────────────────────────────┐
│  Jarvis Next.js Server (PID 1)        │
│                                       │
│  On startup:                          │
│    1. CodexCompanion.initialize()     │
│    2. Spawn: codex app-server --stdio │
│    3. Send: initialize                │
│    4. Validate: protocol version      │
│    5. Register: notification handlers │
│                                       │
│  On SIGTERM/SIGINT:                  │
│    1. GracefulShutdown.initiate()     │
│    2. Drain: wait for active turns   │
│    3. Stop: send turn/interrupt       │
│    4. Cleanup: close stdio pipes      │
│    5. Kill: SIGTERM child process     │
│    6. Force-kill after 10s timeout    │
└─────────────────────────────────────┘

Health check flow:
  GET /api/codex/status → CodexCompanion.getHealth()
    → check child process alive
    → check stdin/stdout pipes open
    → send initialize (if reconnecting)
    → return { companion, appServer, version }
```

---

## 10. Approval Lifecycle

### 10.1 Flow

```
Codex app-server                   Jarvis
     │                                │
     │  ServerRequest                 │
     │  (item/fileChange/             │
     │   requestApproval)             │
     │───────────────────────────────>│
     │                                │  ApprovalBridge.map()
     │                                │  → Create ApprovalRequest
     │                                │  → Store in DB
     │                                │  → Emit event to SSE
     │                                │
     │                                │  UI: /approvals/:id
     │                                │  → User approves/rejects
     │                                │
     │                                │  ApprovalBridge.respond()
     │                                │  → Validate one-time
     │                                │  → Validate not stale
     │                                │  → Send ClientRequest response
     │<───────────────────────────────│
     │  ApprovalResponse              │
```

### 10.2 Anti-Replay Rules

| Rule | Implementation |
|---|---|
| One-time response | ApprovalRequest gets `status: 'approved'` or `'rejected'` immediately; subsequent responses return `409 Conflict` |
| Stale rejection | ApprovalRequest has `createdAt`; if `now - createdAt > 5min`, auto-reject as stale |
| Idempotency key | Use Codex `ServerRequest.id` as `approvalId` to prevent duplicate creation |
| Audit trail | Every approval decision creates an `EventLog` entry with `eventType: 'codex.approval.decided'` |

---

## 11. Workspace and Environment Policy

### 11.1 Workspace Path Allowlist

```typescript
// WorkspacePolicy.ts
const ALLOWED_OPERATIONS = new Set([
  'fs/readFile',
  'fs/writeFile',  // only within workspace root
  'fs/createDirectory',  // only within workspace root
  'fs/readDirectory',
  'fs/copy',  // only within workspace root
]);

function validatePath(inputPath: string, workspaceRoot: string): string {
  const canonical = path.resolve(workspaceRoot, inputPath);
  if (!canonical.startsWith(workspaceRoot)) {
    throw new Error(`PATH_TRAVERSAL_BLOCKED: ${inputPath} resolves outside workspace`);
  }
  return canonical;
}
```

### 11.2 Environment Whitelist

```typescript
// EnvironmentWhitelist.ts
const ALLOWED_ENV_VARS = new Set([
  'PATH',
  'HOME',
  'LANG',
  'NODE_ENV',
  'CODEX_MODEL',        // if needed
  'OPENAI_API_KEY',     // only if Codex needs it
  // NEVER: DATABASE_URL, JARWISYAN_ADMIN_PASSWORD, JWT_SECRET, etc.
]);

function filterEnv(fullEnv: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const key of ALLOWED_ENV_VARS) {
    if (fullEnv[key] !== undefined) {
      filtered[key] = fullEnv[key];
    }
  }
  return filtered;
}
```

---

## 12. Persistence Decision

### 12.1 Entity Matrix

| Entity | Required Now? | Reuse Existing? | Purpose |
|---|---|---|---|
| Thread ↔ Workspace mapping | **YES** | NO — new `CodexThread` model | Map Codex ThreadId to Jarvis Workspace |
| Turn state | **NO** (deferred) | Can infer from Codex app-server state | Track conversation turns |
| Approval mapping | **NO** (deferred to G6) | YES — reuse `ApprovalRequest` with Codex-specific `actionType` | Link Codex approval IDs to Jarvis approvals |
| Process output | **NO** (deferred to G5) | Stream via SSE, don't persist | Store Codex process logs |
| Sandbox config | **NO** (deferred to G6) | N/A | Per-workspace Codex sandbox permissions |

### 12.2 New Model (Now)

```prisma
model CodexThread {
  id            String   @id @default(cuid())
  workspaceId  String
  codexThreadId String   @unique  // Codex app-server's ThreadId
  model         String?             // Model used for this thread
  goal          String?             // Thread goal
  status        String   @default("active")  // active | archived | closed
  lastTurnAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([codexThreadId])
  @@map("codex_threads")
}
```

### 12.3 Deferred Models

| Model | Gate | Reason |
|---|---|---|
| `CodexTurn` | G5+ | Turn state can be fetched from app-server; persistence adds latency |
| `CodexApprovalMapping` | G6 | Approval bridge needs its own security gate |
| `CodexProcessLog` | G5 | SSE streaming replaces need for DB persistence |
| `CodexSandboxConfig` | G6 | Workspace sandbox is a security concern requiring separate review |

### 12.4 Retention Policy

| Entity | Retention | Reason |
|---|---|---|
| `CodexThread` | 90 days | Thread lifecycle is bounded by workspace |
| `ApprovalRequest` (reused) | Existing policy | No change |
| `EventLog` (Codex events) | 30 days | High volume; archival to cold storage |

### 12.5 Payload Size Limits

| Field | Limit |
|---|---|
| Turn content (message) | 32,000 chars |
| Thread goal | 1,000 chars |
| Approval summary | 10,000 chars |
| SSE event payload | 64 KB |
| File change diff | 1 MB per file |

### 12.6 PII/Secret Restrictions

- **NEVER** store `DATABASE_URL`, API keys, tokens, or credentials in `CodexThread`
- **NEVER** store raw file content in `EventLog` — only metadata and summaries
- **ALWAYS** redact secrets in logs via pino redaction paths
- **NEVER** pass user passwords through Codex API endpoints

---

## 13. AgentMemory MCP Boundary

**Decision:** AgentMemory remains an internal Prisma-backed service until G9 (AgentMemory MCP Adapter).

**Rationale:**
1. AgentMemory (`src/lib/agent-memory/`) is NOT an MCP server — it's a DB-backed singleton.
2. Creating an MCP adapter without evidence of external consumers is premature complexity.
3. Codex app-server has its own MCP management (`mcpServer/tool/call`, `mcpServerStatus/list`).
4. The two layers (Jarvis MCP Client Manager ↔ Codex MCP Server Management) must remain separate.

**G9 scope:**
- Create `AgentMemoryMcpAdapter` that exposes `store`, `search`, `getByScope` as MCP tools
- Register with Codex via `mcpServer/tool/call` ONLY when explicitly configured
- Must include approval flow for write operations (memory.store requires approval)

---

## 14. Access Gap Matrix

| Service / Capability | Needed? | Purpose | Minimum Access | Where Configured | Secret Name | Environment | Status |
|---|---|---|---|---|---|---|---|
| Local Git repository | YES | Codex workspace for file operations | Read+Write within workspace root | WorkspacePolicy allowlist | N/A | Local | READY |
| Codex CLI binary | YES | Spawn `codex app-server --stdio` | Execute binary | `CODEX_CLI_PATH` env var (default: `codex`) | N/A | Local | READY |
| Codex CLI login | MAYBE | Required if using OpenAI models | Auth token in `~/.codex/` | `codex login` command | N/A | Local | NOT_NEEDED (local models first) |
| PostgreSQL | YES | Jarvis data + CodexThread model | Read+Write | `DATABASE_URL` (existing) | UNKNOWN (existing) | Local/Remote | READY |
| Redis/Upstash | YES | BullMQ queues | Read+Write | `UPSTASH_REDIS_REST_URL` (existing) | UNKNOWN (existing) | Remote | READY |
| GitHub remote | NOT_NEEDED | No Git push from Codex in G0–G5 | N/A | N/A | N/A | N/A | NOT_NEEDED |
| GitHub Actions | NOT_NEEDED | No CI/CD for companion yet | N/A | N/A | N/A | N/A | NOT_NEEDED |
| Vercel/deploy target | NOT_NEEDED | Companion runs locally, not on Vercel | N/A | N/A | N/A | N/A | NOT_NEEDED |
| AgentMemory DB access | YES (via Prisma) | CodexThread persistence | Read+Write | `DATABASE_URL` (existing) | UNKNOWN (existing) | Local/Remote | READY |
| Optional MCP servers | NOT_NEEDED | Codex manages its own MCP servers internally | N/A | N/A | N/A | N/A | NOT_NEEDED |
| Browser automation | NOT_NEEDED | No browser from companion in G0–G5 | N/A | N/A | N/A | N/A | NOT_NEEDED |
| Monitoring | DEFERRED | Companion health via `/api/codex/status` endpoint | N/A | N/A | N/A | N/A | BLOCKED (G8+) |
| Production domain | NOT_NEEDED | Companion runs on localhost | N/A | N/A | N/A | N/A | NOT_NEEDED |

**Key rules:**
- For local stdio, NO URL or token is required (mandatory constraint #7)
- GitHub PAT is NOT required if local Git is sufficient (mandatory: no deploy credentials until preview phase)
- UNKNOWN env names are existing vars that should NOT be shown in this document (safety rule)
- User returns only status: `READY / NOT_NEEDED / BLOCKED`

---

## 15. Dependency Graph

```
G0 Repository Hygiene
│  • Add %TEMP%/ to .gitignore
│  • Verify npm install works
│  • Verify typecheck passes
│  • Verify lint passes
│
→ G1 Dependency and Quality Baseline
│  • npm install clean
│  • npm run typecheck: exit 0
│  • npm run lint: exit 0
│  • npm run test: exit 0 (existing tests)
│
→ G2 Protocol Bindings Lock
│  • codex app-server generate-ts → src/lib/codex/generated/
│  • codex app-server generate-json-schema → src/lib/codex/generated/schema/
│  • Commit generated types with version annotation
│  • Verify TypeScript compilation with generated types
│
→ G3 Companion Process + JSON-RPC Core
│  • Implement CodexCompanion (spawn, health, shutdown)
│  • Implement StdioTransport (JSON-RPC JSONL)
│  • Implement RequestCorrelation
│  • Implement InitializeHandshake
│  • Implement ProtocolVersionGuard
│  • Implement EnvironmentWhitelist
│  • Implement WorkspacePolicy
│  • Implement Logging (pino child)
│
→ G4 Thread/Turn Lifecycle
│  • Implement ThreadManager
│  • Implement TurnManager
│  • Implement GET /api/codex/status
│  • Implement GET /api/codex/threads
│  • Implement POST /api/codex/threads
│  • Implement POST /api/codex/threads/:id/turns
│  • Implement POST /api/codex/threads/:id/interrupt
│  • Add CodexThread model to Prisma schema
│  • Replace CodexCliAdapter with real companion calls
│
→ G5 Streaming Projection
│  • Implement NotificationRouter
│  • Implement SSEProjection
│  • Implement GET /api/codex/threads/:id/events
│  • Verify real-time message, file change, and process output streaming
│
→ G6 Approval and Workspace Security
│  • Implement ApprovalBridge
│  • Implement one-time approval response
│  • Implement stale approval rejection
│  • Implement CodexApprovalMapping model (deferred from G0)
│  • Implement CodexSandboxConfig model (deferred from G0)
│  • Implement workspace path allowlist enforcement
│  • Implement env whitelist enforcement
│
→ G7 Persistence
│  • Implement CodexTurn model (if needed)
│  • Implement CodexProcessLog model (if needed)
│  • Implement EventLog integration for Codex events
│  • Implement 90-day thread retention policy
│
→ G8 Jarvis UI Integration
│  • CodexThreadPanel component
│  • CodexTurnStream component
│  • CodexApprovalCard component
│  • CodexFileDiff component
│  • Update OsSystemStatus to show live Codex status
│
→ G9 AgentMemory MCP Adapter
│  • Create AgentMemoryMcpAdapter exposing store/search/getByScope
│  • Register with Codex via mcpServer/tool/call
│  • Approval flow for write operations
│
→ G10 End-to-End Verification
│  • Full integration test: thread → turn → approval → completion
│  • Graceful shutdown test
│  • Orphan process test
│  • Security test: path traversal, command injection, env leakage
│  • Performance test: concurrent SSE connections
│  • Full smoke suite: codex-bridge, codex-approval, codex-streaming
```

### Per-Gate Details

#### G0: Repository Hygiene
- **Prerequisites:** None
- **Implementation scope:** `.gitignore` update, `npm install`, typecheck, lint
- **Verification:** `npm run typecheck && npm run lint` both exit 0
- **Rollback:** Revert `.gitignore` change
- **Exit criteria:** Clean typecheck + lint + test
- **Blocker conditions:** Missing dependencies, TypeScript errors

#### G1: Dependency and Quality Baseline
- **Prerequisites:** G0 complete
- **Implementation scope:** Resolve any dependency issues, ensure all existing tests pass
- **Verification:** `npm run test` exits 0
- **Rollback:** None (no code changes expected)
- **Exit criteria:** All existing tests green
- **Blocker conditions:** Failing tests, missing test infrastructure

#### G2: Protocol Bindings Lock
- **Prerequisites:** G1 complete
- **Implementation scope:** Run `codex app-server generate-ts` and `generate-json-schema`, commit to `src/lib/codex/generated/`
- **Verification:** TypeScript compilation with generated types; version annotation matches Codex CLI version
- **Rollback:** Delete `src/lib/codex/generated/`
- **Exit criteria:** `npm run typecheck` passes with generated types included
- **Blocker conditions:** Codex CLI not installed, version mismatch

#### G3: Companion Process + JSON-RPC Core
- **Prerequisites:** G2 complete
- **Implementation scope:** 8 components (CodexCompanion, StdioTransport, RequestCorrelation, InitializeHandshake, ProtocolVersionGuard, EnvironmentWhitelist, WorkspacePolicy, Logging)
- **Verification:** Companion spawns app-server, handshake completes, health check passes
- **Rollback:** Delete `src/lib/codex/` and `mini-services/companion/`
- **Exit criteria:** `GET /api/codex/status` returns `{ companion: true, appServer: true }`
- **Blocker conditions:** app-server fails to start, protocol version mismatch

#### G4: Thread/Turn Lifecycle
- **Prerequisites:** G3 complete
- **Implementation scope:** ThreadManager, TurnManager, 6 API routes, CodexThread Prisma model, CodexCliAdapter replacement
- **Verification:** Create thread → send turn → receive response → interrupt turn
- **Rollback:** Revert API routes and CodexCliAdapter, remove CodexThread model
- **Exit criteria:** Full thread/turn lifecycle works end-to-end
- **Blocker conditions:** Prisma migration fails, API routes don't compile

#### G5: Streaming Projection
- **Prerequisites:** G4 complete
- **Implementation scope:** NotificationRouter, SSEProjection, `/events` endpoint
- **Verification:** SSE stream delivers real-time message deltas and file change notifications
- **Rollback:** Remove SSE endpoint and NotificationRouter
- **Exit criteria:** SSE stream works for 5+ minutes without disconnection
- **Blocker conditions:** SSE implementation issues, notification parsing errors

#### G6: Approval and Workspace Security
- **Prerequisites:** G5 complete
- **Implementation scope:** ApprovalBridge, one-time approval, stale rejection, CodexApprovalMapping model, workspace allowlist, env whitelist enforcement
- **Verification:** Codex approval request → Jarvis ApprovalRequest → approve → Codex receives response; replay rejected; stale rejected
- **Rollback:** Remove approval bridge, remove CodexApprovalMapping model
- **Exit criteria:** Full approval lifecycle works; replay and stale attacks fail
- **Blocker conditions:** Approval model incompatibility, race conditions

#### G7: Persistence
- **Prerequisites:** G6 complete
- **Implementation scope:** CodexTurn model (optional), CodexProcessLog model (optional), EventLog integration, retention policy
- **Verification:** Turn state persists across companion restarts; logs queryable
- **Rollback:** Remove CodexTurn/CodexProcessLog models
- **Exit criteria:** Data survives companion restart
- **Blocker conditions:** Schema migration issues

#### G8: Jarvis UI Integration
- **Prerequisites:** G7 complete
- **Implementation scope:** 4 UI components + OsSystemStatus update
- **Verification:** Thread panel shows live data; approval cards work; file diffs render
- **Rollback:** Remove components, revert OsSystemStatus
- **Exit criteria:** UI works with real Codex data
- **Blocker conditions:** Component library issues, SSE client bugs

#### G9: AgentMemory MCP Adapter
- **Prerequisites:** G8 complete
- **Implementation scope:** AgentMemoryMcpAdapter, Codex MCP registration
- **Verification:** Codex can call memory.store/search/getByScope via MCP
- **Rollback:** Remove adapter
- **Exit criteria:** Memory operations work through Codex MCP
- **Blocker conditions:** MCP protocol incompatibility

#### G10: End-to-End Verification
- **Prerequisites:** G9 complete
- **Implementation scope:** Integration tests, security tests, performance tests
- **Verification:** Full lifecycle; security; performance
- **Rollback:** None (no new code)
- **Exit criteria:** All tests green; no security findings
- **Blocker conditions:** Critical security findings, performance issues

---

## 16. Verification Strategy

| Gate | Primary Verification | Smoke Test | Rollback Test |
|---|---|---|---|
| G0 | `npm run typecheck && npm run lint` | `npm run smoke:repo` | Revert `.gitignore` |
| G1 | `npm run test` | `npm run smoke` (full suite) | None |
| G2 | TypeScript compilation with generated types | `codex-protocol-smoke.mjs` | Delete `src/lib/codex/generated/` |
| G3 | `GET /api/codex/status` returns healthy | `codex-companion-smoke.mjs` | Delete `src/lib/codex/` |
| G4 | Thread create → turn → response → interrupt | `codex-lifecycle-smoke.mjs` | Revert API routes |
| G5 | SSE stream delivers notifications | `codex-streaming-smoke.mjs` | Remove SSE endpoint |
| G6 | Approval lifecycle; replay/stale rejection | `codex-approval-smoke.mjs` | Remove approval bridge |
| G7 | Data persists across companion restart | `codex-persistence-smoke.mjs` | Remove new models |
| G8 | UI renders real Codex data | Manual browser test | Remove components |
| G9 | Memory ops via Codex MCP | `codex-memory-smoke.mjs` | Remove adapter |
| G10 | Full integration + security test | `codex-e2e-smoke.mjs` | None |

---

## 17. Rollback Strategy

| Gate | Rollback Procedure | Impact |
|---|---|---|
| G0 | Revert `.gitignore` change | No impact — cosmetic only |
| G1 | None (no code changes) | No impact |
| G2 | Delete `src/lib/codex/generated/`, revert `tsconfig` if modified | Types unavailable but code doesn't depend on them yet |
| G3 | Delete `src/lib/codex/`, remove companion process | No Codex integration — revert to stub |
| G4 | Revert API routes, remove CodexThread model, restore CodexCliAdapter stub | Thread/turn API removed; stub restored |
| G5 | Remove SSE endpoint and NotificationRouter | No streaming; thread/turn still works |
| G6 | Remove ApprovalBridge and security enforcement | Approvals bypass Codex; revert to manual |
| G7 | Remove CodexTurn/CodexProcessLog models | Data loss for those models only |
| G8 | Remove UI components, revert OsSystemStatus | No Codex UI; status shows "offline" |
| G9 | Remove AgentMemoryMcpAdapter | No MCP memory via Codex |
| G10 | None (verification only) | No impact |

---

## 18. Proposed 20-Prompt Resume Pack

**PROJECT_COMPLEXITY = COMPLEX**  
**PACK_MODE = TWO_PACKS_20**

### Pack A: Core Infrastructure (Prompts 1–10)

| # | Prompt Name | Purpose |
|---|---|---|
| 1 | `g0-repo-hygiene` | Add `%TEMP%/` to `.gitignore`, verify clean build |
| 2 | `g1-quality-baseline` | Fix typecheck/lint/test errors, establish green baseline |
| 3 | `g2-protocol-bindings` | Generate and commit Codex protocol types, verify compilation |
| 4 | `g3-companion-core` | Implement CodexCompanion, StdioTransport, RequestCorrelation, InitializeHandshake |
| 5 | `g3-security-core` | Implement ProtocolVersionGuard, EnvironmentWhitelist, WorkspacePolicy, Logging |
| 6 | `g4-thread-turn-api` | Implement ThreadManager, TurnManager, 6 narrow API routes |
| 7 | `g4-prisma-migration` | Add CodexThread model, run migration, replace CodexCliAdapter |
| 8 | `g5-notification-router` | Implement NotificationRouter and SSEProjection |
| 9 | `g6-approval-bridge` | Implement ApprovalBridge with one-time response and stale rejection |
| 10 | `g6-security-enforcement` | Implement workspace allowlist, env whitelist enforcement, approval replay prevention |

### Pack B: Integration & Verification (Prompts 11–20)

| # | Prompt Name | Purpose |
|---|---|---|
| 11 | `g7-persistence-layer` | Implement CodexApprovalMapping model, EventLog integration, retention policy |
| 12 | `g8-ui-thread-panel` | Implement CodexThreadPanel and CodexTurnStream components |
| 13 | `g8-ui-approval-diff` | Implement CodexApprovalCard and CodexFileDiff components |
| 14 | `g8-status-integration` | Update OsSystemStatus to show live Codex companion status |
| 15 | `g9-memory-adapter` | Implement AgentMemoryMcpAdapter with store/search/getByScope |
| 16 | `g9-codex-mcp-registration` | Register AgentMemory MCP adapter with Codex app-server |
| 17 | `g10-integration-test` | Full lifecycle test: thread → turn → approval → completion |
| 18 | `g10-security-test` | Path traversal, command injection, env leakage, approval replay tests |
| 19 | `g10-smoke-suite` | Create codex-bridge, codex-approval, codex-streaming smoke tests |
| 20 | `g10-docs-and-cleanup` | Update README, API docs, architecture docs, remove `%TEMP%/` |

---

## 19. Blockers

| # | Blocker | Severity | Gate Affected | Resolution |
|---|---|---|---|---|
| B1 | HEAD drift: audit at `873a3bf`, current at `972ccda` | MEDIUM | All | Verify no breaking changes since audit; re-verify key files |
| B2 | `%TEMP%/` directory in repo root | LOW | G0 | Manual cleanup; add to `.gitignore` |
| B3 | `npm install` not verified | MEDIUM | G0-G1 | Must verify clean install before any implementation |
| B4 | `npm run typecheck` not verified | MEDIUM | G0-G1 | Must pass before G2 |
| B5 | `npm run test` not verified | MEDIUM | G1 | Must pass before G2 |
| B6 | Codex CLI login status unknown | LOW | G3 | May need `codex login` if using OpenAI models; local models don't require it |
| B7 | `codex app-server daemon` not tested | LOW | G3 | Must verify daemon start/stop works |
| B8 | No existing companion process in `mini-services/` | FACT | G3 | Expected — companion will be created from scratch |

---

## 20. Phase Verdict

### `P4_PASSED_ACCESS_STATUS_REQUIRED`

**Rationale:**
- All mandatory architecture constraints are satisfiable
- stdio baseline transport is confirmed available and requires no auth tokens or URLs
- The 10-gate roadmap provides clear verification and rollback at each step
- No circular dependencies or impossible requirements identified
- MCP and Codex app-server are correctly separated as different layers
- Generic passthrough is explicitly rejected
- Process lifecycle is correctly separated from browser UI

**Access status requirements:**

| Service | Status | Action Required |
|---|---|---|
| Local Git repository | **READY** | No action needed |
| Codex CLI binary | **READY** | `codex --version` confirmed (0.143.0) |
| PostgreSQL | **READY** | Existing `DATABASE_URL` |
| Redis/Upstash | **READY** | Existing configuration |
| Codex CLI login | **NOT_NEEDED** | Local models first; add when OpenAI models needed |
| GitHub remote | **NOT_NEEDED** | No Git push from Codex in G0–G5 |
| GitHub Actions | **NOT_NEEDED** | No CI/CD for companion yet |
| Vercel/deploy | **NOT_NEEDED** | Companion runs locally |
| Browser automation | **NOT_NEEDED** | No browser from companion |
| Production domain | **NOT_NEEDED** | Localhost only |
| Monitoring | **BLOCKED** | Deferred to G8+ |

**Next step:** Execute G0 (Repository Hygiene) — add `%TEMP%/` to `.gitignore`, verify `npm install && npm run typecheck && npm run lint`.