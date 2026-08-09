"use client";
import { SciFiPanel, SciFiRing, SciFiBadge } from "@/components/ui/sci-fi-panel";


import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Star, GitFork, Eye, EyeOff, RefreshCw, FileText,
  Volume2, Swords, Download, Github, Terminal, ShieldCheck,
  AlertTriangle, Lightbulb, Cpu, DollarSign, BookOpen, FlaskConical,
  Cloud, Search, Loader2,
} from "lucide-react";
import { MyPcCompatibilityPanel } from "@/components/repo/my-pc-compatibility-panel";
import { RunOptionsPanel } from "@/components/repo/run-options-panel";
import { GithubAlternativesPanel } from "@/components/repo/github-alternatives-panel";
import { OllamaCloudOptionsPanel } from "@/components/repo/ollama-cloud-options-panel";
import { IntegrationPlanPanel } from "@/components/projects/integration-plan-panel";

import { GithubTabs } from "@/components/ui/github-tabs";

interface RepoDetail {
  repo: {
    id: string;
    owner: string;
    name: string;
    fullName: string;
    githubUrl: string;
    description: string;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    license: string;
    primaryLanguage: string;
    topics: string;
    archived: boolean;
    disabled: boolean;
    defaultBranch: string;
    readmeText: string;
    hasDocker: boolean;
    hasDockerCompose: boolean;
    hasPackageJson: boolean;
    hasRequirements: boolean;
    hasPyproject: boolean;
    hasEnvExample: boolean;
    localRunPossible: boolean;
    gpuRequired: boolean;
    difficulty: string;
    usefulnessScore: number;
    healthScore: number;
    compatibilityScore: number;
    commercialRiskScore: number;
    agentOsScore: number;
    aiLegalScore: number;
    securityScore: number;
    costScore: number;
    finalPriorityScore: number;
    verdict: string;
    securityStatus: string;
    securityNotes: string;
    commercialUseStatus: string;
    commercialNotes: string;
    costNotes: string;
    isWatchlisted: boolean;
    lastCheckedAt: string | null;
    analyses: Array<{
      id: string;
      summary: string;
      problemSolved: string;
      usefulness: string;
      projectFit: string;
      extractedIdeas: string;
      risks: string;
      testPlan: string;
      localRunPlan: string;
      securityReview: string;
      commercialReview: string;
      costReview: string;
      finalRecommendation: string;
      mock: boolean;
      createdAt: string;
    }>;
    installPlans: Array<{
      id: string;
      prerequisites: string;
      dockerCommands: string;
      manualCommands: string;
      envVars: string;
      verificationSteps: string;
      commonErrors: string;
      cleanupSteps: string;
      mock: boolean;
      createdAt: string;
    }>;
  };
}

function safeParse<T = unknown>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RepoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${id}`);
      if (!res.ok) throw new Error("Not found");
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function reanalyze() {
    toast.info("Повторный анализ…");
    try {
      const res = await fetch(`/api/repos/${id}/reanalyze`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      toast.success(`Вердикт: ${d.verdict} (${d.finalPriorityScore})`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function toggleWatch() {
    if (!data) return;
    const method = data.repo.isWatchlisted ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/repos/${id}/watch`, { method });
      if (!res.ok) throw new Error("Failed");
      toast.success(data.repo.isWatchlisted ? "Удалено из вотчлиста" : "Добавлено в вотчлист");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function generateInstallPlan() {
    setGeneratingPlan(true);
    try {
      const res = await fetch(`/api/repos/${id}/install-plan`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("План установки сгенерирован");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setGeneratingPlan(false);
    }
  }

  function speakSummary() {
    if (!data) return;
    const a = data.repo.analyses[0];
    if (!a) {
      toast.error("Нет анализа для озвучки");
      return;
    }
    const text = `${data.repo.fullName}. Вердикт: ${data.repo.verdict}. ${a.summary} ${a.finalRecommendation}`;
    // Use Edge TTS via /api/tts (female voice ru-RU-DarinaNeural)
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'ru-RU-DarinaNeural' }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`TTS error: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        return audio.play();
      })
      .catch((err) => {
        console.warn('[speak] Edge TTS failed, fallback to browser TTS:', err);
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1; u.pitch = 1;
        u.lang = "ru-RU";
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      });
  }

  function exportReport() {
    window.open(`/api/export/markdown`, "_blank");
  }

  if (loading) return <div className="mx-auto max-w-6xl text-cyan-300">Загрузка...</div>;
  if (error || !data) return (
    <div className="mx-auto max-w-6xl">
      <SciFiPanel accent="magenta" className="p-6 text-red-300">{error || "Ошибка загрузки"}</SciFiPanel>
    </div>
  );

  const r = data.repo;
  const a = r.analyses[0];
  const plan = r.installPlans[0];
  const topics = safeParse<string[]>(r.topics, []);
  const ideas = a ? safeParse<string[]>(a.extractedIdeas, []) : [];
  const testPlan = a ? safeParse<{ fifteenMinutes: string[]; thirtyMinutes: string[]; sixtyMinutes: string[] }>(a.testPlan, { fifteenMinutes: [], thirtyMinutes: [], sixtyMinutes: [] }) : null;
  const secNotes = safeParse<string[]>(r.securityNotes, []);
  const risks = a ? safeParse<string[]>(a.risks, []) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <GithubTabs />
      <div className="mb-2">
        <Link href="/repos" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-300">
          <ArrowLeft className="h-3 w-3" /> НАЗАД К РЕПОЗИТОРИЯМ
        </Link>
      </div>

      {/* Header */}
      <SciFiPanel accent="cyan" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-cyan-200">{r.fullName}</h1>
              <SciFiBadge verdict={r.verdict as "USE_NOW"} />
            </div>
            <p className="mt-2 text-sm text-zinc-400">{r.description || "(нет описания)"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <a href={r.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-300 hover:underline">
                <Github className="h-3 w-3" /> GitHub
              </a>
              <span className="flex items-center gap-1"><Star className="h-3 w-3" />{r.stars}</span>
              <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{r.forks}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{r.watchers}</span>
              <span>Лицензия: {r.license}</span>
              <span>Язык: {r.primaryLanguage || "—"}</span>
              {r.gpuRequired && <span className="text-amber-400">Требуется GPU</span>}
              {r.archived && <span className="text-red-400">Архивный</span>}
            </div>
            {topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {topics.slice(0, 10).map((t) => (
                  <span key={t} className="rounded-full border border-cyan-400/20 bg-cyan-500/5 px-2 py-0.5 text-[10px] text-cyan-300">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={reanalyze}>
              <RefreshCw className="mr-1 h-3 w-3" /> Повторить анализ
            </Button>
            <Button size="sm" variant="outline" onClick={generateInstallPlan} disabled={generatingPlan}>
              <Terminal className="mr-1 h-3 w-3" /> {generatingPlan ? "Подготовка…" : "План установки"}
            </Button>
            <Button size="sm" variant="outline" onClick={toggleWatch}>
              {r.isWatchlisted ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
              {r.isWatchlisted ? "Не следить" : "Следить"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/compare")}>
              <Swords className="mr-1 h-3 w-3" /> Сравнить
            </Button>
            <Button size="sm" variant="outline" onClick={speakSummary}>
              <Volume2 className="mr-1 h-3 w-3" /> Озвучить
            </Button>
            <Button size="sm" variant="outline" onClick={exportReport}>
              <Download className="mr-1 h-3 w-3" /> Экспорт
            </Button>
          </div>
        </div>
      </SciFiPanel>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.usefulnessScore} label="Польза" size={70} color="#22d3ee" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.healthScore} label="Здоровье" size={70} color="#a3e635" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.compatibilityScore} label="Совмест." size={70} color="#e879f9" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.agentOsScore} label="AgentOS" size={70} color="#22d3ee" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.aiLegalScore} label="AI-legal" size={70} color="#fbbf24" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.securityScore} label="Безопасн." size={70} color="#a3e635" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.costScore} label="Стоим." size={70} color="#e879f9" />
        </SciFiPanel>
        <SciFiPanel accent="cyan" className="flex flex-col items-center p-3">
          <SciFiRing value={r.commercialRiskScore} label="Риск" size={70} color="#f87171" />
        </SciFiPanel>
        <SciFiPanel accent="lime" className="flex flex-col items-center justify-center p-3">
          <div className="font-mono text-3xl text-lime-300">{r.finalPriorityScore}</div>
          <div className="text-[10px] uppercase text-zinc-500">Итог</div>
        </SciFiPanel>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900/60 p-1.5">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="integration">Интеграция</TabsTrigger>
          <TabsTrigger value="sandbox">Песочница</TabsTrigger>
          <TabsTrigger value="patch">План патча</TabsTrigger>
          <TabsTrigger value="risk">Риск-гейт</TabsTrigger>
          <TabsTrigger value="health">Здоровье</TabsTrigger>
          <TabsTrigger value="community">Сообщество</TabsTrigger>
          <TabsTrigger value="compat">Совместимость с ПК</TabsTrigger>
          <TabsTrigger value="run-options">Варианты запуска</TabsTrigger>
          <TabsTrigger value="ollama-cloud">Облако Ollama</TabsTrigger>
          <TabsTrigger value="alternatives">Альтернативы</TabsTrigger>
          <TabsTrigger value="analysis">Анализ</TabsTrigger>
          <TabsTrigger value="install">Установка</TabsTrigger>
          <TabsTrigger value="test">Тест-план</TabsTrigger>
          <TabsTrigger value="ideas">Идеи</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="cost">Стоимость</TabsTrigger>
          <TabsTrigger value="readme">Документация</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SciFiPanel accent="cyan" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300">
              <FileText className="h-4 w-4" />
              <h2 className="font-mono text-xs uppercase">Обзор</h2>
            </div>
            <div className="rounded-md border border-cyan-400/25 bg-cyan-500/5 p-3 text-sm leading-relaxed text-cyan-100">
              <b>Простое объяснение:</b> это репозиторий {r.fullName}. Я сразу проверил его структуру: {r.hasDocker ? "есть Docker" : "Docker не найден"}, {r.hasPackageJson ? "есть Node.js-конфигурация" : "Node.js-конфигурация не найдена"}, {r.hasRequirements || r.hasPyproject ? "есть Python-конфигурация" : "Python-конфигурация не найдена"}. Далее откройте «Варианты запуска», чтобы увидеть самый подходящий способ запуска на вашем ПК.
            </div>
            {a ? (
              <>
                <p className="text-sm text-zinc-300">{a.summary}</p>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500">Решаемая проблема</div>
                  <p className="text-sm text-zinc-400">{a.problemSolved}</p>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500">Итоговая рекомендация</div>
                  <p className="text-sm text-cyan-200">{a.finalRecommendation}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Подробный анализ ещё не готов. Нажмите «Повторить анализ».</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <div><span className="text-zinc-500">Docker:</span> {r.hasDocker ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Docker Compose:</span> {r.hasDockerCompose ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Конфигурация Node.js:</span> {r.hasPackageJson ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Зависимости Python:</span> {r.hasRequirements ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Проект Python:</span> {r.hasPyproject ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">.env.example:</span> {r.hasEnvExample ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Сложность:</span> {r.difficulty}</div>
              <div><span className="text-zinc-500">Локальный запуск:</span> {r.localRunPossible ? "✓" : "—"}</div>
              <div><span className="text-zinc-500">Требуется GPU:</span> {r.gpuRequired ? <span className="text-amber-300">✓</span> : "—"}</div>
              <div><span className="text-zinc-500">Риск CUDA:</span> {r.gpuRequired ? <span className="text-red-300">ВЫСОКИЙ (AMD GPU, нет CUDA)</span> : <span className="text-lime-300">нет</span>}</div>
            </div>
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="sandbox">
          <SandboxPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="patch">
          <PatchPlanPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskGatePanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="health">
          <HealthPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="compat">
          <MyPcCompatibilityPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="integration">
          <IntegrationPlanPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="run-options">
          <RunOptionsPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="ollama-cloud">
          <OllamaCloudOptionsPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="alternatives">
          <GithubAlternativesPanel repoId={r.id} />
        </TabsContent>

        <TabsContent value="analysis">
          <SciFiPanel accent="cyan" className="p-5">
            {a ? (
              <div className="space-y-3 text-sm text-zinc-300">
                <div><span className="text-zinc-500">Польза:</span> {a.usefulness || a.summary}</div>
                <div>
                  <span className="text-zinc-500">Соответствие проекту:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-zinc-900/60 p-2 text-[10px]">{a.projectFit}</pre>
                </div>
                <div><span className="text-zinc-500">Локальный запуск:</span> {a.localRunPlan}</div>
                <div><span className="text-zinc-500">Коммерческий обзор:</span> {a.commercialReview}</div>
                <div><span className="text-zinc-500">Стоимость:</span> {a.costReview}</div>
              </div>
            ) : <p className="text-sm text-zinc-500">Анализ ещё не выполнен.</p>}
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="install">
          <SciFiPanel accent="lime" className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lime-300">
                <Terminal className="h-4 w-4" />
                <h2 className="font-mono text-xs uppercase">План установки</h2>
              </div>
              {!plan && (
                <Button size="sm" variant="outline" onClick={generateInstallPlan} disabled={generatingPlan}>
                  Сгенерировать
                </Button>
              )}
            </div>
            {plan ? (
              <InstallPlanView raw={plan} />
            ) : (
              <p className="text-sm text-zinc-500">План установки ещё не создан. Нажмите Сгенерировать.</p>
            )}
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="test">
          <SciFiPanel accent="cyan" className="p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <FlaskConical className="h-4 w-4" />
              <h2 className="font-mono text-xs uppercase">Тест-план</h2>
            </div>
            {testPlan ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-lime-300">15 минут</div>
                  <ul className="mt-1 space-y-1 text-xs text-zinc-300">
                    {testPlan.fifteenMinutes.map((s, i) => <li key={i} className="flex gap-1"><span className="text-zinc-600">{i + 1}.</span> {s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-cyan-300">30 минут</div>
                  <ul className="mt-1 space-y-1 text-xs text-zinc-300">
                    {testPlan.thirtyMinutes.map((s, i) => <li key={i} className="flex gap-1"><span className="text-zinc-600">{i + 1}.</span> {s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-fuchsia-300">60 минут</div>
                  <ul className="mt-1 space-y-1 text-xs text-zinc-300">
                    {testPlan.sixtyMinutes.map((s, i) => <li key={i} className="flex gap-1"><span className="text-zinc-600">{i + 1}.</span> {s}</li>)}
                  </ul>
                </div>
              </div>
            ) : <p className="text-sm text-zinc-500">Тест-план ещё не создан.</p>}
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="ideas">
          <SciFiPanel accent="magenta" className="p-5">
            <div className="mb-3 flex items-center gap-2 text-fuchsia-300">
              <Lightbulb className="h-4 w-4" />
              <h2 className="font-mono text-xs uppercase">Извлечённые идеи</h2>
            </div>
            {ideas.length > 0 ? (
              <ul className="space-y-2 text-sm text-zinc-300">
                {ideas.map((idea, i) => (
                  <li key={i} className="flex gap-2 rounded border border-fuchsia-400/20 bg-fuchsia-500/5 p-2">
                    <span className="font-mono text-fuchsia-400">{String(i + 1).padStart(2, "0")}</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-zinc-500">Идеи не извлечены.</p>}
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="security">
          <SciFiPanel accent={r.securityStatus === "RISK" ? "magenta" : "lime"} className="p-5">
            <div className="mb-3 flex items-center gap-2">
              {r.securityStatus === "SAFE" ? <ShieldCheck className="h-4 w-4 text-lime-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
              <h2 className="font-mono text-xs uppercase">Скан безопасности</h2>
              <span className="ml-auto"><SciFiBadge status={r.securityStatus === "SAFE" ? "SAFE" : r.securityStatus === "REVIEW" ? "WARNING" : "HIGH_RISK"} /></span>
            </div>
            <ul className="space-y-1 text-sm text-zinc-300">
              {secNotes.length > 0 ? secNotes.map((n, i) => <li key={i} className="flex gap-2">• {n}</li>) : <li className="text-zinc-500">Нет заметок по безопасности.</li>}
            </ul>
            {risks.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase text-zinc-500">Риски</div>
                <ul className="space-y-1 text-xs text-zinc-400">
                  {risks.map((r2, i) => <li key={i}>• {r2}</li>)}
                </ul>
              </div>
            )}
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="cost">
          <SciFiPanel accent="amber" className="p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <DollarSign className="h-4 w-4" />
              <h2 className="font-mono text-xs uppercase">Стоимость и риски</h2>
            </div>
            <p className="text-sm text-zinc-300">{r.costNotes || "Анализ стоимости не проведён."}</p>
            <div className="mt-3 text-xs">
              <span className="text-zinc-500">Коммерческое использование:</span> <SciFiBadge status={r.commercialUseStatus as "SAFE"} />
            </div>
            <div className="mt-2 text-xs text-zinc-400">{r.commercialNotes}</div>
          </SciFiPanel>
        </TabsContent>

        <TabsContent value="readme">
          <SciFiPanel accent="cyan" className="p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <BookOpen className="h-4 w-4" />
              <h2 className="font-mono text-xs uppercase">README (исходник)</h2>
            </div>
            <div className="max-h-96 overflow-y-auto rounded bg-zinc-900/60 p-3">
              <pre className="whitespace-pre-wrap text-[11px] text-zinc-300">{r.readmeText || "(readme не загружен)"}</pre>
            </div>
          </SciFiPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InstallPlanView({ raw }: { raw: RepoDetail["repo"]["installPlans"][number] }) {
  const p = {
    prerequisites: safeParse<string[]>(raw.prerequisites, []),
    dockerCommands: safeParse<string[]>(raw.dockerCommands, []),
    manualCommands: safeParse<string[]>(raw.manualCommands, []),
    envVars: safeParse<Array<{ key: string; description: string; required: boolean }>>(raw.envVars, []),
    verificationSteps: safeParse<string[]>(raw.verificationSteps, []),
    commonErrors: safeParse<string[]>(raw.commonErrors, []),
    cleanupSteps: safeParse<string[]>(raw.cleanupSteps, []),
  };
  return (
    <div className="space-y-4 text-sm">
      <Section title="Требования" items={p.prerequisites} />
      {p.dockerCommands.length > 0 && (
        <div>
          <div className="text-xs text-lime-300">Команды Docker</div>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-900/80 p-3 text-[11px] text-lime-200">{p.dockerCommands.join("\n")}</pre>
        </div>
      )}
      {p.manualCommands.length > 0 && (
        <div>
          <div className="text-xs text-cyan-300">Ручные команды</div>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-900/80 p-3 text-[11px] text-cyan-200">{p.manualCommands.join("\n")}</pre>
        </div>
      )}
      {p.envVars.length > 0 && (
        <div>
          <div className="text-xs text-fuchsia-300">Переменные окружения</div>
          <div className="mt-1 space-y-1">
            {p.envVars.map((e, i) => (
              <div key={i} className="rounded border border-fuchsia-400/20 bg-fuchsia-500/5 p-2 text-xs">
                <span className="font-mono text-fuchsia-300">{e.key}</span>
                {e.required && <span className="ml-1 text-[10px] text-amber-400">required</span>}
                <div className="text-zinc-400">{e.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Section title="Проверка" items={p.verificationSteps} />
      <Section title="Частые ошибки" items={p.commonErrors} />
      <Section title="Очистка" items={p.cleanupSteps} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  const titleRu: Record<string, string> = {
    Prerequisites: "Требования",
    "Docker commands": "Команды Docker",
    "Manual commands": "Ручные команды",
    "Env vars": "Переменные окружения",
    Verification: "Проверка",
    "Common errors": "Частые ошибки",
    Cleanup: "Очистка",
  };
  return (
    <div>
      <div className="text-xs text-cyan-300">{titleRu[title] ?? title}</div>
      <ul className="mt-1 space-y-1 text-xs text-zinc-300">
        {items.map((s, i) => <li key={i} className="flex gap-1"><span className="text-zinc-600">{i + 1}.</span> {s}</li>)}
      </ul>
    </div>
  );
}

// === Sandbox Panel ===
function SandboxPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/sandbox-test-plan`, { method: "POST" }); const d = await r.json(); setData(d.plan); } finally { setLoading(false); } };
  return (
    <SciFiPanel accent="cyan" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-cyan-300">План безопасного теста</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}><Loader2 className={loading ? "mr-1 h-3 w-3 animate-spin" : "hidden"} /> Создать план</Button>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          <div className="flex gap-4">
            <span className="text-zinc-400">Режим:</span><span className="font-mono text-cyan-300">{String(data.recommendedMode)}</span>
            <span className="text-zinc-400">Безопасно:</span><span className={data.canTestSafely ? "text-lime-300" : "text-red-300"}>{String(data.canTestSafely)}</span>
          </div>
          {Array.isArray(data.commands) && data.commands.length > 0 && (
            <div><div className="text-[10px] uppercase text-zinc-500">Команды</div><pre className="mt-1 overflow-x-auto rounded bg-zinc-900/80 p-2 text-[10px] text-cyan-200">{(data.commands as string[]).join("\n")}</pre></div>
          )}
          {Array.isArray(data.risks) && data.risks.length > 0 && (
            <div><div className="text-[10px] uppercase text-amber-300">Риски</div><ul className="mt-1 space-y-0.5 text-amber-200">{(data.risks as string[]).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
          )}
          {Array.isArray(data.verificationSteps) && data.verificationSteps.length > 0 && (
            <div><div className="text-[10px] uppercase text-zinc-500">Проверка</div><ul className="mt-1 space-y-0.5 text-zinc-300">{(data.verificationSteps as string[]).map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
          )}
          <div className="text-[10px] text-zinc-500">{String(data.notes)}</div>
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Создать план» для генерации sandbox test plan.</div>}
    </SciFiPanel>
  );
}

// === Patch Plan Panel ===
function PatchPlanPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => void 0); }, []);
  const run = async () => { if (!projectId) return; setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/generate-patch-plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }); const d = await r.json(); setData(d.plan); } finally { setLoading(false); } };
  return (
    <SciFiPanel accent="lime" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-lime-300">План внедрения изменений</h2>
        <div className="flex gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[180px] bg-zinc-900/60 border-lime-400/20"><SelectValue placeholder="Проект" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={run} disabled={!projectId || loading}>{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Сгенерировать"}</Button>
        </div>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          <div className="rounded border border-lime-400/20 bg-lime-500/5 p-3"><div className="font-mono text-sm text-lime-200">{String(data.summary)}</div></div>
          {Array.isArray(data.filesToCreate) && data.filesToCreate.length > 0 && <ListSection title="Файлы для создания" items={data.filesToCreate as string[]} accent="cyan" />}
          {Array.isArray(data.filesToModify) && data.filesToModify.length > 0 && <ListSection title="Файлы для изменения" items={data.filesToModify as string[]} accent="lime" />}
          {Array.isArray(data.dependenciesToAdd) && data.dependenciesToAdd.length > 0 && <ListSection title="Зависимости" items={data.dependenciesToAdd as string[]} accent="amber" />}
          {Array.isArray(data.implementationSteps) && data.implementationSteps.length > 0 && <ListSection title="Шаги" items={data.implementationSteps as string[]} accent="cyan" numbered />}
          {Array.isArray(data.rollbackPlan) && data.rollbackPlan.length > 0 && <ListSection title="Откат" items={data.rollbackPlan as string[]} accent="red" />}
          {Array.isArray(data.risks) && data.risks.length > 0 && <ListSection title="Риски" items={data.risks as string[]} accent="red" />}
          <div className="rounded border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-100"><div className="text-[10px] uppercase text-cyan-300">Рекомендация</div><div className="mt-1">{String(data.finalRecommendation)}</div></div>
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Выберите проект и нажмите «Сгенерировать».</div>}
    </SciFiPanel>
  );
}

// === Risk Gate Panel ===
function RiskGatePanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/risk-gate`, { method: "POST" }); const d = await r.json(); setData(d.riskGate); } finally { setLoading(false); } };
  const level = data?.riskLevel as string;
  const accent = level === "HIGH" ? "magenta" : level === "MEDIUM" ? "amber" : "lime";
  return (
    <SciFiPanel accent={accent as "lime"} className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-cyan-300">Проверка рисков</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}><Loader2 className={loading ? "mr-1 h-3 w-3 animate-spin" : "hidden"} /> Проверить</Button>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          <div className={`rounded-lg border p-3 ${level === "HIGH" ? "border-red-400/40 bg-red-500/10" : level === "MEDIUM" ? "border-amber-400/40 bg-amber-500/10" : "border-lime-400/40 bg-lime-500/10"}`}>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-lg ${level === "HIGH" ? "text-red-300" : level === "MEDIUM" ? "text-amber-300" : "text-lime-300"}`}>{level}</span>
              <span className={data.allowed ? "text-lime-300" : "text-red-300"}>{data.allowed ? "✓ Разрешено" : "✗ Заблокировано"}</span>
            </div>
            <p className="mt-2 text-zinc-300">{String(data.recommendation)}</p>
          </div>
          {Array.isArray(data.blockingIssues) && data.blockingIssues.length > 0 && <ListSection title="Блокирующие проблемы" items={data.blockingIssues as string[]} accent="red" />}
          {Array.isArray(data.warnings) && data.warnings.length > 0 && <ListSection title="Предупреждения" items={data.warnings as string[]} accent="amber" />}
          {Array.isArray(data.manualChecks) && data.manualChecks.length > 0 && <ListSection title="Ручная проверка" items={data.manualChecks as string[]} accent="cyan" />}
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Проверить» для оценки рисков интеграции.</div>}
    </SciFiPanel>
  );
}

// === Health Panel ===
function HealthPanel({ repoId }: { repoId: string }) {
  const [snapshots, setSnapshots] = useState<Array<Record<string, unknown>>>([]);
  const [trend, setTrend] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const load = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/health-timeline`); const d = await r.json(); setSnapshots(d.timeline ?? []); setTrend(d.trend ?? null); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [repoId]);
  const createSnap = async () => { setCreating(true); try { await fetch(`/api/repos/${repoId}/health-snapshot`, { method: "POST" }); void load(); } finally { setCreating(false); } };
  return (
    <SciFiPanel accent="cyan" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-cyan-300">Динамика состояния</h2>
        <Button size="sm" variant="outline" onClick={createSnap} disabled={creating}>{creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Снимок"}</Button>
      </div>
      {trend && (
        <div className="flex gap-4 text-xs">
          <span className="text-zinc-400">Тренд:</span>
          <span className={trend.direction === "improving" ? "text-lime-300" : trend.direction === "declining" ? "text-red-300" : "text-zinc-300"}>{String(trend.note)}</span>
          {typeof trend.starsDelta === "number" && <span className="text-cyan-300">★ {trend.starsDelta > 0 ? "+" : ""}{trend.starsDelta}</span>}
        </div>
      )}
      {loading ? <div className="text-cyan-300">Загрузка...</div> : snapshots.length === 0 ? <div className="text-sm text-zinc-500">Нет снимков. Нажмите «Снимок».</div> : (
        <div className="max-h-60 space-y-1.5 overflow-y-auto">
          {snapshots.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded border border-zinc-800/60 bg-zinc-900/40 p-2 text-[10px]">
              <span className="text-cyan-300">★ {String(s.stars)}</span>
              <span className="text-fuchsia-300">⑂ {String(s.forks)}</span>
              <span className="text-amber-300">! {String(s.openIssues)}</span>
              <span className="text-zinc-500">{new Date(String(s.checkedAt)).toLocaleDateString("ru-RU")}</span>
            </div>
          ))}
        </div>
      )}
    </SciFiPanel>
  );
}

// === Community Panel ===
function CommunityPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/community-signals`, { method: "POST" }); const d = await r.json(); setData(d.signals); } finally { setLoading(false); } };
  return (
    <SciFiPanel accent="magenta" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-fuchsia-300">Активность сообщества</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}><Loader2 className={loading ? "mr-1 h-3 w-3 animate-spin" : "hidden"} /> Загрузить</Button>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          {Boolean(data.note) && <div className="text-[10px] text-amber-400">{String(data.note)}</div>}
          <div className="flex gap-4">
            <span className="text-zinc-400">Поддержка:</span><span className="text-cyan-300">{String(data.maintenanceSignal)}</span>
            <span className="text-zinc-400">Issues/Stars:</span><span className="text-fuchsia-300">{String(data.openClosedRatio)}</span>
          </div>
          {Array.isArray(data.commonComplaints) && data.commonComplaints.length > 0 && (
            <div><div className="text-[10px] uppercase text-zinc-500">Частые issues</div><ul className="mt-1 space-y-0.5 text-zinc-300">{(data.commonComplaints as string[]).map((c, i) => <li key={i}>• {c}</li>)}</ul></div>
          )}
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Загрузить» для анализа issues и releases.</div>}
    </SciFiPanel>
  );
}

function ListSection({ title, items, accent, numbered }: { title: string; items: string[]; accent: string; numbered?: boolean }) {
  const colors: Record<string, string> = { cyan: "text-cyan-300", lime: "text-lime-300", amber: "text-amber-300", red: "text-red-300", magenta: "text-fuchsia-300" };
  return (
    <div>
      <div className={`text-[10px] uppercase ${colors[accent] ?? "text-zinc-400"}`}>{title}</div>
      <ul className="mt-1 space-y-0.5 text-zinc-300">
        {items.map((s, i) => <li key={i} className="flex gap-1">{numbered ? <span className="text-zinc-600">{i + 1}.</span> : <span className="text-zinc-600">•</span>}<span>{s}</span></li>)}
      </ul>
    </div>
  );
}
