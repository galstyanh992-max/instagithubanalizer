# MCP Bridge / Desktop Commander Planning
Plan-only. No real MCP server connection, no Desktop Commander launch, no port checks, no execution.
Scope: `src/lib/mcp-bridge/` (types, profiles, capability-classifier, risk-policy, handshake, planner). Routes: `GET /api/mcp-bridge/status`, `POST /api/mcp-bridge/plan`.
Bridges: desktop_commander (local_agent_required), mcp (local_agent_required), custom_local_agent (connection_planned) — none ever "connected" in this phase.
Capabilities/risk: filesystem_read MEDIUM, filesystem_write/terminal_command/app_control/mcp_tool_call HIGH, browser_control/clipboard/screenshot/window_management MEDIUM, unknown HIGH/deny.
Path/.env/secrets checks reuse Local Operator workspace-policy; terminal commands reuse terminal-guard. Telegram source denied outright for write/terminal/app_control/mcp_tool_call/window_management.
Local Operator integration: desktop_commander_action/mcp_tool_call capabilities route through this planner instead of a static stub.
NOT IMPLEMENTED: real MCP server connection, Desktop Commander launch, local port probing, command execution, file mutation, screenshots, window/app control.
