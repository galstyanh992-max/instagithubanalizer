# Phone UI Bridge — Foundation

**Status: FOUNDATION ONLY.** This layer exposes a safe, read/preview surface for a
phone client (mobile web / Telegram). It does **not** execute commands, send
messages, call external APIs, read secrets, or require a live database.

## What the Phone UI Bridge is

A thin, UI-safe adapter between a phone-shaped client and the existing
safety-aware backend. It surfaces three things:

1. a **module-status dashboard** (`buildPhoneBridgeDashboard`),
2. a **safe command preview** (`previewPhoneCommand`),
3. a read-only **approval inbox DTO** (`buildPhoneApprovalInbox`).

Every remote action resolves to one of: `planned`, `approval_required`,
`blocked`, `not_implemented`, `local_agent_not_running`.

## Current foundation-only scope

| Area | Behavior |
|------|----------|
| Command preview | Delegates to the Command Router (plan/draft/spec-only). Never executes. |
| Destructive commands | Hard-blocked in the preview layer regardless of intent. |
| Source strictness | `mobile_web` / `telegram` require approval for any non-LOW-risk action; `desktop_web` follows the router default. |
| Local / MCP / Desktop Commander actions | Return a plan or `local_agent_not_running`. Nothing is launched. |
| Approval inbox | Read-only, UI-safe fields only. Safe empty fallback without live DB. |
| Dashboard | Aggregates safe statuses; warns when local agent / DB / Telegram are not configured. |

## Safe command preview

`previewPhoneCommand({ text, source, actorId?, workspaceId? })` →

```ts
{
  status: "planned" | "approval_required" | "blocked" | "not_implemented" | "local_agent_not_running",
  intent?, riskLevel?, requiresApproval, summary, steps[], blockedReasons[],
  nextAction: "show_plan" | "request_approval" | "configure_local_agent" | "open_approvals" | "deny" | "clarify"
}
```

Example scenarios:

| Text | Result |
|------|--------|
| «подключи Desktop Commander» | `local_agent_not_running` → configure_local_agent |
| «выполни команду на компьютере» | plan / approval (local operator, plan-only) |
| «удали папку» | `blocked` → deny (destructive) |
| «отправь письмо …» (mobile) | `approval_required` (never sends) |
| «напиши пост для Instagram» | `planned` content plan (never publishes) |
| «покажи dashboard daily report» | `planned` |

## Approvals inbox

`buildPhoneApprovalInbox(workspaceId?)` returns UI-safe items
(`id, title, intent, riskLevel, actorId, actorSource, createdAt, status, summary`).
Raw payloads, command text, and secrets are never exposed. Without a live DB it
returns a safe empty inbox plus a warning. **Approve/reject are not implemented
in this phase** (that is the Approval UI stage).

## Module status dashboard

`buildPhoneBridgeDashboard()` aggregates safe statuses for: Command Router,
Telegram Foundation, Daily Reports, Local Agent Runtime, Local Operator, MCP
Bridge, DB config, and Approvals. It records a non-fatal Project Brain view
event and never throws.

## Relationships

- **Local Agent Runtime** — the phone bridge only reads its status and shows a
  handshake plan. It never runs a real local agent.
- **Local Operator / MCP Bridge** — previews delegate to their plan-only
  planners. No filesystem/terminal/MCP/Desktop Commander action is executed.
- **Telegram Foundation** — only configuration status is read. No messages are sent.
- **Daily Reports** — reachable as a safe `planned` intent via preview.

## API routes

- `GET /api/phone-bridge/dashboard` — module status DTO.
- `POST /api/phone-bridge/command-preview` — `{ text, source?, actorId?, workspaceId? }` → plan preview.
- `GET /api/phone-bridge/approvals` — read-only inbox (optional `?workspaceId=`).

## UI

- `/phone` — server component, read-only. Shows module status, warnings, next
  actions, a command-preview description, and the approval inbox. No client-side
  execution logic.

## Tests & smoke

- `src/lib/phone-bridge/phone-bridge.test.ts`
- `npm run smoke:phone-bridge` (also included in `npm run smoke`)

## NOT IMPLEMENTED (out of scope for this phase)

- Real mobile app.
- Real local command execution.
- Real MCP / Desktop Commander actions.
- Telegram / email / content sending or publishing.
- Live approval execution (approve/reject).
- Deploy.
- Push automation.
