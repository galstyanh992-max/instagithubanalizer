"use client";

import { useState, useCallback, useEffect } from "react";
import { setJarvisActivityState } from "./use-jarvis-activity";
import { useJarvisStore } from "./jarvis-store";
import { parseJarvisCommand } from "./parse-jarvis-command";
import type { UiAction } from "./use-jarvis-ui-executor";

export type JarvisMediaType = "image" | "video" | "music" | "transcription";

export interface JarvisResult {
  ok: boolean;
  type?: string;
  result?: string;
  url?: string;
  mimeType?: string;
  error?: string;
  task?: {
    type: string;
    intent: string;
    prompt: string;
    model?: string;
    provider?: string;
  };
  uiAction?: UiAction;
  isUiCommand?: boolean;
}

export type VoiceMode = "manual" | "auto";

export interface UseJarvisOptions {
  autoSpeak?: boolean;
  onUiAction?: (action: UiAction) => Promise<{ success: boolean; message: string }>;
  onSpeak?: (text: string) => void;
}

export function useJarvis(opts: UseJarvisOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JarvisResult | null>(null);

  const createChat = useJarvisStore((s) => s.createChat);
  const addMessage = useJarvisStore((s) => s.addMessage);
  const addArchivedFile = useJarvisStore((s) => s.addArchivedFile);

  const ensureChat = useCallback(() => {
    const store = useJarvisStore.getState();
    if (!store.activeChatId || !store.chats.find((c) => c.id === store.activeChatId)) {
      return createChat();
    }
    return store.activeChatId;
  }, [createChat]);

  useEffect(() => {
    setJarvisActivityState(loading, result);
  }, [loading, result]);

  const speakText = useCallback(
    (text: string) => {
      if (opts.onSpeak && text?.trim()) opts.onSpeak(text.trim());
    },
    [opts.onSpeak]
  );

  const ask = useCallback(async (message: string, preferredType?: string): Promise<JarvisResult> => {
    const chatId = ensureChat();
    addMessage(chatId, { role: "user", content: message });
    setLoading(true);
    try {
      // First check for local UI control commands (fast, no network)
      const uiCommand = parseJarvisCommand(message);
      if (uiCommand) {
        let execResult = { success: true, message: uiCommand.confirmation ?? "Выполнено" };
        if (opts.onUiAction) {
          execResult = await opts.onUiAction(uiCommand.action);
        }
        const r: JarvisResult = {
          ok: execResult.success,
          result: execResult.message,
          isUiCommand: true,
          uiAction: uiCommand.action,
        };
        setResult(r);
        addMessage(chatId, {
          role: "assistant",
          content: execResult.message,
          taskType: "ui_command",
        });
        if (opts.autoSpeak) speakText(execResult.message);
        return r;
      }

      const res = await fetch("/api/jarvis/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, preferredType }),
      });
      const data = await res.json();
      const r: JarvisResult = {
        ok: data.ok,
        type: data.task?.type,
        result: data.result,
        url: data.url,
        mimeType: data.mimeType,
        error: data.error,
        task: data.task,
        uiAction: data.uiAction,
        isUiCommand: data.isUiCommand,
      };
      setResult(r);

      // If orchestrator returned a media URL, render it as a media message (with player)
      if (data.ok && data.url && data.mimeType) {
        addMessage(chatId, {
          role: "assistant",
          content: "",
          url: data.url,
          mimeType: data.mimeType,
          taskType: data.task?.type,
          model: data.task?.model,
        });
        addArchivedFile({
          url: data.url,
          key: data.key,
          bucket: data.bucket,
          mimeType: data.mimeType,
          prompt: message,
          type: data.task?.type,
          folder: data.task?.type === "music" ? "music" : undefined,
        });
        if (opts.autoSpeak) speakText("Готово. Медиа доступно в чате и архиве.");
      } else {
        const replyText = data.error ? `Ошибка: ${data.error}` : (data.result ?? "");
        addMessage(chatId, {
          role: data.ok ? "assistant" : "system",
          content: replyText,
          model: data.task?.model,
          taskType: data.task?.type,
          error: data.error,
        });
        if (opts.autoSpeak && data.ok) speakText(replyText);
      }
      return r;
    } catch (e) {
      const err = { ok: false, error: e instanceof Error ? e.message : String(e) };
      setResult(err);
      addMessage(chatId, { role: "system", content: `Ошибка: ${err.error}`, error: err.error });
      return err;
    } finally {
      setLoading(false);
    }
  }, [ensureChat, addMessage, addArchivedFile, opts.onUiAction, opts.autoSpeak, speakText]);

  const generateMedia = useCallback(async (
    type: JarvisMediaType,
    prompt: string,
    file?: File
  ): Promise<JarvisResult> => {
    const chatId = ensureChat();
    addMessage(chatId, { role: "user", content: prompt });
    setLoading(true);
    try {
      let res: Response;
      if (type === "transcription" && file) {
        const form = new FormData();
        form.append("file", file);
        form.append("type", type);
        form.append("prompt", prompt);
        res = await fetch("/api/media/generate", { method: "POST", body: form });
      } else {
        res = await fetch("/api/media/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, prompt }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        const err = { ok: false, error: data.error ?? `HTTP ${res.status}` };
        setResult(err);
        addMessage(chatId, { role: "system", content: `Ошибка: ${err.error}`, error: err.error });
        return err;
      }
      const r: JarvisResult = {
        ok: true,
        type,
        url: data.url,
        mimeType: data.mimeType,
        result: data.url,
      };
      setResult(r);
      addMessage(chatId, {
        role: "assistant",
        content: "",
        url: data.url,
        mimeType: data.mimeType,
        taskType: type,
      });
      if (data.url) {
        addArchivedFile({
          url: data.url,
          key: data.key,
          bucket: data.bucket,
          mimeType: data.mimeType,
          prompt,
          type,
          folder: type === "music" ? "music" : undefined,
        });
      }
      if (opts.autoSpeak) speakText("Готово. Медиа доступно в чате и архиве.");
      return r;
    } catch (e) {
      const err = { ok: false, error: e instanceof Error ? e.message : String(e) };
      setResult(err);
      addMessage(chatId, { role: "system", content: `Ошибка: ${err.error}`, error: err.error });
      return err;
    } finally {
      setLoading(false);
    }
  }, [ensureChat, addMessage, addArchivedFile, opts.autoSpeak, speakText]);

  return { loading, result, ask, generateMedia, clear: () => setResult(null) };
}
