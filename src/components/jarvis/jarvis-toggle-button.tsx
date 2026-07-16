"use client";

import { useJarvisStore } from "./jarvis-store";
import { MessageSquare } from "lucide-react";

export function JarvisToggleButton() {
  const open = useJarvisStore((s) => s.open);
  const toggleOpen = useJarvisStore((s) => s.toggleOpen);

  return (
    <button
      type="button"
      onClick={toggleOpen}
      className={`fixed bottom-6 right-6 z-40 flex items-center justify-center gap-2 px-4 py-3 rounded-full border backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all hover:scale-105 active:scale-95 ${
        open
          ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
          : "bg-zinc-950/70 border-cyan-400/30 text-cyan-300 hover:bg-zinc-900/80"
      }`}
    >
      <MessageSquare className="h-4 w-4" />
      <span className="text-xs font-mono uppercase tracking-wider">
        {open ? "Закрыть чат" : "Открыть чат"}
      </span>
    </button>
  );
}
