"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

interface CheckItem {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

interface ReadinessResult {
  ready: boolean;
  score: number;
  checks: CheckItem[];
  recommendation: string;
}

export default function DeployPage() {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch("/api/deploy/readiness-check", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setResult(d.result);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cosmic-page-shell mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">ГОТОВНОСТЬ К ДЕПЛОЮ</h1>
        <p className="text-xs text-zinc-500">Проверка готовности проекта к production деплою</p>
      </div>

      <SciFiPanel accent="cyan" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-300">Проверка готовности</div>
            <p className="mt-1 text-xs text-zinc-500">Проверяет package.json, .env, .gitignore, Prisma, API routes и другие критичные файлы</p>
          </div>
          <Button onClick={check} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
            Проверить готовность
          </Button>
        </div>
      </SciFiPanel>

      {result && (
        <>
          <SciFiPanel accent={result.ready ? "lime" : "magenta"} className="p-5">
            <div className="flex items-center gap-3">
              {result.ready ? (
                <CheckCircle2 className="h-8 w-8 text-lime-400" />
              ) : (
                <XCircle className="h-8 w-8 text-red-400" />
              )}
              <div>
                <div className="font-mono text-lg text-zinc-100">
                  {result.ready ? "Готов к деплою" : "Не готов к деплою"}
                </div>
                <div className="text-xs text-zinc-500">Score: {result.score}%</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-300">{result.recommendation}</p>
          </SciFiPanel>

          <SciFiPanel accent="cyan" className="p-4">
            <div className="space-y-2">
              {result.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3">
                  {check.status === "pass" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />}
                  {check.status === "warn" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                  {check.status === "fail" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                  <div>
                    <div className="text-xs font-medium text-zinc-200">{check.name}</div>
                    <div className="text-[10px] text-zinc-500">{check.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </SciFiPanel>
        </>
      )}
    </div>
  );
}
