"use client";
import { SciFiPanel, SciFiBadge } from "@/components/ui/sci-fi-panel";
import { GithubTabs } from "@/components/ui/github-tabs";


import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Grid3x3, List, Box, Star, GitFork, Eye, Cpu, Loader2 } from "lucide-react";
import RepoCube from "@/components/three/repo-cube";
import { RepoImportPanel } from "@/components/repo/repo-import-panel";

interface Repo {
  id: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  verdict: string;
  commercialUseStatus: string;
  primaryLanguage: string;
  finalPriorityScore: number;
  usefulnessScore: number;
  healthScore: number;
  gpuRequired: boolean;
  difficulty: string;
  license: string;
  isWatchlisted: boolean;
}

export default function ReposPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [verdict, setVerdict] = useState(searchParams.get("verdict") ?? "all");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "all");
  const [gpuOnly, setGpuOnly] = useState(searchParams.get("gpu") === "true");
  const [commercialRisk, setCommercialRisk] = useState(searchParams.get("commercialRisk") ?? "all");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "finalPriorityScore");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [cubeMode, setCubeMode] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (verdict !== "all") params.set("verdict", verdict);
        if (difficulty !== "all") params.set("difficulty", difficulty);
        if (gpuOnly) params.set("gpu", "true");
        if (commercialRisk !== "all") params.set("commercialRisk", commercialRisk);
        if (sort) params.set("sort", sort);
        const res = await fetch(`/api/repos?${params.toString()}`);
        if (!res.ok) throw new Error("Failed");
        const d = await res.json();
        setRepos(d.repos);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [search, verdict, difficulty, gpuOnly, commercialRisk, sort]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <GithubTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text">РЕПОЗИТОРИИ</h1>
          <p className="text-xs text-zinc-500">{repos.length} отслеживается</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "grid" ? "list" : "grid")}>
            {view === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
          <Button variant={cubeMode ? "default" : "outline"} size="sm" onClick={() => setCubeMode(!cubeMode)}>
            <Box className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Import panel — Git URL or JSON/JSONL upload */}
      <RepoImportPanel />

      {/* Filters */}
      <SciFiPanel accent="cyan" className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Поиск по имени или описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={verdict} onValueChange={setVerdict}>
            <SelectTrigger><SelectValue placeholder="Вердикт" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все вердикты</SelectItem>
              <SelectItem value="USE_NOW">USE NOW</SelectItem>
              <SelectItem value="TEST">TEST</SelectItem>
              <SelectItem value="SAVE">SAVE</SelectItem>
              <SelectItem value="SKIP">SKIP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Сложность" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сложности</SelectItem>
              <SelectItem value="LOW">LOW</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
            </SelectContent>
          </Select>
          <Select value={commercialRisk} onValueChange={setCommercialRisk}>
            <SelectTrigger><SelectValue placeholder="Риск" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все риски</SelectItem>
              <SelectItem value="SAFE">SAFE</SelectItem>
              <SelectItem value="WARNING">WARNING</SelectItem>
              <SelectItem value="HIGH_RISK">HIGH_RISK</SelectItem>
              <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder="Сортировка" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="finalPriorityScore">Итоговый приоритет</SelectItem>
              <SelectItem value="stars">Звёзды</SelectItem>
              <SelectItem value="usefulnessScore">Польза</SelectItem>
              <SelectItem value="healthScore">Здоровье</SelectItem>
              <SelectItem value="updatedAtGithub">Последнее обновление</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <Switch checked={gpuOnly} onCheckedChange={setGpuOnly} />
            Только с GPU
          </label>
        </div>
      </SciFiPanel>

      {loading && (
        <div className="flex items-center justify-center py-12 text-cyan-300">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загрузка...
        </div>
      )}
      {error && (
        <SciFiPanel accent="magenta" className="p-4 text-red-300">{error}</SciFiPanel>
      )}
      {!loading && repos.length === 0 && (
        <SciFiPanel accent="amber" className="p-12 text-center">
          <p className="text-zinc-400">Нет репозиториев, соответствующих фильтрам.</p>
          <Link href="/upload" className="mt-2 inline-block text-xs text-cyan-300 underline">Анализировать новый репозиторий →</Link>
        </SciFiPanel>
      )}

      {/* Grid */}
      {!loading && repos.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((r) => (
            <Link key={r.id} href={`/repos/${r.id}`}>
              <SciFiPanel accent="cyan" className="h-full p-4 transition hover:scale-[1.02]">
                {cubeMode && (
                  <div className="mb-2 flex justify-center">
                    <RepoCube fullName={r.fullName} />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm text-cyan-200">{r.fullName}</div>
                    <div className="text-[10px] text-zinc-500">{r.primaryLanguage || "—"}</div>
                  </div>
                  <SciFiBadge verdict={r.verdict as "USE_NOW"} size="sm" />
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{r.description || "(нет описания)"}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" />{r.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{r.forks}</span>
                    {r.gpuRequired && <span className="flex items-center gap-1 text-amber-400"><Cpu className="h-3 w-3" />GPU</span>}
                    {r.isWatchlisted && <Eye className="h-3 w-3 text-fuchsia-400" />}
                  </div>
                  <div className="font-mono text-cyan-300">{r.finalPriorityScore}</div>
                </div>
                <div className="mt-2">
                  <SciFiBadge status={r.commercialUseStatus as "SAFE"} />
                </div>
              </SciFiPanel>
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      {!loading && repos.length > 0 && view === "list" && (
        <SciFiPanel accent="cyan" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-cyan-400/20 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Репозиторий</th>
                <th className="px-3 py-2 text-left">Вердикт</th>
                <th className="px-3 py-2 text-right">Звёзды</th>
                <th className="px-3 py-2 text-right">Польза</th>
                <th className="px-3 py-2 text-right">Здоровье</th>
                <th className="px-3 py-2 text-right">Итог</th>
                <th className="px-3 py-2 text-left">Риск</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800 hover:bg-cyan-500/5">
                  <td className="px-3 py-2">
                    <Link href={`/repos/${r.id}`} className="font-mono text-cyan-200 hover:underline">{r.fullName}</Link>
                    <div className="text-[10px] text-zinc-500">{r.primaryLanguage}</div>
                  </td>
                  <td className="px-3 py-2"><SciFiBadge verdict={r.verdict as "USE_NOW"} size="sm" /></td>
                  <td className="px-3 py-2 text-right text-zinc-300">{r.stars}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{r.usefulnessScore}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{r.healthScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-cyan-300">{r.finalPriorityScore}</td>
                  <td className="px-3 py-2"><SciFiBadge status={r.commercialUseStatus as "SAFE"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SciFiPanel>
      )}
    </div>
  );
}
