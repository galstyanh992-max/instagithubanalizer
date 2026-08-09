# JARVIS AGENT NETWORK — PHASE 3: GAP ANALYSIS

> Generated: 2026-07-21
> Status: design document

---

## 1. Gap Matrix

| Target Component | Existing Equivalent | Gap | Priority |
|------------------|---------------------|-----|----------|
| `OrchestrationRun` state machine | Single message orchestration | No persistent run grouping goal + tasks + checkpoints | P0 |
| `AgentRequest` / `AgentResult` contracts | `TaskContract`, `AgentChatRequest` | No unified handoff contract with artifacts/evidence | P0 |
| Task dependency graph | Flat `Project/Epic/Task` | No `dependsOn` / topological execution | P0 |
| `Artifact` model | No dedicated artifact table | Need artifact persistence | P0 |
| `Finding` model | `ApprovalRequest` | Need issue/bug tracking for Repair Loop | P0 |
| `VerificationResult` | `QualityGateService` | No full pipeline (tests, build, browser) | P0 |
| `DecisionLog` | `EventLog` | Need structured decision rationale | P1 |
| `Checkpoint` | None | Need resume points | P0 |
| `BrowserAgent` contract | `BrowserOperatorService` | No page-inventory / scenario / evidence contract | P0 |
| `RepairLoop` | Approval engine only | No automated repair orchestration | P0 |
| `ReleaseGate` | None | No final verdict | P0 |
| Capability discovery | `ToolRegistryService` lists tools | No unified availability check across MCP/skills/scripts | P1 |
| API routes | `/api/jarvis/orchestrate`, `/plan` | No `/jarvis/network/*` endpoints | P0 |
| UI Control Center | OS shell iframe | No dedicated run/task/finding/release UI | P1 |
| Security hardening | `runSafeAction`, permission service | No per-run limits or tool allowlist enforcement | P1 |
| Tests | Existing unit tests | No orchestration run tests | P0 |

---

## 2. What Can Be Reused vs Created

| Layer | Reuse | Create New |
|-------|-------|------------|
| Goal parsing | `PlanningEngine.classifyTask`, `AgentFactory.purpose-classifier` | `GoalAnalyzer.normalizeGoal` |
| Agent definitions | `src/lib/agent-registry/defaults.ts` | `AgentDefinition` contract + mapping |
| Agent execution | `AgentRuntime.execute`, `agentExecutor` | `AgentNetworkEngine` wrapper with contract |
| Tool registry | `ToolRegistryService`, `ToolAdapterRegistry` | `CapabilityDiscoveryService`, availability checks |
| MCP tools | `McpClientManager`, `McpToolWrapper` | `McpAvailabilityAdapter` |
| Browser | `BrowserOperatorService` | `BrowserAgentAdapter` |
| Safety | `runSafeAction`, `detectPromptInjection` | Orchestrator-level safety gates |
| Approval | `approvalEngine`, `ApprovalRequest` model | Repair-loop approval integration |
| Persistence | Prisma `Project/Epic/Task` | `OrchestrationRun`, `AgentExecution`, `Artifact`, `Finding`, `VerificationResult`, `DecisionLog`, `Checkpoint` |
| Events | `eventBus`, `EventLog` | Network orchestration events |
| Verification | `QualityGateService` | `VerificationEngine` + browser/test/build integration |

---

## 3. Prisma Schema Additions Required

```prisma
model OrchestrationRun {
  id            String   @id @default(cuid())
  workspaceId   String?
  projectId     String?
  userId        String?
  goal          String
  constraints   String   @default("[]") // JSON
  status        String   @default("CREATED")
  mode          String   @default("balanced")
  maxAgents     Int      @default(10)
  maxTasks      Int      @default(50)
  maxRetries    Int      @default(3)
  timeoutMs     Int      @default(300000)
  context       String   @default("{}") // JSON: RunContext
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tasks             AgentTask[]
  agentExecutions   AgentExecution[]
  artifacts         Artifact[]
  findings          Finding[]
  verificationResults VerificationResult[]
  decisionLogs      DecisionLog[]
  checkpoints       Checkpoint[]
}

model AgentTask {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  agentId       String?
  role          String
  toolKeys      String    @default("[]") // JSON
  dependsOn     String    @default("[]") // JSON task IDs
  status        String    @default("not_started")
  priority      String    @default("medium")
  riskLevel     String    @default("low")
  retryCount    Int       @default(0)
  request       String?   // JSON AgentRequest
  result        String?   // JSON AgentResult
  artifactIds   String    @default("[]") // JSON
  findingIds    String    @default("[]") // JSON
  checkpointId  String?
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AgentExecution {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  taskId        String?
  agentId       String
  role          String
  request       String    // JSON AgentRequest
  result        String?   // JSON AgentResult
  status        String    @default("in_progress")
  durationMs    Int?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Artifact {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  taskId        String?
  agentId       String?
  type          String
  title         String
  content       String    @db.Text
  metadata      String    @default("{}") // JSON
  fileRefs      String    @default("[]") // JSON
  createdAt     DateTime  @default(now())
}

model Finding {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  taskId        String?
  severity      String
  status        String    @default("open")
  evidence      String    @db.Text
  rootCause     String?
  fixSummary    String?
  fixArtifactId String?
  verificationId String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model VerificationResult {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  type          String
  status        String
  evidence      String    @db.Text
  findings      String    @default("[]") // JSON
  durationMs    Int?
  createdAt     DateTime  @default(now())
}

model DecisionLog {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  phase         String
  decision      String
  rationale     String
  alternatives  String    @default("[]") // JSON
  createdAt     DateTime  @default(now())
}

model Checkpoint {
  id            String    @id @default(cuid())
  runId         String
  run           OrchestrationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  phase         String
  taskStatuses  String    // JSON
  context       String    // JSON RunContext snapshot
  createdAt     DateTime  @default(now())
}
```

---

## 4. API Routes Gap

Current: `/api/jarvis/orchestrate`, `/api/jarvis/plan`, `/api/jarvis/delegate`, etc.
Needed:
- `POST /api/jarvis/network/runs`
- `GET /api/jarvis/network/runs/[id]`
- `GET /api/jarvis/network/runs`
- `POST /api/jarvis/network/runs/[id]/cancel`
- `POST /api/jarvis/network/runs/[id]/resume`
- `GET /api/jarvis/network/runs/[id]/tasks`
- `GET /api/jarvis/network/runs/[id]/artifacts`
- `GET /api/jarvis/network/runs/[id]/findings`
- `POST /api/jarvis/network/runs/[id]/verify`
- `POST /api/jarvis/network/runs/[id]/release`
- `GET /api/jarvis/network/agents`
- `GET /api/jarvis/network/tools`

---

## 5. UI Gap

No existing page covers:
- Run creation with constraints;
- Run overview with state machine;
- Task graph visualization;
- Agent/tool inventory;
- Artifact/finding browser;
- Release gate report.

Plan: add a new Next.js page `/jarvis` or `/agents/network` with minimal UI using existing shadcn/ui + sci-fi styling. Avoid touching the active OS shell refactor.

---

## 6. Checkpoint

```
JARVIS IMPLEMENTATION CHECKPOINT

Phase: PHASE 3 — GAP ANALYSIS
Status: COMPLETED
Completed Tasks:
  - Listed 16 gaps with priorities
  - Mapped reuse vs new-creation per layer
  - Drafted Prisma schema additions
  - Listed required API routes
  - Identified UI gap
Changed Files: none
Created Files:
  - docs/jarvis/03_gap_analysis.md
Verification Executed: comparison against existing code
Evidence: gap matrix and schema draft
Confirmed Findings: none
Open Blockers: none
Git Safety Notes: no source files modified
Next Task: PHASE 3 — IMPLEMENTATION PLAN
```
