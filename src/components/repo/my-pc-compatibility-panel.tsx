"use client";

import { useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { ScoreRing } from "@/components/futuristic/score-ring";
import { Button } from "@/components/ui/button";
import { Cpu, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { CompatibilityResult } from "@/lib/types";

interface Props {
  repoId: string;
  precomputed?: CompatibilityResult | null;
}

const RUN_MODE_LABELS: Record<string, string> = {
  local: "Native local run",
  local_cpu_only: "CPU-only local run",
  local_docker: "Docker (local)",
  local_directml: "DirectML (Windows + AMD GPU)",
  local_rocm_if_available: "ROCm (if available)",
  ollama_cloud: "Ollama Cloud (only allowed cloud)",
  skip_local: "Skip local — no allowed cloud fits",
};

const PERF_LABELS: Record<string, string> = {
  FAST: "Fast — should run smoothly",
  OK: "OK — usable for normal workloads",
  SLOW: "Slow — expect delays",
  VERY_SLOW: "Very slow — evaluation only",
  NOT_RECOMMENDED: "Not recommended for local run",
};

export function MyPcCompatibilityPanel({ repoId, precomputed }: Props) {
  const [data, setData] = useState<CompatibilityResult | null>(precomputed ?? null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/compatibility`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData(d.compatibility);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <HolographicPanel accent="cyan" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-300">
          <Cpu className="h-4 w-4" />
          <h2 className="font-mono text-xs uppercase tracking-wider">My PC Compatibility</h2>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Cpu className="mr-1 h-3 w-3" />}
          Re-check
        </Button>
      </div>

      {!data && !loading && (
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4 text-center text-sm text-zinc-400">
          Click <b>Re-check</b> to compute compatibility against your PC profile.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center">
              <ScoreRing value={data.compatibilityScore} label="Score" size={90} color="#22d3ee" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {data.canRunLocally ? (
                  <CheckCircle2 className="h-4 w-4 text-lime-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-zinc-300">{data.canRunLocally ? "Can run locally" : "Cannot run locally"}</span>
              </div>
              <div className="text-zinc-400">
                <span className="text-zinc-500">Recommended:</span>{" "}
                <span className="font-mono text-cyan-300">{RUN_MODE_LABELS[data.recommendedRunMode] ?? data.recommendedRunMode}</span>
              </div>
              <div className="text-zinc-400">
                <span className="text-zinc-500">Est. performance:</span>{" "}
                <span className="font-mono text-lime-300">{PERF_LABELS[data.estimatedLocalPerformance] ?? data.estimatedLocalPerformance}</span>
              </div>
            </div>
            <div className="col-span-2 space-y-2 text-xs">
              <div className="text-[10px] uppercase text-zinc-500">Bottlenecks</div>
              {data.bottlenecks.length === 0 ? (
                <div className="text-lime-300">No bottlenecks detected.</div>
              ) : (
                <ul className="space-y-1 text-amber-300">
                  {data.bottlenecks.map((b, i) => (
                    <li key={i} className="flex gap-1">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.missingDependencies.length > 0 && (
            <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs">
              <div className="text-[10px] uppercase text-amber-300">Missing dependencies</div>
              <ul className="mt-1 space-y-0.5 text-amber-200">
                {data.missingDependencies.map((m, i) => <li key={i}>• {m}</li>)}
              </ul>
            </div>
          )}

          {data.hardwareRisks.length > 0 && (
            <div className="rounded border border-red-400/30 bg-red-500/10 p-3 text-xs">
              <div className="text-[10px] uppercase text-red-300">Hardware risks</div>
              <ul className="mt-1 space-y-0.5 text-red-200">
                {data.hardwareRisks.map((h, i) => <li key={i}>• {h}</li>)}
              </ul>
            </div>
          )}

          {data.softwareRisks.length > 0 && (
            <div className="rounded border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 text-xs">
              <div className="text-[10px] uppercase text-fuchsia-300">Software risks</div>
              <ul className="mt-1 space-y-0.5 text-fuchsia-200">
                {data.softwareRisks.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs">
            <div className="text-[10px] uppercase text-cyan-300">Provider policy</div>
            <div className="mt-1 text-zinc-300">
              Allowed: <span className="font-mono text-cyan-200">{data.providerPolicy.allowedProviders.join(", ")}</span> ·
              Other providers: <span className="font-mono text-fuchsia-200">disabled</span>
            </div>
          </div>

          <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-3 text-xs text-zinc-300">
            <div className="text-[10px] uppercase text-zinc-500">Explanation</div>
            <div className="mt-1">{data.explanation}</div>
          </div>
        </>
      )}
    </HolographicPanel>
  );
}
