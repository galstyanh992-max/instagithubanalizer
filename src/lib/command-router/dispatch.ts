import type { CommandIntent, CommandNextAction } from "./types";

interface DispatchResult {
  message: string;
  nextAction: CommandNextAction;
  data?: Record<string, unknown>;
}

const PAGE_MAP: { re: RegExp; path: string }[] = [
  { re: /dashboard|главн/i, path: "/dashboard" },
  { re: /settings|настройк/i, path: "/settings" },
  { re: /repos|репозитор/i, path: "/repos" },
  { re: /memory|память/i, path: "/memory" },
  { re: /voice|голос/i, path: "/voice" },
  { re: /board|доск/i, path: "/board" },
  { re: /agents|агент/i, path: "/agents" },
];

const UI_ACTION_PATTERNS: { re: RegExp; action: string; params: Record<string, string | boolean> }[] = [
  { re: /открой чат|покажи чат|разверни чат/i, action: "toggle_chat", params: { open: true } },
  { re: /закрой чат|сверни чат|убери чат/i, action: "toggle_chat", params: { open: false } },
  { re: /открой терминал|покажи терминал|разверни терминал/i, action: "toggle_terminal", params: { open: true } },
  { re: /закрой терминал|сверни терминал|убери терминал/i, action: "toggle_terminal", params: { open: false } },
  { re: /открой файлы|покажи файлы|файловый менеджер/i, action: "toggle_files", params: { open: true } },
  { re: /закрой файлы|убери файлы/i, action: "toggle_files", params: { open: false } },
  { re: /вкладка\s+проекты|открой\s+проекты\s+в\s+панели/i, action: "set_hub_tab", params: { tab: "projects" } },
  { re: /вкладка\s+задачи/i, action: "set_hub_tab", params: { tab: "tasks" } },
  { re: /вкладка\s+агенты/i, action: "set_hub_tab", params: { tab: "agents" } },
  { re: /вкладка\s+память/i, action: "set_hub_tab", params: { tab: "memory" } },
  { re: /вкладка\s+чаты/i, action: "set_hub_tab", params: { tab: "chats" } },
  { re: /вкладка\s+файлы/i, action: "set_hub_tab", params: { tab: "archive" } },
  { re: /вкладка\s+уведомления/i, action: "set_hub_tab", params: { tab: "notifications" } },
  { re: /новый чат|создай чат/i, action: "new_chat", params: {} },
  { re: /очисти чат|очисти сообщения/i, action: "clear_chat", params: {} },
  { re: /обнови страницу|reload/i, action: "reload", params: {} },
];

/** Only safe/read intents reach here. No side effects. */
export function dispatchSafe(intent: CommandIntent, text: string): DispatchResult {
  switch (intent) {
    case "conversation":
      return { message: "Готов помочь. О чём поговорим?", nextAction: "respond" };
    case "open_page": {
      const match = PAGE_MAP.find((p) => p.re.test(text));
      const path = match?.path ?? "/dashboard";
      return { message: `Открываю ${path}.`, nextAction: "execute_safe_action", data: { path } };
    }
    case "ui_control": {
      const match = UI_ACTION_PATTERNS.find((p) => p.re.test(text));
      if (!match) return { message: "Не понял UI-команду. Уточните.", nextAction: "clarify" };
      return { message: "Выполняю.", nextAction: "execute_safe_action", data: { uiAction: match.action, params: match.params } };
    }
    case "memory_task":
      return { message: "Заметка принята (stub — сохранение памяти ещё не подключено к роутеру).", nextAction: "respond", data: { stub: true } };
    case "github_analysis":
      return { message: "Открываю анализ репозиториев.", nextAction: "execute_safe_action", data: { path: "/repos" } };
    case "api_task":
      return { message: "Список API.", nextAction: "respond" };
    default:
      return { message: "Не понял команду. Уточните.", nextAction: "clarify" };
  }
}
