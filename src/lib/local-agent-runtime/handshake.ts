import type { LocalAgentProfile, LocalAgentRuntimeStatus } from "./types";
import { getAllowedWorkspace } from "@/lib/local-operator/workspace-policy";

/** Never checks a real port/socket, never launches a process. */
export function getLocalAgentProfile(): LocalAgentProfile {
  const workspace = getAllowedWorkspace();
  const status: LocalAgentRuntimeStatus = workspace ? "not_running" : "not_configured";
  return {
    id: "default-local-agent",
    name: "Default Local Agent (spec only)",
    status,
    workspaceRootConfigured: Boolean(workspace),
    capabilities: ["workspace_read", "workspace_write", "safe_command", "preview_open", "mcp_bridge", "desktop_commander", "browser_control", "app_control"],
    requiresInstall: true,
    requiresHandshake: true,
    notes: [
      "Локальный агент-компаньон не реализован и не запущен.",
      "Требуется отдельная установка + handshake (future feature).",
    ],
  };
}

export function getLocalAgentStatus(): LocalAgentRuntimeStatus {
  return getLocalAgentProfile().status;
}

export interface HandshakePlan {
  status: LocalAgentRuntimeStatus;
  steps: string[];
}

/** Describes future pairing steps only. No socket/network activity. */
export function buildHandshakePlan(): HandshakePlan {
  const status = getLocalAgentStatus();
  return {
    status,
    steps: [
      "1. Установить локальный агент-компаньон на компьютер пользователя (future feature).",
      "2. Настроить allowlist workspace (AGENT_WORKSPACE_ROOT) на стороне агента.",
      "3. Сгенерировать one-time pairing code в веб/Telegram UI и ввести его в локальном агенте.",
      "4. Установить approval channel (web/Telegram) для подтверждения risky действий.",
      "5. Агент отправляет периодический heartbeat (future) — сейчас не реализовано.",
      "6. Пользователь может в любой момент отозвать pairing (revocation).",
    ],
  };
}
