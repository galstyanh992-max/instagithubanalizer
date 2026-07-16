"use client";

import type { UiAction } from "./use-jarvis-ui-executor";

// Normalized intents from server-side command router are mapped to client UI actions.

interface ParsedCommand {
  action: UiAction;
  confirmation?: string;
}

const PAGE_PATHS: { re: RegExp; path: string }[] = [
  { re: /главн|домой|home|dashboard|статист/i, path: "/dashboard" },
  { re: /проект|projects/i, path: "/projects" },
  { re: /агент|agents/i, path: "/agents" },
  { re: /памят|memory/i, path: "/memory" },
  { re: /анализ|upload|загрузк/i, path: "/upload" },
  { re: /систем|system/i, path: "/settings" },
  { re: /настройк|settings/i, path: "/settings" },
  { re: /репозитор|github|repos/i, path: "/repos" },
  { re: /деплой|docker|deploy/i, path: "/deploy" },
  { re: /голос|voice/i, path: "/voice" },
  { re: /сравнен|compare/i, path: "/compare" },
  { re: /доска|board/i, path: "/board" },
  { re: /watchlist/i, path: "/watchlist" },
  { re: /workflow|workflows/i, path: "/workflows" },
];

const HUB_TABS: { re: RegExp; tab: string }[] = [
  { re: /проект/i, tab: "projects" },
  { re: /задач|tasks/i, tab: "tasks" },
  { re: /агент/i, tab: "agents" },
  { re: /памят/i, tab: "memory" },
  { re: /чат/i, tab: "chats" },
  { re: /файл|архив/i, tab: "archive" },
  { re: /уведомлен|alerts/i, tab: "notifications" },
  { re: /музык/i, tab: "music" },
];

const BROWSER_APPS: { re: RegExp; url: string; title: string }[] = [
  { re: /вс[кк]од|vscode|код/i, url: "https://vscode.dev", title: "VSCode Web" },
  { re: /whatsapp|ватсап|вотсап/i, url: "https://web.whatsapp.com", title: "WhatsApp" },
  { re: /telegram|телеграм/i, url: "https://web.telegram.org", title: "Telegram" },
  { re: /instagram|инстаграм/i, url: "https://www.instagram.com", title: "Instagram" },
  { re: /tiktok|тикток/i, url: "https://www.tiktok.com", title: "TikTok" },
  { re: /ютуб|youtube/i, url: "https://www.youtube.com", title: "YouTube" },
];

export function parseJarvisCommand(text: string): ParsedCommand | null {
  const t = (text || "").toLowerCase();

  // Navigation: "открой dashboard" / "перейди в проекты" / "покажи агентов"
  if (/открой|перейди|покажи|открой страницу|навигац|переключись на вкладку/i.test(t)) {
    // First check explicit hub tab requests (right sidebar)
    for (const { re, tab } of HUB_TABS) {
      if (re.test(t)) {
        return { action: { type: "set_hub_tab", tab }, confirmation: `Переключаюсь на вкладку ${tab}` };
      }
    }

    for (const { re, path } of PAGE_PATHS) {
      if (re.test(t)) {
        return { action: { type: "navigate", path }, confirmation: `Открываю ${path}` };
      }
    }
  }

  // Telegram / social sending
  if (/отправь (в )?телеграм/i.test(t) || /напиши (в )?телеграм/i.test(t)) {
    const text = t.replace(/отправь (в )?телеграм[:\s]*/i, "").replace(/напиши (в )?телеграм[:\s]*/i, "").trim();
    return { action: { type: "send_telegram", text: text || "Привет от ДЖАРВИСа" }, confirmation: "Отправляю сообщение в Telegram" };
  }

  // Mini-browser / social apps / VSCode
  if (/открой (мини[- ]?браузер|браузер|whatsapp|telegram|instagram|tiktok|вс[кк]од|vscode|ютуб|youtube|телеграм|ватсап|инстаграм|тикток)/i.test(t) || /открой в окне/i.test(t)) {
    for (const { re, url, title } of BROWSER_APPS) {
      if (re.test(t)) {
        return { action: { type: "open_mini_browser", url, title }, confirmation: `Открываю ${title} в мини-браузере` };
      }
    }
    // Default: just open the mini-browser with current/default URL
    return { action: { type: "open_mini_browser", url: "", title: "Браузер" }, confirmation: "Открываю мини-браузер" };
  }

  if (/закрой (мини[- ]?браузер|браузер|окно)/i.test(t) || /сверни браузер/i.test(t)) {
    return { action: { type: "close_mini_browser" }, confirmation: "Закрываю мини-браузер" };
  }

  // Chat control
  if (/открой чат|покажи чат|разверни чат/i.test(t)) {
    return { action: { type: "toggle_chat", open: true }, confirmation: "Открываю чат" };
  }
  if (/закрой чат|сверни чат|убери чат/i.test(t)) {
    return { action: { type: "toggle_chat", open: false }, confirmation: "Закрываю чат" };
  }

  // Panels / overlays
  if (/открой терминал|покажи терминал|разверни терминал/i.test(t)) {
    return { action: { type: "toggle_terminal", open: true }, confirmation: "Открываю терминал" };
  }
  if (/закрой терминал|сверни терминал|убери терминал/i.test(t)) {
    return { action: { type: "toggle_terminal", open: false }, confirmation: "Закрываю терминал" };
  }

  if (/открой файлы|покажи файлы|файловый менеджер/i.test(t)) {
    return { action: { type: "toggle_files", open: true }, confirmation: "Открываю файловый менеджер" };
  }
  if (/закрой файлы|убери файлы/i.test(t)) {
    return { action: { type: "toggle_files", open: false }, confirmation: "Закрываю файловый менеджер" };
  }

  // Right sidebar tabs explicit
  if (/вкладка/i.test(t)) {
    for (const { re, tab } of HUB_TABS) {
      if (re.test(t)) {
        return { action: { type: "set_hub_tab", tab }, confirmation: `Переключаюсь на вкладку ${tab}` };
      }
    }
  }

  // New / clear chat
  if (/новый чат|создай чат/i.test(t)) {
    return { action: { type: "new_chat" }, confirmation: "Создаю новый чат" };
  }
  if (/очисти чат|очисти сообщения/i.test(t)) {
    return { action: { type: "clear_chat" }, confirmation: "Очищаю чат" };
  }

  // Browser navigation
  if (/назад/i.test(t)) return { action: { type: "navigate_back" }, confirmation: "Назад" };
  if (/впер[её]д/i.test(t)) return { action: { type: "navigate_forward" }, confirmation: "Вперёд" };
  if (/обнови страницу|reload/i.test(t)) return { action: { type: "reload" }, confirmation: "Обновляю страницу" };

  return null;
}
