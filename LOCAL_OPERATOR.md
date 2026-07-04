# Local Operator / Computer Control Foundation
Plan-only. Never executes OS commands, never mutates files, never launches Desktop Commander/MCP.
Scope: `src/lib/local-operator/` (types, workspace-policy, capability-classifier, tool-bridge, planner). Router: `local_operator`. Routes: `POST /api/local-operator/plan`, `GET /api/local-operator/status`.
Workspace: requires `AGENT_WORKSPACE_ROOT`; unset → `local_agent_required`. Path traversal, .env/secrets/credentials, OS system dirs → denied.
Write-class capabilities (prepare/apply_file_change, open_application) → approval required; Telegram source → denied outright (no direct file mutation remotely).
MCP/Desktop Commander → always `local_agent_required`, contract-only (`getLocalToolBridgePlan`), no real connection.
NOT IMPLEMENTED: real Desktop Commander launch, real MCP connection, real command execution, real file mutation, full OS control, background agent, 24/7 bridge.
