"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, ArrowRight, AlertTriangle } from "lucide-react";

interface Candidate {
  id: string;
  screenshotId: string;
  rawText: string;
  candidateName: string;
  resolvedGithubUrl: string;
  owner: string;
  repo: string;
  confidenceScore: number;
  needsManualReview: boolean;
  status: string;
  createdAt: string;
  screenshot?: { filename: string; filePath: string; extractedText: string };
}

export default function ManualReviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { owner: string; repo: string }>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/screenshots?limit=100");
      const d = await res.json();
      const all: Candidate[] = [];
      for (const s of d.screenshots ?? []) {
        for (const c of s.candidates ?? []) {
          all.push({ ...c, screenshot: { filename: s.filename, filePath: s.filePath, extractedText: s.extractedText } });
        }
      }
      // Show candidates that need manual review first, then unresolved
      const sorted = all.sort((a, b) => {
        if (a.needsManualReview !== b.needsManualReview) return a.needsManualReview ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setCandidates(sorted);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function resolveAgain(candidate: Candidate) {
    const edit = edits[candidate.id] ?? { owner: candidate.owner, repo: candidate.repo };
    setResolving(candidate.id);
    try {
      const res = await fetch("/api/repos/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: edit.owner, repo: edit.repo }),
      });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      toast.success(`Resolved: ${d.fullName} — verdict ${d.verdict}`);
      window.location.href = `/repos/${d.repositoryId}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setResolving(null);
    }
  }

  if (loading) return <div className="text-cyan-300">Loading queue...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">MANUAL REVIEW</h1>
        <p className="text-xs text-zinc-500">{candidates.length} candidates need review</p>
      </div>
      {candidates.length === 0 && (
        <SciFiPanel accent="lime" className="p-12 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-lime-400/50" />
          <p className="mt-2 text-sm text-zinc-400">Queue is empty. Upload screenshots to populate.</p>
        </SciFiPanel>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {candidates.map((c) => (
          <SciFiPanel key={c.id} accent={c.needsManualReview ? "amber" : "cyan"} className="overflow-hidden">
            {c.screenshot && (
              <div className="relative">
                <img src={c.screenshot.filePath} alt={c.screenshot.filename} className="h-32 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-cyan-200">{c.candidateName}</div>
                <div className="text-[10px] text-zinc-500">conf: {Math.round(c.confidenceScore * 100)}%</div>
              </div>
              {c.needsManualReview && (
                <div className="flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 p-1 text-[10px] text-amber-300">
                  <AlertTriangle className="h-3 w-3" /> Low confidence — manual review needed
                </div>
              )}
              {c.screenshot?.extractedText && (
                <div className="max-h-16 overflow-y-auto rounded bg-zinc-900/60 p-2 text-[10px] text-zinc-400">
                  {c.screenshot.extractedText.slice(0, 200)}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="owner"
                  defaultValue={c.owner}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [c.id]: { owner: e.target.value, repo: prev[c.id]?.repo ?? c.repo } }))}
                  className="bg-zinc-900/60 border-cyan-400/20 text-xs"
                />
                <Input
                  placeholder="repo"
                  defaultValue={c.repo}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [c.id]: { owner: prev[c.id]?.owner ?? c.owner, repo: e.target.value } }))}
                  className="bg-zinc-900/60 border-cyan-400/20 text-xs"
                />
              </div>
              <Button
                className="w-full"
                size="sm"
                onClick={() => resolveAgain(c)}
                disabled={resolving === c.id}
              >
                {resolving === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
                RESOLVE & ANALYZE
              </Button>
            </div>
          </SciFiPanel>
        ))}
      </div>
    </div>
  );
}
