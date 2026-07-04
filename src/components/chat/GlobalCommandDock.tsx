"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function GlobalCommandDock() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/providers/status")
      .then((r) => r.json())
      .then((d) => {
        setFallbackMode(d.mockMode);
      })
      .catch(() => void 0);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        if (res.status === 403) {
           const data = await res.json();
           throw new Error(data.error || "Blocked by PromptInjectionGuard");
        }
        throw new Error("Failed");
      }
      const data = await res.json();
      toast.success(data.reply || "Команда выполнена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить команду");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Браузер не поддерживает голосовой ввод");
      return;
    }
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setInput(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div className="mx-auto flex w-full flex-col gap-0 signal-console p-4">
        
        {/* Signal Console Header */}
        <div className="flex items-center justify-between border-b border-cyan-400/20 pb-3 mb-3">
          <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-mono tracking-[0.2em] uppercase font-bold">
            <span className="text-cyan-500 opacity-60">((+))</span>
            Jarwisyan Signal Console
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest">
            {loading ? (
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Activity className="h-3 w-3 animate-pulse" />
                <span className="uppercase tracking-wider">Processing</span>
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 ${fallbackMode ? "text-amber-400" : "text-lime-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${fallbackMode ? "bg-amber-400" : "bg-lime-400"} animate-pulse`} />
                <span className="uppercase tracking-wider">{fallbackMode ? "Fallback Mode" : "System Ready"}</span>
              </span>
            )}
          </div>
        </div>

        {/* Input area */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-zinc-950/40 p-1.5 shadow-[inset_0_0_15px_rgba(34,211,238,0.05)] h-[60px] md:h-[50px]"
        >
          <div className="pl-3 opacity-50"><span className="text-cyan-400 text-sm font-mono">&gt;</span></div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Передайте команду ДЖАРВИС..."
            className="flex-1 bg-transparent px-2 py-2 text-sm text-cyan-50 outline-none placeholder:text-cyan-400/40 font-mono"
            disabled={loading}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={startListening}
            className={`h-9 w-9 shrink-0 rounded-lg ${listening ? "bg-fuchsia-500/10 text-fuchsia-300 animate-pulse border border-fuchsia-400/50" : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"}`}
            title="Голосовой ввод"
            disabled={loading}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button 
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            className="h-9 w-9 shrink-0 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/40 hover:text-cyan-100 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]"
            title="Отправить"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
