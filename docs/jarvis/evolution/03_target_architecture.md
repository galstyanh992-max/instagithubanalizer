# Target Architecture

The target extends, rather than duplicates, `src/lib/jarvis` and existing service/route layers.

```mermaid
flowchart LR
  I[User idea] --> N[Normalize]
  N --> B[Blueprint]
  B --> C[Capability discovery]
  C --> G[Agent/task graph]
  G --> P[Infrastructure plan]
  P --> A{Approved?}
  A -->|local only| L[Safe local bootstrap]
  A -->|optional providers| O[Approved provider adapters]
  L --> V[Verification]
  O --> V
  V --> Q[Browser QA] --> R[Repair Loop] --> RG[Release Gate]
```

Integration points: `orchestrator.ts`, `agent-registry.ts`, ToolHub and skills/MCP discovery, Browser Operator/CamoFox, verification/repair/release modules, Prisma, App Router routes, current UI, media components, and AI-provider registry.

Each InfrastructureOperation is persisted with an event log and ordered steps: CREATED → VALIDATING → PLANNING → WAITING_APPROVAL → CREATING_LOCAL → optional provider states → VERIFYING → COMPLETED/PARTIAL/BLOCKED/FAILED/CANCELLED. No external transition is legal until approval.
