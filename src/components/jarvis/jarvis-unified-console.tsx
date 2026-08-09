"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useJarvis, type JarvisMediaType } from "./use-jarvis";
import { useJarvisStore } from "./jarvis-store";
import { useVoice } from "@/components/voice/use-voice";
import { useJarvisUiExecutor } from "./use-jarvis-ui-executor";
import { useUiStore } from "@/lib/store";
import { MediaPlayer } from "./media-player";
import { Loader2, Image, Video, Music, Mic, MessageSquare, Send, Brain, Terminal, Code, Search, Cpu, Paperclip, X } from "lucide-react";

const modeLabels: Record<string, { label: string; icon: typeof MessageSquare }> = {
  auto: { label: "ЧАТ", icon: MessageSquare },
  code: { label: "</> КОД", icon: Code },
  analysis: { label: "АНАЛИЗ", icon: Brain },
  search: { label: "ПОИСК", icon: Search },
  autonomous: { label: "АВТОНОМНЫЙ РЕЖИМ", icon: Cpu },
};

const jarvisMediaTypes: JarvisMediaType[] = ["image", "video", "music", "transcription"];

// Typewriter effect component
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}</span>;
}

export function JarvisUnifiedConsole() {
  const autoSpeak = useUiStore((s) => s.autoSpeak);
  const voiceEnabled = useUiStore((s) => s.voiceEnabled);
  const voice = useVoice({ autoSpeak: false });
  const { execute: executeUi } = useJarvisUiExecutor();

  const handleSpeak = useCallback((text: string) => {
    if (autoSpeak && voiceEnabled) voice.speak(text, true);
  }, [autoSpeak, voiceEnabled, voice]);

  const { loading, ask, generateMedia, clear } = useJarvis({
    autoSpeak,
    onSpeak: handleSpeak,
    onUiAction: executeUi,
  });

  const activeChatId = useJarvisStore((s) => s.activeChatId);
  const chats = useJarvisStore((s) => s.chats);
  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<keyof typeof modeLabels>("auto");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [canCancelUpload, setCanCancelUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    setUploadError("");
    setPendingFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        const duplicate = next.some((item) =>
          item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
        );
        if (duplicate) {
          setUploadError(`Duplicate attachment: ${file.name}`);
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 20 MB`);
          continue;
        }
        if (next.length >= 5) {
          setUploadError("Maximum 5 attachments");
          break;
        }
        next.push(file);
      }
      return next;
    });
  }, []);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;
    if (jarvisMediaTypes.includes(mode as JarvisMediaType)) {
      await generateMedia(mode as JarvisMediaType, text);
      setInput("");
      return;
    }
    if (mode === "analysis") {
      const controller = new AbortController();
      uploadControllerRef.current = controller;
      setCanCancelUpload(true);
      const response = await ask(text, "analysis", pendingFiles, controller.signal);
      uploadControllerRef.current = null;
      setCanCancelUpload(false);
      if (response.ok) {
        setPendingFiles([]);
        setInput("");
      }
      return;
    }
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setCanCancelUpload(true);
    const response = await ask(text, undefined, pendingFiles, controller.signal);
    uploadControllerRef.current = null;
    setCanCancelUpload(false);
    if (response.ok) {
      setPendingFiles([]);
      setUploadError("");
      setInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  const setModeAndClear = (m: keyof typeof modeLabels) => {
    setMode(m);
    clear();
  };

  return (
    <div className="h-full flex flex-col sci-fi-panel sci-fi-panel-chamfer relative overflow-hidden">
      
      {/* HEADER */}
      <div className="h-10 border-b border-cyan-500/20 bg-[#02050A]/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400">ДЖАРВИС - КОМАНДНЫЙ ТЕРМИНАЛ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-cyan-700 font-mono tracking-widest uppercase">{activeChat ? activeChat.title : "ОЖИДАНИЕ ВВОДА"}</span>
          <div className="w-1.5 h-1.5 bg-[#a3e635] rounded-full shadow-[0_0_8px_#a3e635]"></div>
        </div>
      </div>

      {/* CHAT HISTORY AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar font-rajdhani text-[13px] space-y-6">
        {activeChat?.messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-full border border-cyan-500/40 bg-[#02050A] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  <div className="w-6 h-6 rounded-full border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-[10px] text-glow-intense">J</div>
                </div>
              )}
              <div className={`max-w-[80%] ${
                isUser 
                  ? 'text-cyan-100 text-right' 
                  : 'text-cyan-100'
              }`}>
                
                {isUser ? (
                  <div className="bg-cyan-950/30 border border-cyan-500/20 px-4 py-2 rounded-xl rounded-tr-none text-[12px] text-cyan-50 tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 tracking-wider leading-relaxed">
                    <TypewriterText text={msg.content} />
                  </div>
                )}

                {(msg as any).media && (
                  <div className="mt-3 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <MediaPlayer url={(msg as any).media.url} type={(msg as any).media.type} mimeType={(msg as any).media.mimeType || ""} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full border border-cyan-500/40 bg-[#02050A] flex items-center justify-center shrink-0">
              <div className="w-6 h-6 rounded-full border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-[10px]">J</div>
            </div>
            <div className="text-cyan-500 flex items-center gap-2 text-[12px] tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> ОБРАБОТКА...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK COMMANDS */}
      <div className="px-6 pb-2 pt-2 flex flex-wrap items-center gap-3 overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[9px] text-cyan-700 tracking-widest uppercase whitespace-nowrap">Быстрые команды:</span>
        <button onClick={() => handleSubmit("Проанализируй системный отчет")} className="text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-500 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all whitespace-nowrap">Проанализируй системный отчет</button>
        <button onClick={() => handleSubmit("Покажи активные проекты")} className="text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-500 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all whitespace-nowrap">Покажи активные проекты</button>
        <button onClick={() => handleSubmit("Оптимизируй ресурсы")} className="text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-500 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all whitespace-nowrap">Оптимизируй ресурсы</button>
      </div>

      {/* INPUT AREA */}
      <div
        className="p-4 pt-2 shrink-0 relative flex flex-col items-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex w-full max-w-4xl flex-wrap gap-2" aria-label="Selected attachments">
            {pendingFiles.map((file) => (
              <span key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[10px] text-cyan-200">
                {file.name}
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPendingFiles((items) => items.filter((item) => item !== file))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {uploadError && <div className="mb-2 w-full max-w-4xl text-[10px] text-red-300" role="alert">{uploadError}</div>}
        <div className="w-full max-w-4xl relative flex items-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.pdf,.txt,.md,.json,.jsonl,.csv,.ts,.tsx,.js,.jsx,.py"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length > 0) addFiles(files);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(input);
              }
            }}
            placeholder="Введите команду или запрос..."
            className="w-full bg-[#02050A]/60 border border-cyan-500/30 rounded-2xl py-3 pl-14 pr-14 text-sm font-rajdhani text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all sci-fi-panel-chamfer-tl-br"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Attach files"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-cyan-500/30 text-cyan-500 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center hover:bg-cyan-900 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
          </button>
        </div>
        {loading && canCancelUpload && (
          <button type="button" onClick={() => uploadControllerRef.current?.abort()} className="mt-2 text-[10px] text-amber-300">
            Cancel upload/send
          </button>
        )}

        {/* BOTTOM TABS INSIDE CONSOLE */}
        <div className="flex items-center justify-center gap-8 mt-3 w-full max-w-4xl border-t border-cyan-500/10 pt-2">
          {Object.entries(modeLabels).map(([m, { label, icon: Icon }]) => (
            <button
              key={m}
              onClick={() => setModeAndClear(m as any)}
              className={`flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                mode === m 
                  ? 'text-cyan-400 text-glow-intense border-b border-cyan-400 pb-1' 
                  : 'text-cyan-800 hover:text-cyan-500'
              }`}
            >
              {m !== 'auto' && m !== 'autonomous' && <Icon className="w-3 h-3" />} {label}
              {m === 'autonomous' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_#f97316] animate-pulse ml-1"></div>}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
