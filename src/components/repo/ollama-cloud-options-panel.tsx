"use client";

import { useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Loader2, Cloud, ExternalLink, Lock } from "lucide-react";
import type { OllamaCloudOption } from "@/lib/types";

export function OllamaCloudOptionsPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<{ ollamaCloudOption: OllamaCloudOption; pricingNote: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/ollama-cloud-options`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData({ ollamaCloudOption: d.ollamaCloudOption, pricingNote: d.pricingNote });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const opt = data?.ollamaCloudOption;

  return (
    <HolographicPanel accent="magenta" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fuchsia-300">
          <Cloud className="h-4 w-4" />
          <h2 className="font-mono text-xs uppercase tracking-wider">Ollama Cloud Option</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] text-fuchsia-200">
            <Lock className="h-2.5 w-2.5" /> ONLY ALLOWED
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Cloud className="mr-1 h-3 w-3" />}
          Show option
        </Button>
      </div>

      {!opt && !loading && (
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4 text-center text-sm text-zinc-400">
          Click <b>Show option</b> to evaluate Ollama Cloud as a fallback for this repo.
        </div>
      )}

      {opt && (
        <>
          <div className={`rounded-lg border p-3 ${opt.possible ? "border-fuchsia-400/40 bg-fuchsia-500/10" : "border-zinc-700 bg-zinc-900/40"}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-fuchsia-200">{opt.providerName}</span>
              {opt.possible ? (
                <span className="rounded-full border border-lime-400/60 bg-lime-500/15 px-2 py-0.5 text-[10px] font-mono text-lime-200">POSSIBLE</span>
              ) : (
                <span className="rounded-full border border-red-400/60 bg-red-500/15 px-2 py-0.5 text-[10px] font-mono text-red-200">NOT SUITABLE</span>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400">{opt.useCaseFit}</p>
          </div>

          {opt.possible && opt.steps.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-zinc-500">Steps</div>
              <pre className="mt-1 overflow-x-auto rounded bg-zinc-900/80 p-2 text-[10px] text-zinc-300">
                {opt.steps.join("\n")}
              </pre>
            </div>
          )}

          {opt.limitations.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-zinc-500">Limitations</div>
              <ul className="mt-1 space-y-0.5 text-[10px] text-zinc-400">
                {opt.limitations.map((l, i) => <li key={i}>• {l}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs">
            <div className="text-[10px] uppercase text-amber-300">Pricing</div>
            <div className="mt-1 text-amber-200">Status: <b>{opt.pricingStatus}</b></div>
            <div className="mt-1 text-amber-100/80">{opt.pricingNote}</div>
            <div className="mt-1 text-zinc-400">Estimated cost: {opt.estimatedCostUsd}</div>
          </div>

          {opt.linksToCheck.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {opt.linksToCheck.map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
                >
                  <ExternalLink className="h-3 w-3" /> {l.replace(/^https?:\/\//, "")}
                </a>
              ))}
            </div>
          )}

          {!opt.possible && (
            <div className="rounded border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
              No allowed cloud provider is suitable for this repo. Provider policy allows only Ollama Cloud.
              Other providers (RunPod, Vast.ai, AWS, GCP, Azure, etc.) are disabled by policy.
            </div>
          )}
        </>
      )}
    </HolographicPanel>
  );
}
