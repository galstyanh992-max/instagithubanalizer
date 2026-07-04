import type { TelegramMessageInput, TelegramCommandResult } from "./types";
import { parseTelegramCommand, extractApprovalId } from "./command-parser";
import { validateTelegramUser } from "./config";
import { normalizeActor, type SafetyActor } from "@/lib/safety/actor";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

function buildActor(input: TelegramMessageInput): SafetyActor {
  const isAllowed = input.user.isAllowed && validateTelegramUser(input.user.telegramUserId);
  return normalizeActor({
    id: isAllowed ? input.user.telegramUserId : "unknown",
    role: isAllowed ? "owner" : "viewer",
    source: "telegram",
  });
}

const HELP_TEXT = "Команды: /status /help /approve <id> /reject <id> /reports /github_report, либо обычный текст для маршрутизации.";

/** Never sends externally. Never executes risky actions directly. */
export async function handleTelegramMessage(input: TelegramMessageInput): Promise<TelegramCommandResult> {
  const command = parseTelegramCommand(input.text);
  const actor = buildActor(input);
  const allowedUser = actor.id !== "unknown";

  void recordBrainEntry({
    type: "user_command", title: `telegram: ${command}`, content: input.text,
    actorId: actor.id, actorRole: actor.role, actorSource: "telegram",
    metadata: { chatId: input.chatId, allowedUser },
  });

  if (!allowedUser) {
    return { command, allowed: false, requiresApproval: false, message: "Доступ запрещён: пользователь не в allowed list.", nextAction: "deny" };
  }

  switch (command) {
    case "status":
      return { command, allowed: true, requiresApproval: false, message: "ДЖАРВИС активен. Telegram foundation работает в safe-режиме.", nextAction: "respond" };
    case "help":
      return { command, allowed: true, requiresApproval: false, message: HELP_TEXT, nextAction: "respond" };
    case "approve": {
      const id = extractApprovalId(input.text);
      if (!id) return { command, allowed: false, requiresApproval: false, message: "Укажите ID: /approve <id>", nextAction: "clarify" };
      return { command, allowed: true, requiresApproval: false, approvalId: id, message: `Подтверждение записано (plan-only) для ${id}. Действие не выполняется автоматически.`, nextAction: "approve_action" };
    }
    case "reject": {
      const id = extractApprovalId(input.text);
      if (!id) return { command, allowed: false, requiresApproval: false, message: "Укажите ID: /reject <id>", nextAction: "clarify" };
      return { command, allowed: true, requiresApproval: false, approvalId: id, message: `Отклонение записано (plan-only) для ${id}.`, nextAction: "reject_action" };
    }
    case "reports": {
      const { buildDailyReport } = await import("@/lib/daily-reports/report-builder");
      const { formatDailyReportForTelegram } = await import("@/lib/daily-reports/formatters");
      let text = "Ежедневный отчёт недоступен (Brain/DB не подключены).";
      try {
        const report = await buildDailyReport({ actorId: actor.id, includeGithub: false });
        text = formatDailyReportForTelegram(report);
      } catch { /* keep placeholder */ }
      return { command, allowed: true, requiresApproval: false, message: text, nextAction: "respond" };
    }
    case "github_report": {
      const arg = input.text.replace(/^\/github_report\s*/i, "").trim();
      const { buildDailyReport } = await import("@/lib/daily-reports/report-builder");
      const { formatDailyReportForTelegram } = await import("@/lib/daily-reports/formatters");
      let text: string;
      try {
        const report = await buildDailyReport({ actorId: actor.id, includeGithub: Boolean(arg), githubSourceText: arg || undefined });
        text = formatDailyReportForTelegram(report);
      } catch {
        text = "Отчёт по GitHub недоступен (Brain/DB не подключены).";
      }
      return { command, allowed: true, requiresApproval: false, message: text, nextAction: "respond" };
    }
    case "route_command": {
      const { routeCommand } = await import("@/lib/command-router/router");
      const routed = await routeCommand({ text: input.text, actor, source: "telegram" });
      return {
        command, allowed: routed.allowed, requiresApproval: routed.requiresApproval,
        routedIntent: routed.intent, message: routed.message, nextAction: "route_to_command_router",
        data: { routed },
      };
    }
    default:
      return { command: "unknown", allowed: false, requiresApproval: false, message: "Неизвестная команда. /help для списка.", nextAction: "clarify" };
  }
}
