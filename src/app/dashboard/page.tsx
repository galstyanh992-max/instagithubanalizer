"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { StatCard } from "@/components/futuristic/stat-card";
import { VerdictBadge } from "@/components/futuristic/neon-badge";
import { JarwisyanAICore } from "@/components/three/JarwisyanAICore";
import {
  FolderGit2, Rocket, FlaskConical, Bookmark, XCircle, Eye,
  ShieldAlert, Cpu,
} from "lucide-react";

interface DashboardData {
  total: number;
  byVerdict: { USE_NOW: number; TEST: number; SAVE: number; SKIP: number };
  watchlist: number;
  risky: number;
  gpuRequired: number;
  top10: Array<{
    id: string; fullName: string; finalPriorityScore: number; verdict: string;
    stars: number; primaryLanguage: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/repos?limit=500")
      .then((r) => r.json())
      .then((d) => {
        const repos = d.repos ?? [];
        const top10 = [...repos]
          .sort((a: { finalPriorityScore: number }, b: { finalPriorityScore: number }) => b.finalPriorityScore - a.finalPriorityScore)
          .slice(0, 10);
        setData({
          total: repos.length,
          byVerdict: {
            USE_NOW: repos.filter((r: { verdict: string }) => r.verdict === "USE_NOW").length,
            TEST: repos.filter((r: { verdict: string }) => r.verdict === "TEST").length,
            SAVE: repos.filter((r: { verdict: string }) => r.verdict === "SAVE").length,
            SKIP: repos.filter((r: { verdict: string }) => r.verdict === "SKIP").length,
          },
          watchlist: repos.filter((r: { isWatchlisted: boolean }) => r.isWatchlisted).length,
          risky: repos.filter((r: { commercialUseStatus: string }) => ["HIGH_RISK", "WARNING"].includes(r.commercialUseStatus)).length,
          gpuRequired: repos.filter((r: { gpuRequired: boolean }) => r.gpuRequired).length,
          top10,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cosmic-page-shell mx-auto flex max-w-2xl items-center justify-center p-6">
        <div className="signal-console w-full p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">Fallback-режим</span>
          </div>
          <h2 className="font-mono text-xl font-bold text-cyan-200">Панель управления</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Панель временно работает в fallback-режиме. Данные пока недоступны.
            Проверьте базу данных, seed или настройки API.
          </p>
          {error && (
            <p className="mt-2 text-[10px] text-zinc-600 font-mono">{error}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-mono uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cosmic-page-shell mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold neon-text">ПАНЕЛЬ</h1>
        <p className="text-xs text-zinc-500">Обзор сетки интеллектуального анализа репозиториев</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Всего репо" value={data.total} icon={FolderGit2} accent="cyan" />
        <StatCard label="Использовать" value={data.byVerdict.USE_NOW} icon={Rocket} accent="lime" />
        <StatCard label="Тест" value={data.byVerdict.TEST} icon={FlaskConical} accent="cyan" />
        <StatCard label="Сохранить" value={data.byVerdict.SAVE} icon={Bookmark} accent="magenta" />
        <StatCard label="Пропустить" value={data.byVerdict.SKIP} icon={XCircle} accent="red" />
        <StatCard label="Избранное" value={data.watchlist} icon={Eye} accent="cyan" />
        <StatCard label="Рисковые" value={data.risky} icon={ShieldAlert} accent="amber" />
        <StatCard label="GPU" value={data.gpuRequired} icon={Cpu} accent="magenta" />
      </div>

      {/* AI Core + Top 10 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[220px]">
            <JarwisyanAICore size="md" active />
          </div>
          <div className="mt-2 text-center">
            <div className="font-mono text-sm text-cyan-300">ЯДРО JARWISYAN</div>
            <div className="text-[10px] text-zinc-500">онлайн</div>
          </div>
        </div>
        <HolographicPanel accent="cyan" className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-cyan-300">Топ-10 по приоритету</h2>
            <Link href="/repos" className="text-[10px] text-zinc-400 hover:text-cyan-300">ВСЕ →</Link>
          </div>
          <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {data.top10.length === 0 && (
              <div className="py-8 text-center text-sm text-zinc-500">Репо пока нет</div>
            )}
            {data.top10.map((r, i) => (
              <Link
                key={r.id}
                href={`/repos/${r.id}`}
                className="group flex items-center gap-3 rounded-md border border-transparent px-2 py-2 hover:border-cyan-400/30 hover:bg-cyan-500/5"
              >
                <div className="font-mono text-xs text-cyan-400 w-6">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm text-zinc-100 group-hover:text-cyan-200">{r.fullName}</div>
                  <div className="text-[10px] text-zinc-500">★ {r.stars} · {r.primaryLanguage || "—"}</div>
                </div>
                <VerdictBadge verdict={r.verdict as "USE_NOW"} size="sm" />
                <div className="font-mono text-sm text-cyan-300">{r.finalPriorityScore}</div>
              </Link>
            ))}
          </div>
        </HolographicPanel>
      </div>

    </div>
  );
}
