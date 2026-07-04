import type { McpBridgeProfile } from "./types";

export function getDefaultMcpBridgeProfiles(): McpBridgeProfile[] {
  return [
    {
      id: "desktop_commander", name: "Desktop Commander", kind: "desktop_commander",
      status: "local_agent_required", requiresInstall: true, requiresApproval: true, riskLevel: "HIGH",
      capabilities: ["filesystem_read", "filesystem_write", "terminal_command", "app_control", "screenshot", "window_management"],
      notes: ["Требует отдельно установленного Desktop Commander.", "ДЖАРВИС не запускает его сам."],
    },
    {
      id: "mcp", name: "Generic MCP Server", kind: "mcp",
      status: "local_agent_required", requiresInstall: true, requiresApproval: true, riskLevel: "HIGH",
      capabilities: ["mcp_tool_call", "filesystem_read", "terminal_command"],
      notes: ["Требует локально запущенного MCP-сервера.", "ДЖАРВИС не подключается автоматически."],
    },
    {
      id: "custom_local_agent", name: "Custom Local Agent", kind: "custom_local_agent",
      status: "connection_planned", requiresInstall: true, requiresApproval: true, riskLevel: "HIGH",
      capabilities: ["filesystem_read", "terminal_command", "browser_control", "app_control"],
      notes: ["Будущий локальный агент-компаньон.", "Соединение только запланировано (connection_planned), не установлено."],
    },
  ];
}

export function getBridgeProfile(kind: string): McpBridgeProfile | null {
  return getDefaultMcpBridgeProfiles().find((p) => p.kind === kind || p.id === kind) ?? null;
}
