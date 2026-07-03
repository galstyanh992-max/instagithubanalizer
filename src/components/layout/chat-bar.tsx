"use client";

import { useState } from "react";
import { Mic, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatBar() {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    console.log("Sending:", message);
    setMessage("");
  };

  return (
    <div className="sticky bottom-0 z-30 border-t border-cyan-400/20 bg-zinc-950/80 p-3 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-cyan-400/30 bg-zinc-950/60 p-2 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
        <Button variant="ghost" size="icon" className="shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-xl">
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask JARVIS..."
          className="flex-1 bg-transparent px-2 py-1 text-sm text-cyan-50 outline-none placeholder:text-cyan-400/40 font-mono"
        />
        <Button variant="ghost" size="icon" className="shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-xl">
          <Mic className="h-5 w-5" />
        </Button>
        <Button 
          onClick={handleSend}
          className="shrink-0 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400/30 hover:text-cyan-100 rounded-xl border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all"
        >
          <Send className="h-4 w-4 mr-2" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold">Отправить</span>
        </Button>
      </div>
    </div>
  );
}
