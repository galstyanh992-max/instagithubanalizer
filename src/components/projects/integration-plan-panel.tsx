"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wrench, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface IntegrationPlan {
  title: string;
  summary: string;
  usefulParts: string[];
  filesToInspect: string[];
  reusableComponents: string[];
  apiPatterns: string[];
  agentWorkflowIdeas: string[];
  databasePatterns: string[];
  uiUxIdeas: string[];
  requiredDeps: string[];
  compatibilityConcerns: string[];
  risks: string[];
  implementationSteps: string[];
  doNotIntegrate: string[];
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  finalRecommendation: string;
  mock: boolean;
}

export function IntegrationPlanPanel({ repoId }: { repoId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [plan, setPlan] = useState<IntegrationPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
      })
      .catch(() => void 0);
  }, []);

  async function generate() {
    if (!selectedProject) return;
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/integration-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectedProjectId: selectedProject }),
      });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setPlan(d.plan);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (projects.length === 0) {
    return (
      <SciFiPanel accent="amber" className="p-5 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-400/60" />
        <p className="mt-2 text-sm text-zinc-300">Нет подключённых проектов</p>
        <p className="text-xs text-zinc-500">
          Перейдите на <a href="/projects" className="text-cyan-300 underline">/projects</a>, чтобы подключить проект для плана интеграции.
        </p>
      </SciFiPanel>
    );
  }

  return (
    <SciFiPanel accent="lime" className="space-y-4 p-5">
      <div className="flex items-center gap-2 text-lime-300">
        <Wrench className="h-4 w-4" />
        <h2 className="font-mono text-xs uppercase tracking-wider">План интеграции с моим проектом</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="bg-zinc-900/60 border-lime-400/20 w-[240px]">
            <SelectValue placeholder="Выберите проект" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={!selectedProject || loading}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wrench className="mr-1 h-4 w-4" />}
          Сгенерировать план
        </Button>
      </div>

      {plan && (
        <div className="space-y-3">

          <div className="rounded-md border border-lime-400/30 bg-lime-500/5 p-3">
            <div className="font-mono text-sm text-lime-200">{plan.title}</div>
            <p className="mt-1 text-xs text-zinc-300">{plan.summary}</p>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-cyan-300" />
            <span className="text-xs text-zinc-400">Оценка трудоёмкости:</span>
            <span className="font-mono text-xs text-cyan-300">{plan.estimatedEffort}</span>
          </div>

          <PlanSection title="Полезные части" items={plan.usefulParts} accent="text-cyan-300" />
          <PlanSection title="Файлы для изучения" items={plan.filesToInspect} accent="text-lime-300" />
          <PlanSection title="Переиспользуемые компоненты" items={plan.reusableComponents} accent="text-cyan-300" />
          <PlanSection title="Паттерны API" items={plan.apiPatterns} accent="text-fuchsia-300" />
          <PlanSection title="Идеи для агентских workflow" items={plan.agentWorkflowIdeas} accent="text-cyan-300" />
          <PlanSection title="Паттерны базы данных" items={plan.databasePatterns} accent="text-lime-300" />
          <PlanSection title="UI/UX идеи" items={plan.uiUxIdeas} accent="text-fuchsia-300" />
          <PlanSection title="Требуемые зависимости" items={plan.requiredDeps} accent="text-amber-300" />
          <PlanSection title="Проблемы совместимости" items={plan.compatibilityConcerns} accent="text-amber-300" />
          <PlanSection title="Риски" items={plan.risks} accent="text-red-300" />
          <PlanSection title="Шаги внедрения" items={plan.implementationSteps} accent="text-cyan-300" numbered />
          <PlanSection title="Не интегрировать" items={plan.doNotIntegrate} accent="text-red-300" />

          <div className="rounded-md border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div className="text-[10px] uppercase text-cyan-300">Финальная рекомендация</div>
            <div className="mt-1">{plan.finalRecommendation}</div>
          </div>
        </div>
      )}
    </SciFiPanel>
  );
}

function PlanSection({
  title,
  items,
  accent,
  numbered = false,
}: {
  title: string;
  items: string[];
  accent: string;
  numbered?: boolean;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className={`text-[10px] uppercase ${accent}`}>{title}</div>
      <ul className="mt-1 space-y-0.5 text-xs text-zinc-300">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1">
            {numbered ? (
              <span className="text-zinc-600">{i + 1}.</span>
            ) : (
              <span className="text-zinc-600">•</span>
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
