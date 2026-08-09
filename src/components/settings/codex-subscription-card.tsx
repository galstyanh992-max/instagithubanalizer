"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LogIn, LogOut, Play, RefreshCw, Square } from "lucide-react";

type Status = {
  status: string;
  installed: boolean;
  authenticated: boolean;
  appServerReady: boolean;
  cliVersion?: string;
  message: string;
};

type Model = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: Array<{ reasoningEffort: string; description: string }>;
};

type ProviderEvent = {
  sequence: number;
  type: string;
  threadId?: string;
  turnId?: string;
  textDelta?: string;
  status?: string;
  message?: string;
};

const BASE = "/api/providers/codex-subscription";

export function CodexSubscriptionCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [cwd, setCwd] = useState("D:\\");
  const [prompt, setPrompt] = useState("");
  const [threadId, setThreadId] = useState("");
  const [turnId, setTurnId] = useState("");
  const [events, setEvents] = useState<ProviderEvent[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedModel = useMemo(
    () => models.find((item) => item.id === model || item.model === model),
    [models, model],
  );

  const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${BASE}${path}`, init);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? body.code ?? "Codex provider request failed.");
    return body as T;
  };

  const refresh = async () => {
    setError("");
    try {
      const next = await request<Status>("/status");
      setStatus(next);
      if (next.authenticated) {
        const catalog = await request<{ models: Model[] }>("/models");
        setModels(catalog.models);
        const defaultModel = catalog.models.find((item) => item.isDefault) ?? catalog.models[0];
        if (!model && defaultModel) {
          setModel(defaultModel.id);
          setEffort(defaultModel.defaultReasoningEffort);
        }
      } else {
        setModels([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Codex status.");
    }
  };

  useEffect(() => {
    void refresh();
    // Initial discovery only; explicit refresh controls subsequent process checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!threadId) return;
    const timer = window.setInterval(async () => {
      const after = events.at(-1)?.sequence ?? 0;
      try {
        const result = await request<{ events: ProviderEvent[] }>(
          `/events?threadId=${encodeURIComponent(threadId)}&after=${after}`,
        );
        if (result.events.length) setEvents((current) => [...current, ...result.events].slice(-100));
      } catch {
        // Polling is best-effort; status actions surface failures.
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [threadId, events]);

  const action = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    setError("");
    try {
      await work();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Codex provider action failed.");
    } finally {
      setBusy("");
    }
  };

  const login = () => action("login", async () => {
    setStatus(await request<Status>("/login", { method: "POST" }));
  });

  const logout = () => {
    if (!window.confirm("Sign out of the official Codex CLI on this machine? Other Codex clients may be affected.")) return;
    void action("logout", async () => {
      setStatus(await request<Status>("/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      }));
      setModels([]);
      setThreadId("");
    });
  };

  const health = () => action("health", async () => {
    setStatus(await request<Status>("/health"));
  });

  const startThread = () => action("thread", async () => {
    const result = await request<{ thread: { threadId: string } }>("/threads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "start",
        cwd,
        model: model || undefined,
        reasoningEffort: effort || undefined,
        sandbox: "workspace-write",
      }),
    });
    setThreadId(result.thread.threadId);
    setTurnId("");
    setEvents([]);
  });

  const startTurn = () => action("turn", async () => {
    const result = await request<{ turn: { turnId: string } }>("/turns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, prompt, model: model || undefined, reasoningEffort: effort || undefined }),
    });
    setTurnId(result.turn.turnId);
    setPrompt("");
  });

  const cancel = () => action("cancel", async () => {
    await request("/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, turnId }),
    });
    setTurnId("");
  });

  const output = events.filter((event) => event.textDelta).map((event) => event.textDelta).join("");
  const statusTone = status?.status === "READY"
    ? "text-lime-400 border-lime-400/30 bg-lime-500/10"
    : status?.status === "AUTH_REQUIRED"
      ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
      : "text-cyan-300 border-cyan-400/30 bg-cyan-500/10";

  return (
    <div className="rounded border border-violet-400/25 bg-zinc-950/70 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-mono text-sm uppercase text-violet-300">Codex ChatGPT Subscription</h4>
            {status?.status === "READY" && <CheckCircle2 className="h-4 w-4 text-lime-400" />}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Official local Codex CLI/app-server. Separate from OpenAI API keys.
          </p>
          {status && (
            <div className={`mt-2 inline-flex rounded border px-2 py-1 text-[10px] font-mono ${statusTone}`}>
              {status.status}{status.cliVersion ? ` · ${status.cliVersion}` : ""}
            </div>
          )}
          {status?.message && <p className="mt-2 text-[11px] text-zinc-400">{status.message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Refresh" icon={RefreshCw} busy={busy === "refresh"} onClick={() => void action("refresh", refresh)} />
          {status?.installed && !status.authenticated && <ActionButton label="Sign in" icon={LogIn} busy={busy === "login"} onClick={() => void login()} />}
          {status?.authenticated && <ActionButton label="Health" icon={Play} busy={busy === "health"} onClick={() => void health()} />}
          {status?.authenticated && <ActionButton label="Sign out" icon={LogOut} busy={busy === "logout"} onClick={logout} />}
        </div>
      </div>

      {error && <div className="rounded border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div>}

      {status?.authenticated && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-[10px] uppercase text-zinc-500 md:col-span-1">
              Model
              <select value={model} onChange={(event) => {
                setModel(event.target.value);
                const next = models.find((item) => item.id === event.target.value);
                setEffort(next?.defaultReasoningEffort ?? "");
              }} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-xs normal-case text-zinc-200">
                {models.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[10px] uppercase text-zinc-500">
              Reasoning
              <select value={effort} onChange={(event) => setEffort(event.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-xs normal-case text-zinc-200">
                {(selectedModel?.supportedReasoningEfforts ?? []).map((item) => <option key={item.reasoningEffort} value={item.reasoningEffort}>{item.reasoningEffort}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[10px] uppercase text-zinc-500">
              Repository on D:
              <input value={cwd} onChange={(event) => setCwd(event.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-xs normal-case text-zinc-200" />
            </label>
          </div>

          {!threadId ? (
            <button disabled={busy !== "" || !cwd} onClick={() => void startThread()} className="rounded border border-violet-400/40 px-3 py-2 text-xs text-violet-200 disabled:opacity-40">
              {busy === "thread" ? "Starting…" : "Start repository thread"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="truncate font-mono text-[10px] text-zinc-500">Thread: {threadId}</div>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="Describe the repository task…" className="w-full rounded border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-200" />
              <div className="flex gap-2">
                <ActionButton label="Run turn" icon={Play} busy={busy === "turn"} disabled={!prompt || Boolean(turnId)} onClick={() => void startTurn()} />
                {turnId && <ActionButton label="Cancel" icon={Square} busy={busy === "cancel"} onClick={() => void cancel()} />}
              </div>
              {(output || events.length > 0) && (
                <div className="max-h-64 overflow-auto rounded border border-zinc-800 bg-black/40 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-zinc-300">{output || events.map((event) => event.type).join("\n")}</pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionButton({ label, icon: Icon, busy, disabled, onClick }: {
  label: string;
  icon: typeof RefreshCw;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" disabled={busy || disabled} onClick={onClick} className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1.5 text-[10px] text-zinc-300 disabled:opacity-40">
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}
