"use client";

import { useState } from "react";
import { BrainCircuit, Network, Play, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";

type GraphifyResponse = { stdout?: string; stderr?: string; message?: string; error?: string };

export default function GraphifyPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("Постройте граф проекта или задайте вопрос о его структуре.");
  const [working, setWorking] = useState(false);
  const [built, setBuilt] = useState(false);

  async function requestGraph(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json() as GraphifyResponse;
    if (!response.ok) throw new Error(data.error || "Graphify не ответил.");
    return data;
  }

  async function buildGraph() {
    setWorking(true);
    setResult("Graphify анализирует кодовую базу JARVIS…");
    try {
      const data = await requestGraph("/api/graphify/analyze");
      setBuilt(true);
      setResult(data.stdout || data.message || "Граф проекта построен.");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Не удалось построить граф.");
    } finally {
      setWorking(false);
    }
  }

  async function askGraph() {
    const text = query.trim();
    if (!text) return;
    setWorking(true);
    setResult("Graphify ищет связи в графе…");
    try {
      const data = await requestGraph("/api/graphify/query", { query: text });
      setResult(data.stdout || data.stderr || "Graphify не нашёл совпадений.");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Не удалось выполнить запрос.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="cosmic-page-shell mx-auto max-w-6xl space-y-6">
      <section className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.28em] text-cyan-300">Память JARVIS</p>
          <h1 className="mt-1 text-center font-mono text-3xl font-bold text-cyan-100 neon-text sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">GRAPHIFY</h1>
          <p className="mt-2 text-center text-sm text-cyan-100/65 sm:absolute sm:left-1/2 sm:top-[calc(50%+0.5cm)] sm:mt-0 sm:-translate-x-1/2">Единая память проекта: структура кода, связи модулей и ответы по графу.</p>
        </div>
        <Button onClick={buildGraph} disabled={working} className="border border-cyan-200/35 bg-cyan-400/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,.22)] hover:bg-cyan-300/25">
          {working ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
          {built ? "Обновить граф" : "Построить граф"}
        </Button>
      </section>

      <SciFiPanel accent="cyan" className="space-y-4 p-5">
        <div className="flex items-center gap-2 font-mono text-sm text-cyan-100"><BrainCircuit className="h-4 w-4 text-cyan-300" /> Запрос к памяти Graphify</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void askGraph(); }}
            placeholder="Например: где используется Graphify и от чего зависит чат?"
            className="border-cyan-300/20 bg-slate-950/55 text-cyan-50 placeholder:text-cyan-100/35"
          />
          <Button onClick={askGraph} disabled={working || !query.trim()} variant="outline" className="border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20">
            <Search className="mr-2 h-4 w-4" /> Найти связи
          </Button>
        </div>
      </SciFiPanel>

      <SciFiPanel accent="lime" className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-cyan-300/15 bg-cyan-400/5 px-5 py-3 font-mono text-xs uppercase tracking-[.18em] text-cyan-200">
          <Play className="h-3.5 w-3.5" /> Результат Graphify
        </div>
        <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-cyan-50/85">{result}</pre>
      </SciFiPanel>
    </main>
  );
}
