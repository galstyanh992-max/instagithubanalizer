import type { McpBridgeKind, McpBridgeStatus } from "./types";
import { getBridgeProfile } from "./profiles";

export interface McpBridgeHandshake {
  kind: McpBridgeKind;
  status: McpBridgeStatus;
  requiredEnv: string[];
  installSteps: string[];
  securityChecklist: string[];
  connected: false;
}

/** Never checks a real port, never launches a process. */
export function getMcpBridgeStatus(kind: McpBridgeKind): McpBridgeHandshake {
  const profile = getBridgeProfile(kind);
  const requiredEnv = kind === "mcp" ? ["MCP_SERVER_URL", "MCP_SERVER_TOKEN"]
    : kind === "desktop_commander" ? ["DESKTOP_COMMANDER_ENDPOINT"]
    : ["LOCAL_AGENT_ENDPOINT"];
  return {
    kind,
    status: profile?.status ?? "not_configured",
    requiredEnv,
    installSteps: profile?.notes ?? ["Требуется установка локального компонента (future feature)."],
    securityChecklist: [
      "Approval required for any write/terminal/app-control action.",
      "Workspace path policy применяется (см. Local Operator).",
      "Секреты/.env никогда не читаются через bridge.",
      "Не выполнять destructive команды.",
    ],
    connected: false,
  };
}
