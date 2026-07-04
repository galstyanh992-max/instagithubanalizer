import type { McpBridgeKind, McpToolCapability } from "./types";

export function classifyBridgeKind(text: string): McpBridgeKind {
  if (/desktop commander/i.test(text)) return "desktop_commander";
  if (/mcp\s*(tool|server)/i.test(text)) return "mcp";
  return "custom_local_agent";
}

const RULES: { cap: McpToolCapability; re: RegExp }[] = [
  { cap: "screenshot", re: /скриншот|screenshot/i },
  { cap: "clipboard", re: /буфер обмена|clipboard/i },
  { cap: "window_management", re: /окн[оа]|window management/i },
  { cap: "app_control", re: /открой приложение|app control/i },
  { cap: "browser_control", re: /управляй браузером|browser control/i },
  { cap: "filesystem_write", re: /запиши файл|удали файл|write file|delete file/i },
  { cap: "filesystem_read", re: /прочитай (файл|\.env)|read file/i },
  { cap: "terminal_command", re: /выполни команду|запусти команду|terminal command/i },
  { cap: "mcp_tool_call", re: /mcp\s*tool/i },
];

export function classifyCapability(text: string): McpToolCapability {
  const t = (text || "").trim();
  if (!t) return "unknown";
  for (const r of RULES) if (r.re.test(t)) return r.cap;
  return "unknown";
}
