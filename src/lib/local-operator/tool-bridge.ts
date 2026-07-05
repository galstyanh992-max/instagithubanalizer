import type { LocalToolBridge } from "./types";

export function getLocalToolBridgePlan(kind: LocalToolBridge["kind"]): LocalToolBridge {
  const base = { status: "not_configured" as const, requiresUserInstall: true };
  switch (kind) {
    case "mcp":
      return {
        kind, name: "MCP Server Bridge", ...base,
        capabilities: ["mcp_tool_call"],
        connectionInstructions: [
          "Пользователь должен установить и запустить локальный MCP-сервер отдельно.",
          "ДЖАРВИС не запускает MCP-сервер самостоятельно.",
          "После установки — подключение через конфиг (future feature, NOT IMPLEMENTED).",
          "Все вызовы MCP tools потребуют approval.",
        ],
      };
    case "desktop_commander":
      return {
        kind, name: "Desktop Commander", ...base,
        capabilities: ["desktop_commander_action", "open_application"],
        connectionInstructions: [
          "Требуется отдельно установленный Desktop Commander на компьютере пользователя.",
          "ДЖАРВИС не запускает Desktop Commander автоматически.",
          "Любое действие потребует явного approval владельца.",
        ],
      };
    case "custom_local_agent":
      return {
        kind, name: "Custom Local Agent", ...base,
        capabilities: ["read_project_files", "list_workspace", "run_safe_command"],
        connectionInstructions: ["Требуется локальный агент-компаньон (future feature, NOT IMPLEMENTED)."],
      };
  }
}
