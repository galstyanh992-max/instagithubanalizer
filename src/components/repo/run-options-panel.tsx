"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, Cloud, Cpu, Container, ListChecks } from "lucide-react";
import type { RunOptionsResult } from "@/lib/types";

export function RunOptionsPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<RunOptionsResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/run-options`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData(d.runOptions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <SciFiPanel accent="lime" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lime-300">
          <Terminal className="h-4 w-4" />
          <h2 className="font-mono text-xs uppercase tracking-wider">Варианты запуска</h2>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ListChecks className="mr-1 h-3 w-3" />}
          Сгенерировать варианты
        </Button>
      </div>

      {!data && !loading && (
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4 text-center text-sm text-zinc-400">
          Нажмите <b>Сгенерировать варианты</b>, чтобы увидеть пути: локально / Docker / только CPU / Ollama Cloud.
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Local */}
          <OptionCard
            icon={Cpu}
            title="Локально"
            accent="cyan"
            possible={data.localOption.possible}
            cost={data.localOption.estimatedCost}
            mode={data.localOption.mode}
            steps={data.localOption.steps}
            limitations={data.localOption.limitations}
          />
          {/* Docker */}
          <OptionCard
            icon={Container}
            title="Docker"
            accent="lime"
            possible={data.dockerOption.possible}
            cost={data.dockerOption.estimatedCost}
            steps={data.dockerOption.steps}
            limitations={data.dockerOption.limitations}
          />
          {/* CPU-only */}
          <OptionCard
            icon={Cpu}
            title="Только CPU"
            accent="amber"
            possible={data.cpuOnlyOption.possible}
            cost={data.cpuOnlyOption.estimatedCost}
            steps={data.cpuOnlyOption.steps}
            limitations={data.cpuOnlyOption.limitations}
            extraLabel={data.cpuOnlyOption.expectedPerformance}
          />
          {/* Ollama Cloud */}
          <OptionCard
            icon={Cloud}
            title="Ollama Cloud"
            accent="magenta"
            possible={data.ollamaCloudOption.possible}
            cost={data.ollamaCloudOption.estimatedCostUsd}
            steps={data.ollamaCloudOption.steps}
            limitations={data.ollamaCloudOption.limitations}
            useCaseFit={data.ollamaCloudOption.useCaseFit}
            pricingStatus={data.ollamaCloudOption.pricingStatus}
            pricingNote={data.ollamaCloudOption.pricingNote}
            linksToCheck={data.ollamaCloudOption.linksToCheck}
          />

          {/* Final recommendation */}
          <div className="rounded-md border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div className="text-[10px] uppercase text-cyan-300">Итоговая рекомендация</div>
            <div className="mt-1">{data.finalRecommendation}</div>
          </div>
        </div>
      )}
    </SciFiPanel>
  );
}

interface OptionCardProps {
  icon: typeof Cloud;
  title: string;
  accent: "cyan" | "magenta" | "lime" | "amber";
  possible: boolean;
  cost: string;
  steps?: string[];
  limitations?: string[];
  mode?: string;
  extraLabel?: string;
  useCaseFit?: string;
  pricingStatus?: string;
  pricingNote?: string;
  linksToCheck?: string[];
}

function OptionCard({ icon: Icon, title, accent, possible, cost, steps, limitations, mode, extraLabel, useCaseFit, pricingStatus, pricingNote, linksToCheck }: OptionCardProps) {
  const accentColor = {
    cyan: "text-cyan-300 border-cyan-400/40 bg-cyan-500/5",
    magenta: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-500/5",
    lime: "text-lime-300 border-lime-400/40 bg-lime-500/5",
    amber: "text-amber-300 border-amber-400/40 bg-amber-500/5",
  }[accent];

  return (
    <div className={`rounded-lg border p-3 ${accentColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-mono text-sm uppercase">{title}</span>
          {mode && <span className="text-[10px] text-zinc-500">· {mode}</span>}
        </div>
        <div className="flex items-center gap-2">
          {possible ? (
            <span className="rounded-full border border-lime-400/60 bg-lime-500/15 px-2 py-0.5 text-[10px] font-mono text-lime-200">ВОЗМОЖНО</span>
          ) : (
            <span className="rounded-full border border-red-400/60 bg-red-500/15 px-2 py-0.5 text-[10px] font-mono text-red-200">НЕВОЗМОЖНО</span>
          )}
          <span className="text-[10px] text-zinc-500">стоимость: {cost}</span>
        </div>
      </div>
      {extraLabel && <div className="mt-1 text-[10px] text-zinc-400">Ожидаемая производительность: {extraLabel}</div>}
      {useCaseFit && <div className="mt-1 text-[10px] text-zinc-400">Соответствие: {useCaseFit}</div>}
      {steps && steps.length > 0 && (
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-900/80 p-2 text-[10px] text-zinc-300">
          {steps.join("\n")}
        </pre>
      )}
      {limitations && limitations.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-400">
          {limitations.map((l, i) => <li key={i}>• {l}</li>)}
        </ul>
      )}
      {pricingStatus && (
        <div className="mt-2 rounded border border-amber-400/30 bg-amber-500/10 p-1.5 text-[10px] text-amber-200">
          Статус ценообразования: <b>{pricingStatus}</b>
          <div className="mt-1 text-amber-300/80">{pricingNote}</div>
        </div>
      )}
      {linksToCheck && linksToCheck.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {linksToCheck.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer" className="rounded border border-fuchsia-400/40 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] text-fuchsia-200 hover:bg-fuchsia-500/20">
              {l.replace(/^https?:\/\//, "")}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
