"use client";

import { useState, useCallback, useEffect } from "react";
import { setJarvisActivityState } from "./use-jarvis-activity";
import { useJarvisStore } from "./jarvis-store";
import { parseJarvisCommand } from "./parse-jarvis-command";
import { parseRemoteCapabilityCommand } from "./parse-remote-capability-command";
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

// Polls a just-created remote-capability AgentTask (see
// parse-remote-capability-command.ts) through to a terminal state via the
// read-only GET /api/tasks/[id] endpoint. Polling, not Supabase Realtime —
// this mirrors the same polling-fallback pattern already used by the
// dashboard's device-status badge (public/dashboard/live.js), which is
// simpler and sufficient for a single in-flight chat command.
async function pollTaskUntilDone(taskId: string, timeoutMs = 180_000, intervalMs = 1500): Promise<any> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const task = data.task;
      if (task && (task.status === "succeeded" || task.status === "failed")) return task;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Превышено время ожидания выполнения команды на HOME-PC");
}

function summarizeCapabilityResult(resultJson: string | null | undefined): string {
  if (!resultJson) return "Готово.";
  try {
    const parsed = JSON.parse(resultJson);
    const pretty = JSON.stringify(parsed, null, 2);
    return "```json\n" + pretty.slice(0, 4000) + (pretty.length > 4000 ? "\n… (обрезано)" : "") + "\n```";
  } catch {
    return resultJson;
  }
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

  const ask = useCallback(async (
    message: string,
    preferredType?: string,
    files: File[] = [],
    signal?: AbortSignal,
  ): Promise<JarvisResult> => {
    const chatId = ensureChat();
    addMessage(chatId, { role: "user", content: message });
    setLoading(true);
    try {
      // First check for local UI control commands (fast, no network)
      const uiCommand = parseJarvisCommand(message);
      if (uiCommand && files.length === 0) {
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

      // Remote capability commands (real system status / Ollama / filesystem
      // / MCP / browser / n8n on HOME-PC, via the daemon) — a distinct async
      // flow from the local UI commands above: create a real AgentTask
      // targeted at the registered device, then poll it to completion. See
      // src/lib/jarvis/capabilities/envelope.ts and
      // src/daemon/capabilities/** for the real execution chain.
      const remoteCommand = files.length === 0 ? parseRemoteCapabilityCommand(message) : null;
      if (remoteCommand) {
        addMessage(chatId, { role: "assistant", content: remoteCommand.confirmation, taskType: "remote_capability" });
        try {
          const statusRes = await fetch("/api/devices/status", { signal });
          const statusData = await statusRes.json();
          const devices: any[] = statusData.devices || [];
          const device = devices.find((d) => d.status === "ONLINE") ?? devices[0];
          if (!device) throw new Error("Нет зарегистрированных устройств HOME-PC");
          if (device.status !== "ONLINE") throw new Error(`Устройство «${device.name}» сейчас OFFLINE — команда не может быть выполнена`);

          const idempotencyKey = `chat:${device.id}:${remoteCommand.capability}:${remoteCommand.operation}:${Date.now()}`;
          const createRes = await fetch(`/api/devices/${device.id}/commands`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              capability: remoteCommand.capability,
              operation: remoteCommand.operation,
              arguments: remoteCommand.arguments,
              idempotencyKey,
              source: "chat",
            }),
            signal,
          });
          const createData = await createRes.json();
          if (!createRes.ok) throw new Error(createData.error ?? `HTTP ${createRes.status}`);

          const finalTask = await pollTaskUntilDone(createData.task.id);
          const succeeded = finalTask.status === "succeeded";
          const resultText = succeeded
            ? summarizeCapabilityResult(finalTask.result)
            : `Ошибка выполнения на HOME-PC: ${finalTask.result ?? "неизвестная ошибка"}`;

          const r: JarvisResult = { ok: succeeded, result: resultText };
          setResult(r);
          addMessage(chatId, {
            role: succeeded ? "assistant" : "system",
            content: resultText,
            taskType: "remote_capability",
            error: succeeded ? undefined : resultText,
          });
          if (opts.autoSpeak && succeeded) speakText("Готово. Результат в чате.");
          return r;
        } catch (e) {
          const err = { ok: false, error: e instanceof Error ? e.message : String(e) };
          setResult(err);
          addMessage(chatId, { role: "system", content: `Ошибка: ${err.error}`, error: err.error });
          return err;
        } finally {
          setLoading(false);
        }
      }

      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        const upload = await fetch("/api/chat/attachments", { method: "POST", body: form, signal });
        const uploadData = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(uploadData.error ?? `Upload failed (${upload.status})`);
        attachmentIds = (uploadData.attachments ?? []).map((attachment: { id: string }) => attachment.id);
      }
      const res = await fetch("/api/jarvis/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, preferredType, attachmentIds }),
        signal,
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

      // Execute a server-emitted UI action (e.g. navigate to a page). The
      // orchestrator decides the action; the client performs it.
      if (data.uiAction && opts.onUiAction) {
        try {
          await opts.onUiAction(data.uiAction as UiAction);
        } catch {
          // UI action failures must not break the chat flow.
        }
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
