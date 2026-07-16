"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, ExternalLink, Minus, Maximize2, Globe, ArrowLeft, ArrowRight, MousePointer2, Type, Square } from "lucide-react";
import { useUiStore } from "@/lib/store";

const PRELOADED_URLS = new Set<string>();

function preloadUrl(url: string) {
  if (!url || PRELOADED_URLS.has(url)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "document";
  link.href = url;
  document.head.appendChild(link);
  PRELOADED_URLS.add(url);
}

export function MiniBrowser() {
  const open = useUiStore((s) => s.miniBrowserOpen);
  const url = useUiStore((s) => s.miniBrowserUrl);
  const title = useUiStore((s) => s.miniBrowserTitle);
  const setOpen = useUiStore((s) => s.setMiniBrowserOpen);
  const setUrl = useUiStore((s) => s.setMiniBrowserUrl);

  const [inputUrl, setInputUrl] = useState(url);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [mode, setMode] = useState<"iframe" | "remote">("iframe");
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [remoteScreenshot, setRemoteScreenshot] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setInputUrl(url);
    if (url) preloadUrl(url);
  }, [url]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const handleNavigate = () => {
    let target = inputUrl.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setUrl(target, target);
  };

  const sizes = {
    sm: "w-[640px] h-[55vh]",
    md: "w-[900px] h-[70vh]",
    lg: "w-[1150px] h-[82vh]",
  };

  const externalOpen = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const launchRemote = async () => {
    setRemoteStatus("loading");
    try {
      const res = await fetch("/api/browser/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch", url }),
      });
      const data = await res.json();
      if (data.ok && data.screenshot) {
        setRemoteScreenshot(data.screenshot);
        setRemoteStatus("ready");
      } else {
        setRemoteStatus("error");
      }
    } catch {
      setRemoteStatus("error");
    }
  };

  const sendRemoteAction = async (action: string, payload?: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/browser/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, url, ...payload }),
      });
      const data = await res.json();
      if (data.screenshot) setRemoteScreenshot(data.screenshot);
      if (data.url) setUrl(data.url, data.url);
    } catch (err) {
      console.error("[MiniBrowser] remote action failed:", err);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Window */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] flex flex-col rounded-2xl border border-cyan-500/30 bg-zinc-950/90 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(34,211,238,0.15)] overflow-hidden ${sizes[size]}`}
            role="dialog"
            aria-label="Mini browser"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Chrome */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 border-b border-cyan-400/20 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Закрыть"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                  title="Размер"
                >
                  {size === "sm" ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={externalOpen}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                  title="Открыть в новой вкладке"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => iframeRef.current?.contentWindow?.history.back()}
                    className="p-1 rounded-md text-zinc-500 hover:text-cyan-300"
                    title="Назад"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => iframeRef.current?.contentWindow?.history.forward()}
                    className="p-1 rounded-md text-zinc-500 hover:text-cyan-300"
                    title="Вперёд"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => iframeRef.current?.contentWindow?.location.reload()}
                    className="p-1 rounded-md text-zinc-500 hover:text-cyan-300"
                    title="Обновить"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/70 px-2 py-1">
                  <Globe className="h-3 w-3 text-zinc-500" />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
                    className="flex-1 bg-transparent text-[11px] font-mono text-cyan-50 placeholder:text-zinc-600 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMode((m) => (m === "iframe" ? "remote" : "iframe"))}
                    className={`text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-all ${
                      mode === "remote"
                        ? "border-fuchsia-500/50 text-fuchsia-300 bg-fuchsia-500/10"
                        : "border-zinc-700 text-zinc-400 hover:text-cyan-300"
                    }`}
                    title={mode === "remote" ? "Режим удалённого управления" : "Обычный iframe"}
                  >
                    {mode === "remote" ? "AI Control" : "Iframe"}
                  </button>
                </div>
              </div>
            </div>

            {/* Remote control toolbar */}
            {mode === "remote" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border-b border-cyan-400/10 shrink-0">
                <button
                  type="button"
                  onClick={launchRemote}
                  disabled={remoteStatus === "loading"}
                  className="text-[9px] font-mono uppercase px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  {remoteStatus === "loading" ? "Запуск..." : "Запустить браузер"}
                </button>
                <button
                  type="button"
                  onClick={() => sendRemoteAction("navigate", { url })}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300"
                  title="Перейти"
                >
                  <Globe className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => sendRemoteAction("click")}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300"
                  title="Клик"
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => sendRemoteAction("type", { text: "Hello from Jarvis" })}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300"
                  title="Набрать текст"
                >
                  <Type className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => sendRemoteAction("screenshot")}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300"
                  title="Скриншот"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
                <span className="ml-auto text-[9px] font-mono text-zinc-500">
                  {remoteStatus === "ready" ? "Готов" : remoteStatus === "loading" ? "Запуск..." : remoteStatus === "error" ? "Ошибка" : "Не запущен"}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0 bg-zinc-950 relative">
              {mode === "iframe" ? (
                url ? (
                  <iframe
                    ref={iframeRef}
                    src={url}
                    title={title || url}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
                    Введите URL или выберите приложение из Dock
                  </div>
                )
              ) : remoteScreenshot ? (
                <img
                  src={`data:image/png;base64,${remoteScreenshot}`}
                  alt="remote browser"
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                  <MousePointer2 className="h-6 w-6" />
                  <span>Режим удалённого управления. Нажмите «Запустить браузер». ДЖАРВИС сможет нажимать, вводить текст и делать скриншоты.</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
