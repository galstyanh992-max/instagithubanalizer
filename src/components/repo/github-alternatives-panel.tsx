"use client";

import { useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Star, ExternalLink, Github } from "lucide-react";
import type { GithubAlternativesResult } from "@/lib/types";

export function GithubAlternativesPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<GithubAlternativesResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/alternatives`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData(d.alternatives);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <HolographicPanel accent="amber" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-300">
          <Search className="h-4 w-4" />
          <h2 className="font-mono text-xs uppercase tracking-wider">GitHub Alternatives</h2>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
          Find alternatives
        </Button>
      </div>

      {!data && !loading && (
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4 text-center text-sm text-zinc-400">
          Click <b>Find alternatives</b> to search GitHub for CPU-only / no-CUDA / Ollama-compatible alternatives.
        </div>
      )}

      {data && (
        <>
          <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-2 text-[11px] text-zinc-400">
            {data.note}
            {!data.liveSearchPerformed && (
              <span className="ml-1 text-amber-300">(GITHUB_TOKEN not configured — fallback queries only.)</span>
            )}
          </div>

          {data.alternatives.length > 0 && (
            <div className="space-y-2">
              {data.alternatives.map((a) => (
                <div key={a.fullName} className="rounded border border-amber-400/20 bg-amber-500/5 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={a.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-mono text-amber-200 hover:underline"
                    >
                      <Github className="h-3 w-3" />
                      {a.fullName}
                      <ExternalLink className="ml-1 h-2.5 w-2.5" />
                    </a>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Star className="h-2.5 w-2.5" />
                      {a.stars}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-400">{a.description}</p>
                  <div className="mt-2 text-[10px] text-zinc-500">
                    <div><span className="text-zinc-400">Why better for my PC:</span> {a.whyBetterForMyPc}</div>
                    <div className="mt-0.5"><span className="text-zinc-400">Lang:</span> {a.language} · <span className="text-zinc-400">License:</span> {a.license}</div>
                    <div className="mt-0.5"><span className="text-zinc-400">Est. compat score:</span> <span className="font-mono text-amber-300">{a.estimatedCompatibilityScore}/100</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase text-zinc-500 mb-1">Fallback search queries</div>
            <div className="flex flex-wrap gap-1">
              {data.fallbackQueries.map((q) => (
                <a
                  key={q}
                  href={`https://github.com/search?q=${encodeURIComponent(q)}&type=repositories&s=stars&o=desc`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/20"
                >
                  {q}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </HolographicPanel>
  );
}
