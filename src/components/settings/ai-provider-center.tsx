"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";

import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import type { ProviderStatus } from "@/services/ai-provider-router.service";
import { CodexSubscriptionCard } from "./codex-subscription-card";

type TestResult = { ok: boolean; code: string; message: string; latencyMs?: number };

const StatusRow = ({ label, providerId, isConfigured, subtext, testing, result, onTest }: {
  label: string;
  providerId: string;
  isConfigured: boolean;
  subtext?: string;
  testing: boolean;
  result?: TestResult;
  onTest: (providerId: string) => void;
}) => (
  <div className="flex items-center justify-between rounded border border-cyan-400/20 bg-zinc-900/60 p-3">
    <div>
      <div className="text-sm font-medium text-zinc-200">{label}</div>
      {subtext && <div className="text-[10px] text-zinc-500">{subtext}</div>}
      {result && <div className={`mt-1 text-[10px] ${result.ok ? "text-lime-400" : "text-amber-300"}`}>
        {result.code}{typeof result.latencyMs === "number" ? ` · ${result.latencyMs}ms` : ""} — {result.message}
      </div>}
    </div>
    <div className="flex items-center gap-2">
      {isConfigured ? (
        <span className="flex items-center text-xs text-lime-400">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Настроен
        </span>
      ) : (
        <span className="flex items-center text-xs text-zinc-500">
          <XCircle className="mr-1 h-3.5 w-3.5" /> Нет ключа
        </span>
      )}
      <button
        type="button"
        data-provider-test={providerId}
        disabled={!isConfigured || testing}
        onClick={() => onTest(providerId)}
        className="ml-2 inline-flex items-center gap-1 rounded border border-cyan-400/30 px-2 py-1 text-[10px] text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlugZap className="h-3 w-3" />}
        Проверить
      </button>
    </div>
  </div>
);

export function AiProviderCenter() {
  const [data, setData] = useState<{
    ok: boolean;
    primaryProvider: string;
    heavyProvider: string;
    providers: ProviderStatus[];
    mockMode: boolean;
  } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    fetch("/api/providers/status")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className="text-cyan-300">Загрузка статуса поставщиков ИИ…</div>;

  const getProv = (name: string) => data.providers.find(p => p.name === name)?.configured ?? false;
  const testConnection = async (providerId: string) => {
    setTesting(providerId);
    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const result = await response.json() as TestResult;
      setResults((current) => ({ ...current, [providerId]: result }));
    } catch {
      setResults((current) => ({
        ...current,
        [providerId]: { ok: false, code: "NETWORK_ERROR", message: "Could not reach the local test endpoint." },
      }));
    } finally {
      setTesting(null);
    }
  };
  const rowProps = (providerId: string) => ({
    providerId,
    isConfigured: getProv(providerId),
    testing: testing === providerId,
    result: results[providerId],
    onTest: testConnection,
  });

  return (
    <SciFiPanel accent="cyan" className="space-y-4 p-5">
      <div>
        <h3 className="font-mono text-sm uppercase text-cyan-400">Статус поставщиков ИИ</h3>
        <p className="text-xs text-zinc-400 mt-1">Ключи настраиваются в .env.local. Здесь показывается только безопасный статус, без секретов.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Основные</div>
          <StatusRow label="OLLAMA CLOUD" {...rowProps("ollama-cloud")} subtext="Роль: быстрые задачи (чат, интерфейс)" />
          <StatusRow label="GLM 5.2" {...rowProps("glm")} subtext="Роль: сложные рассуждения (анализ, патчи)" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Резервные поставщики</div>
          <StatusRow label="OpenRouter" {...rowProps("openrouter")} />
          <StatusRow label="Gemini" {...rowProps("gemini")} />
          <StatusRow label="OpenAI" {...rowProps("openai")} />
          <StatusRow label="Groq" {...rowProps("groq")} />
          <StatusRow label="Cerebras" {...rowProps("cerebras")} />
        </div>
      </div>

      <div className="mt-4 border-t border-cyan-400/20 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Режим без реального ИИ</span>
          <span className={`text-xs font-mono px-2 py-1 rounded ${data.mockMode ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-400"}`}>
            {data.mockMode ? "ИИ НЕ ПОДКЛЮЧЁН" : "ПОДКЛЮЧЁН"}
          </span>
        </div>
      </div>

      <div className="border-t border-violet-400/20 pt-4">
        <CodexSubscriptionCard />
      </div>
    </SciFiPanel>
  );
}
