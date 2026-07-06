"use client";

import { useEffect, useState, useCallback } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Brain, Plus, Search, Trash2, FolderOpen, Upload, Loader2,
  Shield, AlertTriangle, FileText,
} from "lucide-react";

interface MemoryRecord {
  id: string;
  kind: string;
  title: string;
  content: string;
  source: string;
  projectId: string | null;
  repositoryId: string | null;
  tags: string;
  sensitive: boolean;
  createdAt: string;
}

interface VaultSource {
  id: string;
  name: string;
  type: string;
  localPath: string;
  githubUrl: string;
  syncMode: string;
  active: boolean;
  createdAt: string;
}

const KIND_LABELS: Record<string, string> = {
  project: "Проект",
  repository: "Репозиторий",
  user_preference: "Настройки",
  decision: "Решение",
  integration_plan: "План интеграции",
  error_solution: "Ошибка/решение",
  command: "Команда",
  voice_note: "Голосовая заметка",
  note: "Заметка",
  external_doc: "Внешний документ",
};

export default function MemoryPage() {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [sources, setSources] = useState<VaultSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [kind, setKind] = useState("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("query", search);
      if (kindFilter !== "all") params.set("kind", kindFilter);
      const [memRes, srcRes] = await Promise.all([
        fetch(`/api/memory?${params.toString()}`),
        fetch("/api/memory/sources"),
      ]);
      const memData = await memRes.json();
      const srcData = await srcRes.json();
      setRecords(memData.records ?? []);
      setSources(srcData.sources ?? []);
    } catch {
      toast.error("Не удалось загрузить память");
    } finally {
      setLoading(false);
    }
  }, [search, kindFilter]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!title.trim()) {
      toast.error("Укажите заголовок");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, title, content,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Память сохранена");
      setTitle(""); setContent(""); setTags(""); setKind("note");
      setShowForm(false);
      void load();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить запись из памяти?")) return;
    try {
      await fetch(`/api/memory/${id}`, { method: "DELETE" });
      toast.success("Удалено");
      void load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function removeSource(id: string) {
    if (!confirm("Удалить источник?")) return;
    try {
      await fetch(`/api/memory/sources/${id}`, { method: "DELETE" });
      void load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function connectVault() {
    const name = prompt("Имя источника (например: Мой Obsidian Vault)");
    if (!name) return;
    const type = prompt("Тип: obsidian, logseq, joplin, affine, siyuan, markdown_folder", "markdown_folder");
    if (!type) return;
    const localPath = prompt("Локальный путь к папке (необязательно)", "");
    try {
      await fetch("/api/memory/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, localPath, syncMode: "manual" }),
      });
      toast.success("Источник подключён");
      void load();
    } catch {
      toast.error("Ошибка подключения");
    }
  }

  return (
    <div className="cosmic-page-shell mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text">ПАМЯТЬ ДЖАРВИС</h1>
          <p className="text-xs text-zinc-500">{records.length} записей · {sources.length} источников</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={connectVault}>
            <FolderOpen className="mr-1 h-3 w-3" /> Подключить vault
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-3 w-3" /> Добавить память
          </Button>
        </div>
      </div>

      {/* Search + filter */}
      <HolographicPanel accent="cyan" className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Поиск по памяти..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-zinc-900/60 border-cyan-400/20"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[180px] bg-zinc-900/60 border-cyan-400/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(KIND_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </HolographicPanel>

      {/* Add memory form */}
      {showForm && (
        <HolographicPanel accent="lime" className="space-y-3 p-5">
          <div className="text-sm font-mono uppercase text-lime-300">Новая запись памяти</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Тип</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="bg-zinc-900/60 border-lime-400/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Теги (через запятую)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="agent-os, rag, ocr" className="bg-zinc-900/60 border-lime-400/20" />
            </div>
          </div>
          <div>
            <Label>Заголовок</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок записи" className="bg-zinc-900/60 border-lime-400/20" />
          </div>
          <div>
            <Label>Содержание</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Содержание записи памяти..." className="bg-zinc-900/60 border-lime-400/20" rows={4} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </HolographicPanel>
      )}

      {/* Vault sources */}
      {sources.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Источники памяти</div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-1.5 text-xs">
                <FolderOpen className="h-3 w-3 text-cyan-300" />
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-[10px] text-zinc-500">({s.type})</span>
                <button onClick={() => removeSource(s.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory records */}
      {loading && <div className="text-cyan-300">Загрузка памяти...</div>}

      {!loading && records.length === 0 && (
        <HolographicPanel accent="amber" className="p-12 text-center">
          <Brain className="mx-auto h-10 w-10 text-amber-400/50" />
          <p className="mt-2 text-sm text-zinc-400">Память пуста</p>
          <p className="text-xs text-zinc-500">Нажмите «Добавить память» или подключите vault</p>
        </HolographicPanel>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {records.map((r) => (
          <HolographicPanel key={r.id} accent={r.sensitive ? "magenta" : "cyan"} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {r.sensitive ? <Shield className="h-3.5 w-3.5 text-amber-400" /> : <FileText className="h-3.5 w-3.5 text-cyan-300" />}
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/5 px-2 py-0.5 text-[9px] uppercase text-cyan-300">
                  {KIND_LABELS[r.kind] || r.kind}
                </span>
                {r.sensitive && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400">
                    <AlertTriangle className="h-2.5 w-2.5" /> sensitive
                  </span>
                )}
              </div>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <h3 className="mt-2 text-sm font-medium text-zinc-100">{r.title}</h3>
            <p className="mt-1 line-clamp-3 text-xs text-zinc-400">{r.content}</p>
            <div className="mt-2 flex items-center gap-2 text-[9px] text-zinc-600">
              <span>Источник: {r.source}</span>
              <span>·</span>
              <span>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
          </HolographicPanel>
        ))}
      </div>
    </div>
  );
}
