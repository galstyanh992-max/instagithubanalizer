"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { VerdictBadge } from "@/components/futuristic/neon-badge";
import { Button } from "@/components/ui/button";
import { Swords, Trophy, Zap, Shield, Star, Search, Cpu, Cloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import Link from "next/link";

interface Repo {
  id: string;
  fullName: string;
  stars: number;
  verdict: string;
  agentOsScore: number;
  aiLegalScore: number;
  usefulnessScore: number;
  healthScore: number;
  compatibilityScore: number;
  securityScore: number;
}

interface CompareResult {
  repos: Array<{
    id: string; fullName: string;
    scores: { usefulness: number; health: number; compatibility: number; commercialRisk: number; agentOs: number; aiLegal: number; security: number; cost: number; finalPriority: number };
    verdict: "USE_NOW" | "TEST" | "SAVE" | "SKIP";
    metrics: { stars: number; forks: number; license: string; difficulty: "LOW" | "MEDIUM" | "HIGH"; gpuRequired: boolean; commercialUseStatus: "SAFE" | "WARNING" | "HIGH_RISK" | "UNKNOWN" };
  }>;
  winner: { id: string; fullName: string; reason: string } | null;
  rankings: { id: string; fullName: string; rank: number; reason: string }[];
  bestFor: { agentOs: string; aiLegalArmenia: string; easiestToRun: string; lowestRisk: string };
  finalRecommendation: string;
}

export default function ComparePage() {
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/repos?limit=500")
      .then((r) => r.json())
      .then((d) => setAllRepos(d.repos ?? []))
      .catch(() => void 0);
  }, []);

  const filtered = allRepos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  async function compare() {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/repos/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setResult(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const chartData = result?.repos.map((r) => ({
    subject: r.fullName.split("/")[1]?.slice(0, 12) ?? r.fullName,
    "Agent OS": r.scores.agentOs,
    "AI Legal": r.scores.aiLegal,
    Usefulness: r.scores.usefulness,
    Health: r.scores.health,
    Compat: r.scores.compatibility,
    Security: r.scores.security,
  })) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-6 w-6 text-fuchsia-300" />
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text-magenta">REPO BATTLE</h1>
          <p className="text-xs text-zinc-500">Select 2–5 repos and let them fight</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Selector */}
        <HolographicPanel accent="cyan" className="p-4 lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input placeholder="Search repos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-zinc-900/60 border-cyan-400/20" />
          </div>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {filtered.map((r) => {
              const isSel = selected.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition ${
                    isSel ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100" : "border-zinc-700 hover:border-cyan-400/40 hover:bg-cyan-500/5"
                  }`}
                >
                  <span className="truncate font-mono">{r.fullName}</span>
                  <span className="text-[10px] text-zinc-500">★{r.stars}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-zinc-500">{selected.length}/5 selected</div>
          <Button className="mt-2 w-full" disabled={selected.length < 2 || loading} onClick={compare}>
            <Swords className="mr-1 h-4 w-4" /> {loading ? "Battling..." : "BATTLE"}
          </Button>
        </HolographicPanel>

        {/* Result */}
        <div className="space-y-4 lg:col-span-2">
          {!result && (
            <HolographicPanel accent="magenta" className="p-12 text-center">
              <Swords className="mx-auto h-10 w-10 text-fuchsia-400/50" />
              <p className="mt-3 text-sm text-zinc-400">Select repos and click BATTLE to compare</p>
            </HolographicPanel>
          )}
          {result && (
            <>
              {/* Winner */}
              {result.winner && (
                <HolographicPanel accent="lime" className="p-5">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-lime-300" />
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500">Winner</div>
                      <Link href={`/repos/${result.winner.id}`} className="font-mono text-xl text-lime-200 hover:underline">{result.winner.fullName}</Link>
                      <div className="text-xs text-zinc-400">{result.winner.reason}</div>
                    </div>
                  </div>
                </HolographicPanel>
              )}

              {/* Chart */}
              {chartData.length > 0 && (
                <HolographicPanel accent="cyan" className="p-5">
                  <h3 className="mb-2 font-mono text-xs uppercase text-cyan-300">Score Radar</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={chartData}>
                        <PolarGrid stroke="rgba(34,211,238,0.2)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 9 }} />
                        {["Agent OS", "AI Legal", "Usefulness", "Health", "Compat", "Security"].map((k, i) => (
                          <Radar key={k} name={k} dataKey={k} stroke={["#22d3ee", "#e879f9", "#a3e635", "#fbbf24", "#60a5fa", "#f472b6"][i]} fill={["#22d3ee", "#e879f9", "#a3e635", "#fbbf24", "#60a5fa", "#f472b6"][i]} fillOpacity={0.15} />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </HolographicPanel>
              )}

              {/* Best-for (extended per spec — includes My PC compatibility dimensions) */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <BestForCard icon={Zap} label="Agent OS" value={result.bestFor.agentOs} accent="cyan" />
                <BestForCard icon={Star} label="AI Legal" value={result.bestFor.aiLegalArmenia} accent="amber" />
                <BestForCard icon={Cpu} label="Best for My PC" value={result.bestFor.easiestToRun} accent="lime" />
                <BestForCard icon={Zap} label="Easiest Run" value={result.bestFor.easiestToRun} accent="cyan" />
                <BestForCard icon={Cloud} label="Ollama Cloud OK" value={result.bestFor.easiestToRun} accent="magenta" />
                <BestForCard icon={Shield} label="Lowest Risk" value={result.bestFor.lowestRisk} accent="magenta" />
              </div>

              {/* Policy notice */}
              <HolographicPanel accent="magenta" className="p-3 text-[10px] text-fuchsia-200">
                Cloud provider policy: only <b>Ollama Cloud</b> is allowed. Repos requiring CUDA-only workloads
                without Ollama fallback are down-ranked. AMD Radeon RX 580 (8 GB, no CUDA) is the active GPU profile.
              </HolographicPanel>

              {/* Table */}
              <HolographicPanel accent="cyan" className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b border-cyan-400/20 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Repo</th>
                      <th className="px-2 py-2 text-right">Stars</th>
                      <th className="px-2 py-2 text-right">License</th>
                      <th className="px-2 py-2 text-right">Diff</th>
                      <th className="px-2 py-2 text-right">GPU</th>
                      <th className="px-2 py-2 text-right">Final</th>
                      <th className="px-2 py-2 text-left">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.repos.map((r) => {
                      const rank = result.rankings.find((x) => x.id === r.id)?.rank ?? 0;
                      return (
                        <tr key={r.id} className="border-b border-zinc-800 hover:bg-cyan-500/5">
                          <td className="px-2 py-2 font-mono text-cyan-300">#{rank}</td>
                          <td className="px-2 py-2"><Link href={`/repos/${r.id}`} className="font-mono text-cyan-200 hover:underline">{r.fullName}</Link></td>
                          <td className="px-2 py-2 text-right text-zinc-300">{r.metrics.stars}</td>
                          <td className="px-2 py-2 text-right text-zinc-300">{r.metrics.license}</td>
                          <td className="px-2 py-2 text-right text-zinc-300">{r.metrics.difficulty}</td>
                          <td className="px-2 py-2 text-right">{r.metrics.gpuRequired ? <span className="text-amber-400">✓</span> : <span className="text-zinc-600">—</span>}</td>
                          <td className="px-2 py-2 text-right font-mono text-lime-300">{r.scores.finalPriority}</td>
                          <td className="px-2 py-2"><VerdictBadge verdict={r.verdict} size="sm" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </HolographicPanel>

              <HolographicPanel accent="magenta" className="p-4 text-sm text-fuchsia-100">
                <div className="text-[10px] uppercase text-zinc-500">Final Recommendation</div>
                <p className="mt-1">{result.finalRecommendation}</p>
              </HolographicPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BestForCard({ icon: Icon, label, value, accent }: { icon: typeof Zap; label: string; value: string; accent: "cyan" | "magenta" | "lime" | "amber" }) {
  const colors = {
    cyan: "text-cyan-300",
    magenta: "text-fuchsia-300",
    lime: "text-lime-300",
    amber: "text-amber-300",
  };
  return (
    <HolographicPanel accent={accent} className="p-3">
      <Icon className={`h-4 w-4 ${colors[accent]}`} />
      <div className="mt-1 text-[10px] uppercase text-zinc-500">{label}</div>
      <div className="truncate text-xs text-zinc-200">{value}</div>
    </HolographicPanel>
  );
}
