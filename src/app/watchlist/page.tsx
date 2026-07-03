"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RefreshCw, Star, GitFork, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface WatchedRepo {
  id: string;
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastCheckedAt: string | null;
  watchlistSnapshots: Array<{
    id: string;
    starsDelta: number;
    forksDelta: number;
    issuesDelta: number;
    newReleaseDetected: boolean;
    lastCommitDelta: string;
    breakingChangesNote: string;
    capturedAt: string;
  }>;
}

export default function WatchlistPage() {
  const [repos, setRepos] = useState<WatchedRepo[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/repos?limit=500");
      const d = await res.json();
      setRepos((d.repos ?? []).filter((r: { isWatchlisted: boolean }) => r.isWatchlisted));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch(`/api/repos/${id}/watch`, { method: "DELETE" });
    toast.success("Removed");
    load();
  }
  async function refresh(id: string) {
    toast.info("Re-analyzing...");
    await fetch(`/api/repos/${id}/reanalyze`, { method: "POST" });
    toast.success("Refreshed");
    load();
  }

  if (loading) return <div className="text-cyan-300">Loading watchlist...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">WATCHLIST</h1>
        <p className="text-xs text-zinc-500">{repos.length} repos being tracked</p>
      </div>
      {repos.length === 0 && (
        <HolographicPanel accent="amber" className="p-12 text-center">
          <EyeOff className="mx-auto h-10 w-10 text-amber-400/50" />
          <p className="mt-2 text-sm text-zinc-400">No watched repos yet. Open any repo and click Watch.</p>
        </HolographicPanel>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {repos.map((r) => {
          const lastSnap = r.watchlistSnapshots[0];
          return (
            <HolographicPanel key={r.id} accent="magenta" className="p-4">
              <div className="flex items-start justify-between">
                <Link href={`/repos/${r.id}`} className="font-mono text-sm text-fuchsia-200 hover:underline">{r.fullName}</Link>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => refresh(r.id)}><RefreshCw className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><EyeOff className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded border border-cyan-400/20 bg-cyan-500/5 p-2">
                  <div className="text-[10px] text-zinc-500">Stars</div>
                  <div className="flex items-center gap-1 font-mono text-cyan-300">
                    <Star className="h-3 w-3" /> {r.stars}
                  </div>
                </div>
                <div className="rounded border border-fuchsia-400/20 bg-fuchsia-500/5 p-2">
                  <div className="text-[10px] text-zinc-500">Forks</div>
                  <div className="flex items-center gap-1 font-mono text-fuchsia-300">
                    <GitFork className="h-3 w-3" /> {r.forks}
                  </div>
                </div>
                <div className="rounded border border-amber-400/20 bg-amber-500/5 p-2">
                  <div className="text-[10px] text-zinc-500">Issues</div>
                  <div className="font-mono text-amber-300">{r.openIssues}</div>
                </div>
              </div>
              {lastSnap && (
                <div className="mt-3 space-y-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    {lastSnap.starsDelta >= 0 ? <TrendingUp className="h-3 w-3 text-lime-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                    <span className="text-zinc-400">Stars delta:</span>
                    <span className={lastSnap.starsDelta >= 0 ? "text-lime-300" : "text-red-300"}>{lastSnap.starsDelta >= 0 ? "+" : ""}{lastSnap.starsDelta}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Forks delta:</span>
                    <span className={lastSnap.forksDelta >= 0 ? "text-lime-300" : "text-red-300"}>{lastSnap.forksDelta >= 0 ? "+" : ""}{lastSnap.forksDelta}</span>
                  </div>
                  {lastSnap.newReleaseDetected && (
                    <div className="flex items-center gap-1 text-amber-300"><AlertCircle className="h-3 w-3" /> New release detected</div>
                  )}
                  {lastSnap.breakingChangesNote && (
                    <div className="rounded border border-red-400/30 bg-red-500/10 p-1 text-red-300">{lastSnap.breakingChangesNote}</div>
                  )}
                </div>
              )}
              <div className="mt-2 text-[10px] text-zinc-600">
                Last checked: {r.lastCheckedAt ? new Date(r.lastCheckedAt).toLocaleString() : "—"}
              </div>
            </HolographicPanel>
          );
        })}
      </div>
    </div>
  );
}
