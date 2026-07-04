import type { TelegramCommand } from "./types";

export function parseTelegramCommand(text: string): TelegramCommand {
  const t = (text || "").trim();
  if (!t) return "unknown";
  if (/^\/status\b/i.test(t)) return "status";
  if (/^\/help\b/i.test(t)) return "help";
  if (/^\/approve\b/i.test(t)) return "approve";
  if (/^\/reject\b/i.test(t)) return "reject";
  if (/^\/reports\b/i.test(t)) return "reports";
  if (/^\/github_report\b/i.test(t)) return "github_report";
  if (t.startsWith("/")) return "unknown";
  return "route_command";
}

export function extractApprovalId(text: string): string | undefined {
  const m = /^\/(approve|reject)\s+(\S+)/i.exec(text.trim());
  return m?.[2];
}
