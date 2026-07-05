# Local Agent Runtime Spec
Spec-only. No real local agent, no OS execution, no socket, no MCP/Desktop Commander connection.
Scope: `src/lib/local-agent-runtime/` (types, handshake, queue-spec, envelope-builder). Router: `local_agent_runtime`. Routes: `GET /api/local-agent/status`, `GET /api/local-agent/spec`, `POST /api/local-agent/plan`.
Status: not_configured (no workspace) / not_running (workspace set, no agent) — never connected_mock in practice.
Handshake: install → workspace allowlist → one-time pairing code → approval channel → heartbeat (future) → revocation.
Queue spec: draft→queued→approval_required→approved/rejected→executed_mock(future)/blocked; audit + idempotency + local-only boundary.
Envelope builder delegates to Local Operator / MCP Bridge planners for actual risk decisions; Telegram source stricter (write/terminal/bridge capabilities denied outright).
Relation: Local Operator = workspace/file/command planning; MCP Bridge = external tool bridge contract; Local Agent Runtime = the connecting spec/handshake/queue layer between them and Command Router/Project Brain.
NOT IMPLEMENTED: real local agent, real command execution, real file mutation, real socket, real MCP/Desktop Commander, 24/7 background worker, remote deploy.
