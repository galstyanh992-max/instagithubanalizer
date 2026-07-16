"use client";

import { useJarvisStore } from "./jarvis-store";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";

export function JarvisChatList() {
  const chats = useJarvisStore((s) => s.chats);
  const activeChatId = useJarvisStore((s) => s.activeChatId);
  const createChat = useJarvisStore((s) => s.createChat);
  const setActiveChat = useJarvisStore((s) => s.setActiveChat);
  const deleteChat = useJarvisStore((s) => s.deleteChat);
  const close = useJarvisStore((s) => s.close);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">
          Чаты
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
            onClick={createChat}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"
            onClick={close}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {chats.length === 0 && (
          <div className="text-[10px] text-zinc-500 font-mono text-center py-6">
            Нет сохранённых чатов
          </div>
        )}
        {chats.map((chat) => {
          const active = activeChatId === chat.id;
          return (
            <div
              key={chat.id}
              className={`group flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
                active
                  ? "bg-cyan-500/15 border-cyan-500/40 shadow-[inset_0_1px_rgba(255,255,255,0.1),0_0_10px_rgba(34,211,238,0.15)]"
                  : "bg-zinc-900/50 border-cyan-400/10 hover:border-cyan-400/30"
              }`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className={`h-3 w-3 shrink-0 ${active ? "text-cyan-300" : "text-zinc-500"}`} />
                <span className="text-[10px] text-zinc-200 font-mono truncate">
                  {chat.title}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-200 hover:bg-red-500/20 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
