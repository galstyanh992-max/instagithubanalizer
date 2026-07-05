import type { LocalOperatorCapability } from "./types";

const RULES: { cap: LocalOperatorCapability; re: RegExp }[] = [
  { cap: "desktop_commander_action", re: /desktop commander/i },
  { cap: "mcp_tool_call", re: /mcp\s*(tool|server)/i },
  { cap: "apply_file_change", re: /примени изменени|apply (the )?change/i },
  { cap: "prepare_file_change", re: /измени файл|prepare (a )?file change|отредактируй файл/i },
  { cap: "open_application", re: /открой приложение|open (the )?application/i },
  { cap: "open_preview", re: /открой preview|preview|dev server/i },
  { cap: "run_safe_command", re: /запусти (тесты|lint|typecheck|build)|npm (test|run)/i },
  { cap: "list_workspace", re: /покажи файлы проекта|list workspace|список файлов/i },
  { cap: "read_project_files", re: /прочитай файл|read (project )?file/i },
];

export function classifyLocalCapability(text: string): LocalOperatorCapability {
  const t = (text || "").trim();
  if (!t) return "unknown";
  for (const r of RULES) if (r.re.test(t)) return r.cap;
  return "unknown";
}
