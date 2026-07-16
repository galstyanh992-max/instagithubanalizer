"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useJarvis, type JarvisMediaType } from "./use-jarvis";
import { useJarvisStore } from "./jarvis-store";
import { useVoice } from "@/components/voice/use-voice";
import { useJarvisUiExecutor } from "./use-jarvis-ui-executor";
import { useUiStore } from "@/lib/store";
import { MediaPlayer } from "./media-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Image, Video, Music, Mic, MessageSquare, Send, Upload, X, Brain, ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";

const modeLabels: Record<string, { label: string; icon: typeof Image }> = {
  auto: { label: "Авто", icon: MessageSquare },
  image: { label: "Изображение", icon: Image },
  video: { label: "Видео", icon: Video },
  music: { label: "Музыка", icon: Music },
  transcription: { label: "Транскрипция", icon: Mic },
  analysis: { label: "Анализ", icon: Brain },
  telegram: { label: "Telegram", icon: Send },
};

const jarvisMediaTypes: JarvisMediaType[] = ["image", "video", "music", "transcription"];

function formatTime(ts: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function JarvisUnifiedConsole() {
  const autoSpeak = useUiStore((s) => s.autoSpeak);
  const toggleAutoSpeak = useUiStore((s) => s.toggleAutoSpeak);
  const voiceEnabled = useUiStore((s) => s.voiceEnabled);
  const toggleVoice = useUiStore((s) => s.toggleVoice);

  const voice = useVoice({ autoSpeak: false });
  const { execute: executeUi } = useJarvisUiExecutor();

  const handleSpeak = useCallback((text: string) => {
    if (autoSpeak && voiceEnabled) voice.speak(text, true);
  }, [autoSpeak, voiceEnabled, voice]);

  const handleMicClick = useCallback(() => {
    if (!voiceEnabled) return;
    if (voice.listening) voice.stop();
    else voice.start();
  }, [voiceEnabled, voice]);

  const { loading, result, ask, generateMedia, clear } = useJarvis({
    autoSpeak,
    onSpeak: handleSpeak,
    onUiAction: executeUi,
  });

  const open = useJarvisStore((s) => s.open);
  const toggleOpen = useJarvisStore((s) => s.toggleOpen);
  const activeChatId = useJarvisStore((s) => s.activeChatId);
  const chats = useJarvisStore((s) => s.chats);
  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId),
    [chats, activeChatId]
  );
  const createChat = useJarvisStore((s) => s.createChat);
  const clearChat = useJarvisStore((s) => s.clearChat);

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<keyof typeof modeLabels>("auto");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmitWith = async (text: string) => {
    if (!text.trim()) return;
    if (mode === "telegram") {
      const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "me";
      try {
        const res = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, text }),
        });
        const data = await res.json();
        const msg = data.ok ? `Отправлено в Telegram (chat ${chatId})` : `Ошибка Telegram: ${data.error || data.message || "unknown"}`;
        const store = useJarvisStore.getState();
        store.addMessage(store.activeChatId || store.createChat(), { role: "assistant", content: msg, taskType: "telegram" });
      } catch (e) {
        const store = useJarvisStore.getState();
        store.addMessage(store.activeChatId || store.createChat(), { role: "system", content: `Ошибка: ${e instanceof Error ? e.message : String(e)}`, error: String(e) });
      }
      setInput("");
      return;
    }
    if (jarvisMediaTypes.includes(mode as JarvisMediaType) && mode !== "transcription") {
      await generateMedia(mode as JarvisMediaType, text);
      setInput("");
      return;
    }
    if (mode === "transcription" && file) {
      await generateMedia("transcription", text, file);
      setFile(null);
      setInput("");
      return;
    }
    if (mode === "analysis") {
      await ask(text, "analysis");
      setInput("");
      return;
    }
    await ask(text);
    setInput("");
  };

  const handleSubmit = () => handleSubmitWith(input);

  // Voice input: when listening stops and transcript is final, auto-submit
  useEffect(() => {
    if (!voice.listening && voice.transcript) {
      const t = voice.transcript.trim();
      if (t) {
        setInput(t);
        // auto-submit after short delay so user sees the text
        const id = setTimeout(() => {
          void handleSubmitWith(t);
          voice.reset();
        }, 400);
        return () => clearTimeout(id);
      }
    }
  }, [voice.listening, voice.transcript]);

  const setModeAndClear = (m: keyof typeof modeLabels) => {
    setMode(m);
    clear();
    setFile(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, result]);

  // Submit is valid when input is non-empty; for transcription, a file is required too.
  const canSubmit = input.trim() && (mode !== "transcription" || !!file);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full rounded-2xl border border-cyan-400/20 bg-zinc-950/60 backdrop-blur-2xl px-4 py-3 text-left text-xs font-mono text-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.08),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:bg-zinc-900/70 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" />
          {activeChat?.messages.length ? activeChat.title : "Открыть чат с ДЖАРВИСом"}
        </span>
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-cyan-400/20 bg-zinc-950/60 backdrop-blur-2xl p-4 relative z-20 shadow-[0_0_40px_rgba(34,211,238,0.08),inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col max-h-[min(70vh,560px)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">ДЖАРВИС</span>
          {activeChat && (
            <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[180px]">
              {activeChat.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${voiceEnabled ? "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"}`}
            onClick={toggleVoice}
            title={voiceEnabled ? "Голосовой ввод/ответ включён" : "Голосовой ввод/ответ выключен"}
          >
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${autoSpeak && voiceEnabled ? "text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/20" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"}`}
            onClick={toggleAutoSpeak}
            title={autoSpeak && voiceEnabled ? "Авто-озвучка ответов включена" : "Авто-озвучка ответов выключена"}
          >
            {autoSpeak && voiceEnabled ? <Mic className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-zinc-500" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
            onClick={() => createChat()}
            title="Новый чат"
          >
            <span className="text-xs leading-none">+</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-amber-300 hover:bg-amber-500/20"
            onClick={() => activeChat && confirm("Очистить сообщения в текущем чате?") && clearChat(activeChat.id)}
            title="Очистить чат"
          >
            <span className="text-xs leading-none">⌫</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"
            onClick={toggleOpen}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-0 flex-1">
        {/* Mode selector row */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map((m) => {
            const { label, icon: Icon } = modeLabels[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModeAndClear(m)}
                className={`group flex items-center gap-1.5 px-4 py-2 rounded-xl border transition-all active:translate-y-0.5 text-[10px] font-mono uppercase tracking-wider ${
                  active
                    ? "bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-300 shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.3),inset_0_-2px_rgba(0,0,0,0.2),0_0_15px_rgba(34,211,238,0.4)]"
                    : "bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 border-zinc-700/50 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40 shadow-[inset_0_1px_rgba(255,255,255,0.1),inset_0_-2px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.2),0_0_15px_rgba(34,211,238,0.2)]"
                }`}
              >
                <Icon className={`h-3 w-3 ${active ? "drop-shadow-[0_0_5px_currentColor]" : "group-hover:drop-shadow-[0_0_5px_currentColor] transition-all"}`} />
                {label}
              </button>
            );
          })}
        </div>

        {/* File upload row for transcription */}
        {mode === "transcription" && (
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border-zinc-700/50 bg-zinc-900/60 hover:text-cyan-300"
            >
              <Upload className="mr-1 h-3 w-3" /> {file ? file.name : "Загрузить аудио"}
            </Button>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="text-zinc-500 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Messages area — chat history */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {activeChat?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs border ${
                  msg.role === "user"
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-50 rounded-br-sm"
                    : msg.role === "system" && msg.error
                      ? "bg-red-500/10 border-red-400/30 text-red-200"
                      : "bg-zinc-800/60 border-zinc-700/50 text-zinc-200 rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" && msg.taskType && (
                  <div className="mb-1 text-[9px] text-zinc-500 font-mono">
                    {msg.taskType}{msg.model ? ` · ${msg.model}` : ""}
                  </div>
                )}
                {msg.url && msg.mimeType?.startsWith("image/") && (
                  <img src={msg.url} alt="generated" className="rounded border border-zinc-700 max-h-48" />
                )}
                {msg.url && msg.mimeType?.startsWith("video/") && (
                  <MediaPlayer url={msg.url} mimeType={msg.mimeType} type="video" />
                )}
                {msg.url && msg.mimeType?.startsWith("audio/") && (
                  <MediaPlayer url={msg.url} mimeType={msg.mimeType} type="audio" />
                )}
                {msg.url && msg.mimeType === "text/plain" && (
                  <a href={msg.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Скачать транскрипцию</a>
                )}
                {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                <div className={`text-[8px] mt-1 ${msg.role === "user" ? "text-cyan-300/60" : "text-zinc-500"}`}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />
                <span className="text-[10px] text-zinc-400 font-mono">ДЖАРВИС думает...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div className="relative w-full group shrink-0">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); } }}
            placeholder={
              mode === "auto"
                ? "Скажи ДЖАРВИСу что сделать: сгенерируй изображение, видео, музыку, транскрибируй аудио, проанализируй, или отправь в Telegram..."
                : mode === "analysis"
                  ? "Опиши объект анализа (репозиторий, код, данные)..."
                  : mode === "transcription"
                    ? "Добавь аудио и напиши: расшифруй"
                    : mode === "telegram"
                      ? "Введи сообщение для отправки в Telegram..."
                      : `Опиши что сгенерировать (${modeLabels[mode].label.toLowerCase()})...`
            }
            className="relative w-full bg-zinc-900/90 border border-cyan-400/40 rounded-xl pl-5 pr-24 py-4 text-cyan-50 font-mono text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.3)] transition-all placeholder:text-zinc-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
          />
          <button
            type="button"
            disabled={loading || !canSubmit}
            onClick={() => void handleSubmit()}
            className={`absolute right-10 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.4)] active:translate-y-[calc(-50%+2px)] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
              canSubmit && !loading
                ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-zinc-950 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] border-cyan-300"
                : "bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500 border border-zinc-700"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 drop-shadow-sm" />}
          </button>
          <button
            type="button"
            disabled={loading || !voice.supported || !voiceEnabled}
            onClick={handleMicClick}
            title={voice.listening ? "Остановить запись" : "Голосовая команда"}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all active:translate-y-[calc(-50%+2px)] disabled:opacity-50 disabled:cursor-not-allowed ${
              voice.listening
                ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/50 animate-pulse"
                : "bg-zinc-800/80 text-cyan-300 border border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-500/10"
            }`}
          >
            <Mic className={`h-4 w-4 ${voice.listening ? "drop-shadow-[0_0_5px_currentColor]" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
