"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Trash2, Github, FolderOpen, ExternalLink, Loader2, Wrench,
} from "lucide-react";
import Link from "next/link";
import { GithubTabs } from "@/components/ui/github-tabs";

interface ConnectedProject {
  id: string;
  name: string;
  description: string;
  localPath: string;
  githubUrl: string;
  techStack: string[];
  goals: string[];
  active: boolean;
  createdAt: string;
  _count?: { integrationPlans: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ConnectedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [goals, setGoals] = useState("");
  const [saving, setSaving] = useState(false);

  // Autonomous project creation state
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [autoProjectName, setAutoProjectName] = useState("");
  const [autoLocalPath, setAutoLocalPath] = useState("");
  const [creating, setCreating] = useState(false);
  const [infraLogs, setInfraLogs] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setProjects(d.projects ?? []);
    } catch {
      toast.error("Не удалось загрузить проекты");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!name.trim()) {
      toast.error("Укажите имя проекта");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          localPath,
          githubUrl,
          techStack: techStack.split(",").map((t) => t.trim()).filter(Boolean),
          goals: goals.split("\n").map((g) => g.trim()).filter(Boolean),
          active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Проект подключён");
      setName(""); setDescription(""); setLocalPath(""); setGithubUrl(""); setTechStack(""); setGoals("");
      setShowForm(false);
      load();
    } catch {
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить проект?")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.success("Удалено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function createAutonomousProject() {
    if (!autoProjectName.trim()) {
      toast.error("Укажите имя проекта");
      return;
    }
    if (!autoLocalPath.trim()) {
      toast.error("Укажите локальный путь");
      return;
    }
    setCreating(true);
    setInfraLogs([]);
    try {
      const res = await fetch("/api/infra/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: autoProjectName.toLowerCase().replace(/\s+/g, "-"),
          localPath: autoLocalPath,
          idempotencyKey: crypto.randomUUID(),
          dryRun: true,
          providers: ["github", "vercel", "supabase"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      setInfraLogs(data.logs || []);
      toast.success("Инфраструктура создана!");
      
      // A plan is not a created project. Persist only after the approved bootstrap flow.
      if (data.status === "COMPLETED") {
      // Auto-add to database
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: autoProjectName,
          description: "Автономно созданный проект",
          localPath: autoLocalPath,
          githubUrl: data.githubRepo || "",
          techStack: [],
          goals: [],
          active: true,
        }),
      });
      
      toast.success("Проект добавлен в базу данных");
      }
      setAutoProjectName("");
      setAutoLocalPath("");
      setShowAutoForm(false);
      load();
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GithubTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text">МОИ ПРОЕКТЫ</h1>
          <p className="text-xs text-zinc-500">Подключите проекты для integration plans</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAutoForm(!showAutoForm)} variant="outline" className="border-lime-400/40 text-lime-300 hover:bg-lime-500/10">
            <Plus className="mr-1 h-4 w-4" /> Создать с нуля
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" /> Подключить проект
          </Button>
        </div>
      </div>

      {showAutoForm && (
        <SciFiPanel accent="lime" className="space-y-4 p-5">
          <div className="text-sm font-mono uppercase text-lime-300">Автономное создание проекта</div>
          <p className="text-xs text-zinc-400">
            Автоматически создаст GitHub репозиторий, Vercel проект и Supabase базу данных
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Имя проекта *</Label>
              <Input 
                value={autoProjectName} 
                onChange={(e) => setAutoProjectName(e.target.value)} 
                placeholder="My Awesome App" 
                className="bg-zinc-900/60 border-lime-400/20" 
              />
              <p className="text-[10px] text-zinc-500 mt-1">Будет преобразовано в: {autoProjectName.toLowerCase().replace(/\s+/g, "-") || "my-awesome-app"}</p>
            </div>
            <div>
              <Label>Локальный путь *</Label>
              <Input 
                value={autoLocalPath} 
                onChange={(e) => setAutoLocalPath(e.target.value)} 
                placeholder="D:\Projects\my-app" 
                className="bg-zinc-900/60 border-lime-400/20" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createAutonomousProject} disabled={creating} className="bg-lime-500/20 hover:bg-lime-500/30 text-lime-200">
              {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Создать инфраструктуру
            </Button>
            <Button variant="outline" onClick={() => setShowAutoForm(false)}>Отмена</Button>
          </div>
          {infraLogs.length > 0 && (
            <div className="mt-4 rounded border border-lime-400/20 bg-zinc-900/60 p-3">
              <div className="text-xs font-mono text-lime-300 mb-2">Логи создания:</div>
              <div className="text-[10px] text-zinc-400 font-mono space-y-1 max-h-48 overflow-y-auto">
                {infraLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </SciFiPanel>
      )}

      {showForm && (
        <SciFiPanel accent="lime" className="space-y-4 p-5">
          <div className="text-sm font-mono uppercase text-lime-300">Новый проект</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Имя проекта *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent OS" className="bg-zinc-900/60 border-lime-400/20" />
            </div>
            <div>
              <Label>GitHub URL</Label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo" className="bg-zinc-900/60 border-lime-400/20" />
            </div>
            <div className="md:col-span-2">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание проекта" className="bg-zinc-900/60 border-lime-400/20" rows={2} />
            </div>
            <div>
              <Label>Локальный путь</Label>
              <Input value={localPath} onChange={(e) => setLocalPath(e.target.value)} placeholder="/home/user/project" className="bg-zinc-900/60 border-lime-400/20" />
            </div>
            <div>
              <Label>Tech stack (через запятую)</Label>
              <Input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="Next.js, Prisma, Three.js" className="bg-zinc-900/60 border-lime-400/20" />
            </div>
            <div className="md:col-span-2">
              <Label>Цели (по строкам)</Label>
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Build Agent OS&#10;Integrate RAG" className="bg-zinc-900/60 border-lime-400/20" rows={3} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </SciFiPanel>
      )}

      {loading && <div className="text-cyan-300">Загрузка...</div>}

      {!loading && projects.length === 0 && (
        <SciFiPanel accent="amber" className="p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-amber-400/50" />
          <p className="mt-2 text-sm text-zinc-400">Нет подключённых проектов</p>
          <p className="text-xs text-zinc-500">Нажмите «Подключить проект» чтобы добавить первый</p>
        </SciFiPanel>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <SciFiPanel key={p.id} accent="cyan" className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-sm text-cyan-200">{p.name}</h3>
                  {!p.active && <span className="text-[10px] text-zinc-500">(неактивен)</span>}
                </div>
                <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{p.description || "(без описания)"}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {p.techStack.map((t) => (
                <span key={t} className="rounded-full border border-cyan-400/20 bg-cyan-500/5 px-2 py-0.5 text-[10px] text-cyan-300">{t}</span>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-zinc-500">
              {p._count?.integrationPlans ?? 0} integration plans
            </div>
            <div className="mt-3 flex gap-2">
              {p.githubUrl && (
                <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-zinc-600 px-2 py-1 text-[10px] text-zinc-300 hover:border-cyan-400/40">
                  <Github className="h-3 w-3" /> GitHub <ExternalLink className="h-2 w-2" />
                </a>
              )}
              <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-1 rounded border border-lime-400/40 bg-lime-500/10 px-2 py-1 text-[10px] text-lime-200 hover:bg-lime-500/20">
                <Wrench className="h-3 w-3" /> Integration plans →
              </Link>
            </div>
          </SciFiPanel>
        ))}
      </div>
    </div>
  );
}
