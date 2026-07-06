"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Send, Mic, Loader2, FolderGit2, Wrench,
  Cpu, ArrowRight, Radio, Activity, Brain,
} from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ type: string; label: string; target?: string }>;
}

const QUICK_COMMANDS = [
  { icon: FolderGit2, label: "Анализ repo", prompt: "Проанализируй репозиторий " },
  { icon: Wrench, label: "Подключить проект", prompt: "Хочу подключить мой проект" },
  { icon: ArrowRight, label: "План интеграции", prompt: "Создай план интеграции" },
  { icon: Cpu, label: "Проверить мой ПК", prompt: "Проверь локальную совместимость" },
  { icon: Brain, label: "Сохранить в память", prompt: "Сохрани это в память: " },
];

export function JarwisyanChatPanel({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.reply,
        actions: data.actions,
      }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Ошибка: " + (e instanceof Error ? e.message : "не удалось отправить"),
      }]);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className={`signal-console relative overflow-hidden ${className ?? ""}`}>
      {/* Decorative corner accents */}
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-cyan-400/40" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-cyan-400/40" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-l border-b border-cyan-400/40" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-r border-b border-cyan-400/40" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-cyan-400/12 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className={`h-4 w-4 ${listening ? "text-fuchsia-400" : "text-cyan-400"}`} />
            {listening && <div className="absolute inset-0 animate-ping"><Radio className="h-4 w-4 text-fuchsia-400/50" /></div>}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold">ДЖАРВИС Signal Console</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          {loading ? (
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Activity className="h-3 w-3 animate-pulse" />
              <span className="uppercase tracking-wider">Обработка</span>
            </span>
          ) : (
            <span className={`flex items-center gap-1.5 ${fallbackMode ? "text-amber-400" : "text-lime-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${fallbackMode ? "bg-amber-400" : "bg-lime-400"} animate-pulse`} />
              <span className="uppercase tracking-wider">{fallbackMode ? "Fallback режим" : "Готов к анализу"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Body — messages or empty state */}
      <div
        ref={scrollRef}
        className="relative z-10 max-h-56 min-h-[110px] space-y-2.5 overflow-y-auto px-5 py-4"
      >
        {!hasMessages && !loading && (
          <div className="flex h-full min-h-[90px] flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-semibold">Сигнал ожидает ввода</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            </div>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-500">
              Передайте команду для анализа репозитория, подключения проекта или создания плана интеграции
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-500/10">
                <Radio className="h-2.5 w-2.5 text-cyan-300" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-cyan-500/10 text-cyan-50 border border-cyan-400/25"
                  : "bg-zinc-900/50 text-zinc-200 border border-cyan-400/10"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.actions.map((a, j) => (
                    a.target ? (
                      <Link key={j} href={a.target} className="command-chip">{a.label} →</Link>
                    ) : (
                      <span key={j} className="command-chip opacity-60">{a.label}</span>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-cyan-300">
            <Loader2 className="h-3 w-3 animate-spin" /> Сигнал обрабатывается...
          </div>
        )}
      </div>

      {/* Quick commands */}
      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-cyan-400/10 px-5 py-2.5">
        {QUICK_COMMANDS.map((qa) => {
          const Icon = qa.icon;
          return (
            <button
              key={qa.label}
              onClick={() => { setInput(qa.prompt); textareaRef.current?.focus(); }}
              className="command-chip"
            >
              <Icon className="h-2.5 w-2.5" />
              {qa.label}
            </button>
          );
        })}
      </div>

      {/* Input rail */}
      <div className="relative z-10 flex items-end gap-2 border-t border-cyan-400/15 p-4">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите ДЖАРВИС: проанализировать репозиторий, подключить проект или создать план интеграции..."
            className="min-h-[46px] max-h-28 resize-none border-cyan-400/20 bg-zinc-950/60 text-sm placeholder:text-zinc-600 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/10"
            rows={1}
          />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={startListening}
          className={`h-[46px] w-[46px] shrink-0 rounded-xl border-cyan-400/25 bg-cyan-500/5 hover:bg-cyan-500/15 ${listening ? "border-fuchsia-400/50 bg-fuchsia-500/10" : ""}`}
          title="Голосовой ввод"
        >
          <Mic className={`h-4 w-4 ${listening ? "text-fuchsia-300 animate-pulse" : "text-cyan-300"}`} />
        </Button>
        <Button
          size="icon"
          onClick={() => void send(input)}
          disabled={!input.trim() || loading}
          className="h-[46px] w-[46px] shrink-0 rounded-xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-100 hover:from-cyan-500/30 hover:to-cyan-600/20 shadow-[0_0_20px_-4px_rgba(34,211,238,0.5)]"
          title="Отправить"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}