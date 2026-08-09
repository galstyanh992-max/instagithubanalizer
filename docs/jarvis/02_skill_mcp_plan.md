# JARVIS AGENT NETWORK — PHASE 2: SKILL & MCP PLAN

> Generated: 2026-07-21
> Scope: decide how skills and MCP servers are discovered, adapted, and exposed to the Agent Network.

---

## 1. Skill Strategy

### 1.1 Existing Skills

`FACT`: Three skills are currently registered in `src/lib/skills/skills/`:

| Skill | Purpose | Lifecycle Hooks | Reuse |
|-------|---------|-----------------|-------|
| `planning-skill` | Injects planning instructions and tools | `beforeRun`, `afterRun`, `onError` | Register for Architect/Product agents |
| `summarization-skill` | Summarizes agent outputs | `beforeRun`, `afterRun`, `onError` | Register for Analyst/Research agents |
| `validation-skill` | Validates outputs against contract | `beforeRun`, `afterRun`, `onError` | Register for QA/Release Gate agents |

### 1.2 Skill-to-Agent Mapping

Skills are **capabilities**, not direct execution units. Each `AgentDefinition` will reference zero or more skill IDs. The runtime merges skill hooks and injected tool definitions before calling the model.

```typescript
interface AgentDefinition {
  id: string;
  role: string;
  skills: string[];           // skill IDs from skillRegistry
  allowedTools: string[];     // tool keys / patterns
  // ...
}
```

### 1.3 Required New Skills

| Skill ID | Purpose | Hooks | Why New |
|----------|---------|-------|---------|
| `jarvis-orchestration` | Adds orchestration context (goal, constraints, ledger) to every agent call | `beforeRun` | No existing skill carries run context |
| `evidence-recorder` | Ensures agent output is saved as artifact | `afterRun` | Need artifact persistence hook |
| `repair-skill` | Re-runs agent with focused context when a finding is open | `beforeRun`, `onError` | Repair loop needs special context |
| `browser-agent-skill` | Injects browser tool definitions into Browser Agent | `beforeRun` | Browser Agent needs page inventory tools |

### 1.4 Skill Registration Plan

1. Keep existing skills registered by `AgentRuntime` or startup init.
2. Add new JARVIS skills in `src/lib/jarvis/skills/`.
3. Do **not** modify existing skill implementations unless required for compatibility.
4. Expose skill list via `/api/jarvis/network/skills`.

---

## 2. MCP Strategy

### 2.1 Current State

`FACT`: `src/lib/mcp/McpClientManager.ts` can connect to stdio MCP servers.
`FACT`: `src/lib/mcp/init.ts` conditionally initializes Brave Search and GitHub MCP servers.
`FACT`: `McpToolWrapper.ts` adapts MCP tools to internal `ITool` interface and registers them in `src/lib/tools/registry.ts`.

### 2.2 Runtime Status

| MCP Server | Status | Reason |
|------------|--------|--------|
| Brave Search | `AUTH_REQUIRED` | Needs `BRAVE_API_KEY` |
| GitHub | `AUTH_REQUIRED` | Needs `GITHUB_PERSONAL_ACCESS_TOKEN` |
| Custom local agents | `NOT_AVAILABLE` | No configured custom servers |

### 2.3 Adaptation Plan

Create a capability-discovery wrapper that:

1. Lists registered MCP servers from `McpClientManager`.
2. Lists tools exposed by each connected server.
3. Checks allowlist (`JARVIS_MCP_ALLOWLIST` env or DB setting).
4. Exposes each tool through `ToolRegistryService` with a prefixed key `mcp.{server}.{tool}`.
5. Marks tools as `AUTH_REQUIRED` if the server is disconnected.
6. Never auto-connects an unregistered server.
7. Never sends secrets into the model context.

```typescript
interface McpAdapterCapability {
  serverName: string;
  status: 'connected' | 'disconnected' | 'auth_required' | 'not_allowed';
  tools: Array<{
    name: string;
    key: string;
    description: string;
    permission: ToolPermission;
    available: boolean;
  }>;
}
```

### 2.4 Security Rules

- Only servers listed in allowlist can be connected.
- Write/delete/push tools require approval.
- If a tool is not in allowlist, it is marked `BLOCKED`.
- MCP adapter input/output is validated by `McpToolWrapper`.
- Secrets are injected via env at process start, never from model context.

---

## 3. Tool Capability Discovery

The `ToolCapabilityDiscoveryService` will aggregate tools from multiple sources:

```
Sources:
1. ToolRegistryService        → default tools (filesystem, terminal, git, browser, db, etc.)
2. skillRegistry.listAll()  → skills that inject tools
3. McpClientManager          → MCP tools (if connected)
4. BrowserOperatorProviderRegistry → browser provider adapters
5. Project scripts            → scripts/*.mjs (read-only inventory)
```

Each discovered capability receives:

```typescript
interface ToolCapability {
  key: string;
  source: 'default' | 'skill' | 'mcp' | 'browser' | 'script';
  category: ToolCategory;
  status: 'available' | 'auth_required' | 'not_available' | 'blocked';
  permission: ToolPermission;
  requiresApproval: boolean;
  riskLevel: ToolRiskLevel;
  description: string;
}
```

---

## 4. No New Skill or MCP Server Unless Needed

Decision: We will **not** create new MCP servers or external skills. We will:

- Reuse existing skills.
- Create local JARVIS-only skills (no external dependencies).
- Use the existing MCP client adapter; live MCP calls are gated by availability checks.

---

## 5. Checkpoint

```
JARVIS IMPLEMENTATION CHECKPOINT

Phase: PHASE 2 — SKILL & MCP PLAN
Status: COMPLETED
Completed Tasks:
  - Mapped existing skills to agent roles
  - Defined new JARVIS skills
  - Documented MCP adaptation strategy
  - Defined tool capability discovery sources
  - Set security rules for MCP
Changed Files: none
Created Files:
  - docs/jarvis/02_skill_mcp_plan.md
Verification Executed: file inspection of skills/, mcp/, tool-hub/
Evidence: see mapping tables
Confirmed Findings: none
Open Blockers: none
Git Safety Notes: no source files modified
Next Task: PHASE 3 — TARGET ARCHITECTURE
```
