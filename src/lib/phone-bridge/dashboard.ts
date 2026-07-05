/**
 * Phone Bridge dashboard builder.
 *
 * Aggregates SAFE, read-only statuses from foundation modules into a UI DTO.
 * Rules:
 *  - no external calls, no network, no secrets, no live DB required;
 *  - warns when the local agent is not configured/running and when DB is missing;
 *  - records a non-fatal "view" event to Project Brain if the write pattern exists;
 *  - never throws (returns a blocked dashboard on unexpected error).
 */

import type { PhoneBridgeDashboard, PhoneBridgeStatus } from "./types";
import { getTelegramConfig } from "@/lib/telegram/config";
import { getLocalAgentStatus } from "@/lib/local-agent-runtime/handshake";
import { getMcpBridgeStatus } from "@/lib/mcp-bridge/handshake";
import { getDbConfigStatus } from "@/lib/db-config/config";
import { getAllowedWorkspace } from "@/lib/local-operator/workspace-policy";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

/** Fire-and-forget, always non-fatal Project Brain view event. */
function recordViewEvent(kind: string, metadata: Record<string, unknown>): void {
  try {
    // recordBrainEntry catches its own errors and returns null on failure.
    void recordBrainEntry({
      type: "action_result",
      title: `phone-bridge.view.${kind}`,
      content: `Phone bridge view: ${kind}`,
      actorSource: "api",
      importance: "low",
      metadata: { ...metadata, feature: "phone-bridge", executed: false },
    });
  } catch {
    /* never fatal */
  }
}

export function buildPhoneBridgeDashboard(): PhoneBridgeDashboard {
  const generatedAt = new Date().toISOString();
  try {
    const telegram = getTelegramConfig();
    const localAgentStatus = getLocalAgentStatus(); // "not_running" | "not_configured" | ...
    const mcp = getMcpBridgeStatus("mcp");
    const db = getDbConfigStatus();
    const workspace = getAllowedWorkspace();

    const telegramConfigured = telegram.tokenConfigured;
    const dbConfigured = db.liveCheckPossible;
    const localAgentRunning = localAgentStatus === "connected_mock";

    const modules = {
      commandRouter: "available",
      telegram: telegramConfigured ? "configured" : "not_configured",
      dailyReports: "available",
      localAgent: localAgentStatus,
      localOperator: workspace ? "plan_only (workspace configured)" : "plan_only (no workspace)",
      mcpBridge: mcp.status, // "not_configured" in foundation
      db: dbConfigured ? "configured" : "not_configured",
      approvals: dbConfigured ? "live_db_available" : "no_live_db_fallback",
    };

    const warnings: string[] = [];
    if (!localAgentRunning) {
      warnings.push(
        `Локальный агент не запущен (status=${localAgentStatus}). Remote-команды вернут только план / LOCAL_AGENT_NOT_RUNNING.`,
      );
    }
    if (!dbConfigured) {
      warnings.push("Live DB не настроена (DATABASE_URL). Approval inbox работает в безопасном пустом режиме.");
    }
    if (!telegramConfigured) {
      warnings.push("Telegram не настроен (TELEGRAM_BOT_TOKEN). Отправка сообщений недоступна (и не выполняется в этой фазе).");
    }
    if (mcp.status !== "connected_mock") {
      warnings.push("MCP / Desktop Commander bridge не подключён. Локальные/MCP-действия — только план.");
    }

    const nextActions: string[] = [
      "Открыть /phone для просмотра статуса модулей и превью команд.",
      "Использовать command preview для безопасного плана без выполнения.",
    ];
    if (!localAgentRunning) nextActions.push("Настроить и выполнить handshake локального агента (future feature).");
    if (!dbConfigured) nextActions.push("Настроить DATABASE_URL для live approval inbox.");

    // Overall status: foundation is intentionally partial until remote surfaces are configured.
    let status: PhoneBridgeStatus;
    if (localAgentRunning && dbConfigured && telegramConfigured) {
      status = "ready";
    } else if (!telegramConfigured && !dbConfigured && !localAgentRunning) {
      status = "not_configured";
    } else {
      status = "partial";
    }

    recordViewEvent("dashboard", { status, warningCount: warnings.length });

    return { status, generatedAt, modules, warnings, nextActions };
  } catch (e) {
    return {
      status: "blocked",
      generatedAt,
      modules: {
        commandRouter: "unknown",
        telegram: "unknown",
        dailyReports: "unknown",
        localAgent: "unknown",
        localOperator: "unknown",
        mcpBridge: "unknown",
        db: "unknown",
        approvals: "unknown",
      },
      warnings: [`Не удалось построить dashboard (non-fatal): ${e instanceof Error ? e.message : String(e)}`],
      nextActions: ["Проверить конфигурацию окружения и повторить."],
    };
  }
}
