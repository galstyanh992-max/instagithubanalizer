"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export type JarvisMessageRole = "user" | "assistant" | "system";

export interface JarvisMessage {
  id: string;
  role: JarvisMessageRole;
  content: string;
  createdAt: number;
  url?: string;
  mimeType?: string;
  taskType?: string;
  model?: string;
  error?: string;
}

export interface JarvisChat {
  id: string;
  title: string;
  messages: JarvisMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ArchivedFile {
  id: string;
  url: string;
  key?: string;
  bucket?: string;
  mimeType?: string;
  prompt?: string;
  type?: string;
  folder?: string;
  createdAt: number;
}

interface JarvisStoreState {
  open: boolean;
  chats: JarvisChat[];
  activeChatId: string | null;
  archivedFiles: ArchivedFile[];
  hydrated: boolean;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  close: () => void;

  setActiveChat: (id: string | null) => void;
  createChat: () => string;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  addMessage: (chatId: string, message: Omit<JarvisMessage, "id" | "createdAt">) => void;
  clearChat: (id: string) => void;

  addArchivedFile: (file: Omit<ArchivedFile, "id" | "createdAt">) => void;
  deleteArchivedFile: (id: string) => void;
  setArchivedFiles: (files: ArchivedFile[]) => void;
  setHydrated: () => void;
}

export function buildMessage(
  payload: Omit<JarvisMessage, "id" | "createdAt">
): JarvisMessage {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    ...payload,
  };
}

function makeTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "Новый чат";
  return clean.length > 40 ? clean.slice(0, 37) + "..." : clean;
}

export const useJarvisStore = create<JarvisStoreState>()(
  persist(
    (set, get) => ({
      open: true,
      chats: [],
      activeChatId: null,
      archivedFiles: [],
      hydrated: false,

      setOpen: (open) => set({ open }),
      toggleOpen: () => set((s) => ({ open: !s.open })),
      close: () => set({ open: false }),

      setActiveChat: (id) => set({ activeChatId: id }),

      createChat: () => {
        const id = uuidv4();
        const chat: JarvisChat = {
          id,
          title: "Новый чат",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          chats: [chat, ...s.chats],
          activeChatId: id,
          open: true,
        }));
        return id;
      },

      deleteChat: (id) =>
        set((s) => {
          const chats = s.chats.filter((c) => c.id !== id);
          return {
            chats,
            activeChatId:
              s.activeChatId === id
                ? chats[0]?.id ?? null
                : s.activeChatId,
          };
        }),

      renameChat: (id, title) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, title: title || c.title, updatedAt: Date.now() } : c
          ),
        })),

      addMessage: (chatId, message) =>
        set((s) => {
          const msg = buildMessage(message);
          const chats = s.chats.map((c) => {
            if (c.id !== chatId) return c;
            const isFirstUser =
              msg.role === "user" &&
              c.messages.filter((m) => m.role === "user").length === 0;
            return {
              ...c,
              messages: [...c.messages, msg],
              title: isFirstUser ? makeTitle(msg.content) : c.title,
              updatedAt: Date.now(),
            };
          });
          return { chats };
        }),

      clearChat: (id) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c
          ),
        })),

      addArchivedFile: (file) =>
        set((s) => ({
          archivedFiles: [
            { id: uuidv4(), createdAt: Date.now(), ...file },
            ...s.archivedFiles,
          ],
        })),

      deleteArchivedFile: (id) =>
        set((s) => ({
          archivedFiles: s.archivedFiles.filter((f) => f.id !== id),
        })),

      setArchivedFiles: (files) => set({ archivedFiles: files }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "ai-jarwisyan-chats",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
