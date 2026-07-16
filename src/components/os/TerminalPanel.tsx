"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

type Line = {
  id: number;
  kind: "input" | "stdout" | "stderr" | "error" | "info";
  text: string;
};

const PROMPT = "❯";

function shortCwd(cwd: string): string {
  const home =
    process.env.NEXT_PUBLIC_USER_HOME ||
    (typeof window !== "undefined" && window.navigator.platform.includes("Win")
      ? "C:\\Users"
      : "");
  if (home && cwd.startsWith(home)) return "~" + cwd.slice(home.length);
  return cwd;
}

// Strip ANSI escape sequences for display in a div (we don't render raw ANSI)
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

export function TerminalPanel() {
  const [sessionId] = useState(() =>
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)) as string
  );
  const [cwd, setCwd] = useState<string>("…");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: "info", text: "ДЖАРВИС Terminal — локальный shell (PowerShell/cmd/bash). Esc или клик вне панели — закрыть." },
  ]);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineId = useRef(1);

  // Fetch initial cwd
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/terminal/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, command: "" }),
        });
        const data = await res.json();
        if (!cancelled && data.cwd) setCwd(data.cwd);
      } catch {
        if (!cancelled) setCwd("?");
      }
    })();
    return () => {
      cancelled = true;
      // Best-effort session cleanup
      try {
        fetch(`/api/terminal/exec?sessionId=${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        });
      } catch {}
    };
  }, [sessionId]);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, running]);

  // Focus input when panel mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pushLines = useCallback((newLines: Omit<Line, "id">[]) => {
    setLines((prev) => [
      ...prev,
      ...newLines.map((l) => ({ ...l, id: lineId.current++ })),
    ]);
  }, []);

  const runCommand = useCallback(
    async (raw: string) => {
      const command = raw.trim();
      // Always echo the input line
      pushLines([
        { kind: "input", text: `${shortCwd(cwd)} ${PROMPT} ${raw}` },
      ]);

      if (!command) return;
      setHistory((h) => [...h, command]);
      setHistIdx(-1);
      setRunning(true);

      try {
        const res = await fetch("/api/terminal/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, command }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          pushLines([
            { kind: "error", text: `HTTP ${res.status}: ${errText}` },
          ]);
          return;
        }
        const data = await res.json();
        if (typeof data.cwd === "string") setCwd(data.cwd);
        if (data.stdout) pushLines([{ kind: "stdout", text: stripAnsi(data.stdout) }]);
        if (data.stderr) pushLines([{ kind: "stderr", text: stripAnsi(data.stderr) }]);
        if (typeof data.exitCode === "number" && data.exitCode !== 0 && !data.stderr && !data.stdout) {
          pushLines([{ kind: "error", text: `exit code: ${data.exitCode}` }]);
        }
      } catch (e) {
        pushLines([{ kind: "error", text: `Сетевая ошибка: ${e instanceof Error ? e.message : String(e)}` }]);
      } finally {
        setRunning(false);
        // Re-focus after command
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [cwd, sessionId, pushLines]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (running) return;
      const value = input;
      setInput("");
      void runCommand(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length === 0 || histIdx === -1) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next] ?? "");
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="w-full bg-zinc-950/95 border-t border-cyan-400/30 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex flex-col">
        {/* Output area */}
        <div
          ref={scrollRef}
          className="h-64 lg:h-80 overflow-y-auto custom-scrollbar px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-200"
        >
          {lines.map((l) => (
            <div
              key={l.id}
              className={
                l.kind === "stderr" || l.kind === "error"
                  ? "text-red-400 whitespace-pre-wrap break-all"
                  : l.kind === "input"
                  ? "text-cyan-300 whitespace-pre-wrap break-all"
                  : l.kind === "info"
                  ? "text-zinc-500 italic whitespace-pre-wrap"
                  : "text-zinc-200 whitespace-pre-wrap break-all"
              }
            >
              {l.text}
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-cyan-400/80 mt-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[11px]">выполняется…</span>
            </div>
          )}
        </div>

        {/* Input line */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800/80 bg-zinc-950/80">
          <span className="text-cyan-400 font-mono text-[12px] select-none shrink-0">
            {shortCwd(cwd)} {PROMPT}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={running}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={running ? "выполняется…" : "введите команду и нажмите Enter"}
            className="flex-1 bg-transparent border-0 outline-none font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 caret-cyan-400"
          />
        </div>
      </div>
    </div>
  );
}