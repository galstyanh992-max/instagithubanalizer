"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useJarvisStore } from "@/components/jarvis/jarvis-store";
import { useUiStore } from "@/lib/store";

export type UiAction =
  | { type: "navigate"; path: string }
  | { type: "toggle_chat"; open?: boolean }
  | { type: "toggle_terminal"; open?: boolean }
  | { type: "toggle_files"; open?: boolean }
  | { type: "set_hub_tab"; tab: string }
  | { type: "open_mini_browser"; url: string; title: string }
  | { type: "close_mini_browser" }
  | { type: "send_telegram"; text: string }
  | { type: "new_chat" }
  | { type: "clear_chat" }
  | { type: "navigate_back" }
  | { type: "navigate_forward" }
  | { type: "reload" };

export interface UiCommandResult {
  success: boolean;
  message: string;
}

export function useJarvisUiExecutor() {
  const router = useRouter();

  const setOpen = useJarvisStore((s) => s.setOpen);
  const toggleOpen = useJarvisStore((s) => s.toggleOpen);
  const createChat = useJarvisStore((s) => s.createChat);
  const clearChat = useJarvisStore((s) => s.clearChat);
  const activeChatId = useJarvisStore((s) => s.activeChatId);

  const setTerminalOpen = useUiStore((s) => s.setTerminalOpen);
  const setFilesOpen = useUiStore((s) => s.setFilesOpen);
  const setMiniBrowserOpen = useUiStore((s) => s.setMiniBrowserOpen);
  const setMiniBrowserUrl = useUiStore((s) => s.setMiniBrowserUrl);

  const execute = useCallback(
    async (action: UiAction): Promise<UiCommandResult> => {
      switch (action.type) {
        case "navigate":
          if (typeof window !== "undefined") {
            window.location.href = action.path;
          }
          return { success: true, message: `Перехожу на ${action.path}` };

        case "toggle_chat": {
          const next = action.open ?? !useJarvisStore.getState().open;
          setOpen(next);
          return {
            success: true,
            message: next ? "Открываю чат" : "Закрываю чат",
          };
        }

        case "toggle_terminal": {
          const next = action.open ?? !useUiStore.getState().terminalOpen;
          setTerminalOpen(next);
          return {
            success: true,
            message: next ? "Открываю терминал" : "Закрываю терминал",
          };
        }

        case "toggle_files": {
          const next = action.open ?? !useUiStore.getState().filesOpen;
          setFilesOpen(next);
          return {
            success: true,
            message: next ? "Открываю файловый менеджер" : "Закрываю файловый менеджер",
          };
        }

        case "set_hub_tab":
          // Dispatch a custom event so OsOperationsHub can switch tabs
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("jarvis:set-hub-tab", { detail: { tab: action.tab } })
            );
          }
          return { success: true, message: `Переключаюсь на вкладку ${action.tab}` };

        case "open_mini_browser": {
          if (action.url) {
            setMiniBrowserUrl(action.url, action.title);
          } else {
            setMiniBrowserOpen(true);
          }
          return { success: true, message: `Открываю ${action.title || "мини-браузер"}` };
        }

        case "close_mini_browser": {
          setMiniBrowserOpen(false);
          return { success: true, message: "Закрываю мини-браузер" };
        }

        case "send_telegram": {
          const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "me";
          try {
            const res = await fetch("/api/telegram/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId, text: action.text }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || data.message || "unknown");
            return { success: true, message: `Отправлено в Telegram (chat ${chatId})` };
          } catch (e) {
            return { success: false, message: `Ошибка Telegram: ${e instanceof Error ? e.message : String(e)}` };
          }
        }

        case "new_chat":
          createChat();
          return { success: true, message: "Создаю новый чат" };

        case "clear_chat": {
          const id = activeChatId ?? useJarvisStore.getState().activeChatId;
          if (id) clearChat(id);
          return { success: true, message: "Очищаю текущий чат" };
        }

        case "navigate_back":
          if (typeof window !== "undefined") window.history.back();
          return { success: true, message: "Назад" };

        case "navigate_forward":
          if (typeof window !== "undefined") window.history.forward();
          return { success: true, message: "Вперёд" };

        case "reload":
          if (typeof window !== "undefined") window.location.reload();
          return { success: true, message: "Обновляю страницу" };

        default:
          return { success: false, message: "Неизвестная UI-команда" };
      }
    },
    [router, setOpen, setTerminalOpen, setFilesOpen, createChat, clearChat, activeChatId]
  );

  return { execute };
}
