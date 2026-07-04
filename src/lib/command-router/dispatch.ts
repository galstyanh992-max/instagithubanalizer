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
