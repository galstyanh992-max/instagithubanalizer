"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PcProfileSettings } from "@/components/settings/pc-profile-settings";
import { CloudProviderPolicy } from "@/components/settings/cloud-provider-policy";
import { AiProviderCenter } from "@/components/settings/ai-provider-center";
import { ModelHierarchyPanel } from "@/components/settings/model-hierarchy-panel";
import { ProviderRoutingPanel } from "@/components/settings/provider-routing-panel";

interface Settings {
  githubToken: string;
  vercelToken: string;
  supabaseAccessToken: string;
  supabaseProjectUrl: string;
  supabaseServiceRoleKey: string;
  aiProvider: string;
  providerRoutes: string;
  glmApiKey: string;
  glmBaseUrl: string;
  ocrProvider: string;
  ttsProvider: string;
  sttProvider: string;
  cpu: string;
  ram: string;
  gpu: string;
  vram: string;
  os: string;
  freeDiskGb: number;
  dockerAvailable: boolean;
  pythonVersion: string;
  nodeVersion: string;
  gitAvailable: boolean;
  cudaAvailable: boolean;
  enable3d: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  neonIntensity: number;
  voiceEnabled: boolean;
  autoSpeak: boolean;
  projectAgentOs: boolean;
  projectAiLegal: boolean;
  projectRagOcr: boolean;
  projectVideo: boolean;
  projectSaas: boolean;
  projectTrading: boolean;
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setS(d.settings))
      .catch(() => void 0);
  }, []);

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((prev) => prev ? { ...prev, [k]: v } : prev);
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Настройки сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function testIntegration(provider: "github" | "vercel" | "supabase") {
    setConnectionStatus((current) => ({ ...current, [provider]: "Проверка…" }));
    try {
      const response = await fetch("/api/settings/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = await response.json();
      setConnectionStatus((current) => ({ ...current, [provider]: result.message ?? "Статус неизвестен." }));
    } catch {
      setConnectionStatus((current) => ({ ...current, [provider]: "Не удалось проверить подключение." }));
    }
  }

  if (!s) return <div className="text-cyan-300">Загрузка настроек…</div>;

  const fallbackActive = !s.githubToken;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text">НАСТРОЙКИ</h1>
          <p className="text-xs text-zinc-500">Поставщики ИИ, ключи, компьютер, интерфейс и контекст проектов</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>

      {fallbackActive && (
        <SciFiPanel accent="amber" className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <div className="text-sm text-amber-100">
            Не указан токен GitHub. Часть функций GitHub будет работать с ограничениями. Добавьте токен, чтобы включить полный доступ.
          </div>
        </SciFiPanel>
      )}

      <Tabs defaultValue="keys">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="keys">ИИ и ключи</TabsTrigger>
          <TabsTrigger value="pc">Мой компьютер</TabsTrigger>
          <TabsTrigger value="provider">Облачные поставщики</TabsTrigger>
          <TabsTrigger value="ui">Интерфейс</TabsTrigger>
          <TabsTrigger value="ctx">Контекст проектов</TabsTrigger>
        </TabsList>

        {/* API keys */}
        <TabsContent value="keys" className="space-y-4">
          <ProviderRoutingPanel value={s.providerRoutes} onChange={(value) => update("providerRoutes", value)} />
          <ModelHierarchyPanel />
          <AiProviderCenter />
          
          <SciFiPanel accent="cyan" className="space-y-3 p-5">
            <div>
              <h2 className="font-mono text-sm uppercase text-cyan-300">Подключения платформ</h2>
              <p className="mt-1 text-xs text-zinc-500">Токены хранятся только на сервере и после сохранения отображаются точками. Сначала сохраните, затем проверьте подключение.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <Label>Токен GitHub</Label>
                <Input type="password" value={s.githubToken} onChange={(e) => update("githubToken", e.target.value)} placeholder="ghp_…" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-500">Репозитории, анализ и GitHub API.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void testIntegration("github")}>Проверить</Button>
                </div>
                {connectionStatus.github && <p className="mt-2 text-[11px] text-cyan-300">{connectionStatus.github}</p>}
              </div>
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <Label>Токен Vercel</Label>
                <Input type="password" value={s.vercelToken} onChange={(e) => update("vercelToken", e.target.value)} placeholder="vcp_…" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-500">Проекты и деплои Vercel.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void testIntegration("vercel")}>Проверить</Button>
                </div>
                {connectionStatus.vercel && <p className="mt-2 text-[11px] text-cyan-300">{connectionStatus.vercel}</p>}
              </div>
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <Label>Токен управления Supabase</Label>
                <Input type="password" value={s.supabaseAccessToken} onChange={(e) => update("supabaseAccessToken", e.target.value)} placeholder="sbp_…" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-500">Проверяет доступ к проектам через Management API.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void testIntegration("supabase")}>Проверить</Button>
                </div>
                {connectionStatus.supabase && <p className="mt-2 text-[11px] text-cyan-300">{connectionStatus.supabase}</p>}
              </div>
              <div className="space-y-3 rounded border border-white/10 bg-black/25 p-3">
                <div>
                  <Label>URL проекта Supabase</Label>
                  <Input value={s.supabaseProjectUrl} onChange={(e) => update("supabaseProjectUrl", e.target.value)} placeholder="https://xxxxx.supabase.co" />
                </div>
                <div>
                  <Label>Секретный ключ проекта Supabase (необязательно)</Label>
                  <Input type="password" value={s.supabaseServiceRoleKey} onChange={(e) => update("supabaseServiceRoleKey", e.target.value)} placeholder="Для Storage и серверных операций" />
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Поставщик OCR</Label>
                <Select value={s.ocrProvider} onValueChange={(v) => update("ocrProvider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Локальный (Tesseract.js)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Поставщик озвучивания</Label>
                <Select value={s.ttsProvider} onValueChange={(v) => update("ttsProvider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Голос браузера</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Поставщик распознавания речи</Label>
                <Select value={s.sttProvider} onValueChange={(v) => update("sttProvider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Распознавание речи браузера</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>
          </SciFiPanel>
        </TabsContent>

        {/* My PC profile (expanded) */}
        <TabsContent value="pc">
          <PcProfileSettings />
        </TabsContent>

        {/* Cloud provider policy (Ollama Cloud only) */}
        <TabsContent value="provider">
          <CloudProviderPolicy />
        </TabsContent>

        {/* UI */}
        <TabsContent value="ui">
          <SciFiPanel accent="magenta" className="space-y-4 p-5">
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Enable 3D mode</span>
              <Switch checked={s.enable3d} onCheckedChange={(v) => update("enable3d", v)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Reduce motion</span>
              <Switch checked={s.reduceMotion} onCheckedChange={(v) => update("reduceMotion", v)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Compact mode</span>
              <Switch checked={s.compactMode} onCheckedChange={(v) => update("compactMode", v)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Voice enabled</span>
              <Switch checked={s.voiceEnabled} onCheckedChange={(v) => update("voiceEnabled", v)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Auto-speak AI answers</span>
              <Switch checked={s.autoSpeak} onCheckedChange={(v) => update("autoSpeak", v)} />
            </label>
            <div>
              <Label>Neon intensity: {s.neonIntensity}%</Label>
              <Slider value={[s.neonIntensity]} onValueChange={(v) => update("neonIntensity", v[0])} min={0} max={100} step={5} className="mt-2" />
            </div>
          </SciFiPanel>
        </TabsContent>

        {/* Project context */}
        <TabsContent value="ctx">
          <SciFiPanel accent="amber" className="space-y-3 p-5">
            <p className="text-xs text-zinc-400">Enable the projects you want AI ДЖАРВИС to optimize scoring for.</p>
            {([
              ["projectAgentOs", "Agent OS"],
              ["projectAiLegal", "AI Legal Armenia"],
              ["projectRagOcr", "RAG / OCR / PDF"],
              ["projectVideo", "AI video / content automation"],
              ["projectSaas", "SaaS / business automation"],
              ["projectTrading", "Trading / broker / finance"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between rounded border border-amber-400/20 bg-surface-inset p-2">
                <span className="text-sm text-zinc-300">{label}</span>
                <div className="flex items-center gap-2">
                  {s[k] && <CheckCircle2 className="h-3 w-3 text-lime-400" />}
                  <Switch checked={s[k]} onCheckedChange={(v) => update(k, v)} />
                </div>
              </label>
            ))}
          </SciFiPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
