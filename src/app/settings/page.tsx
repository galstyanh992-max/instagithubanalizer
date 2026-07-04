"use client";

import { useEffect, useState } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
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

interface Settings {
  githubToken: string;
  aiProvider: string;
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
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div className="text-cyan-300">Loading...</div>;

  const fallbackActive = !s.githubToken;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold neon-text">SETTINGS</h1>
          <p className="text-xs text-zinc-500">Configure API keys, PC specs, UI and project context</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {fallbackActive && (
        <HolographicPanel accent="amber" className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <div className="text-sm text-amber-100">
            GitHub API key is missing. Some features (live GitHub API) will use mock data.
            Add a GitHub token to unlock full power.
          </div>
        </HolographicPanel>
      )}

      <Tabs defaultValue="keys">
        <TabsList className="flex flex-wrap gap-1 bg-zinc-900/60">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="pc">My PC Profile</TabsTrigger>
          <TabsTrigger value="provider">Cloud Provider</TabsTrigger>
          <TabsTrigger value="ui">UI</TabsTrigger>
          <TabsTrigger value="ctx">Project Context</TabsTrigger>
        </TabsList>

        {/* API keys */}
        <TabsContent value="keys" className="space-y-4">
          <AiProviderCenter />
          
          <HolographicPanel accent="cyan" className="space-y-3 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>GitHub Token</Label>
                <Input type="password" value={s.githubToken === "***" ? "" : s.githubToken} onChange={(e) => update("githubToken", e.target.value)} placeholder="ghp_..." className="bg-zinc-900/60 border-cyan-400/20" />
                <p className="mt-1 text-[10px] text-zinc-500">Required for higher GitHub API rate limits.</p>
              </div>
              <div>
                <Label>OCR Provider</Label>
                <Select value={s.ocrProvider} onValueChange={(v) => update("ocrProvider", v)}>
                  <SelectTrigger className="bg-zinc-900/60 border-cyan-400/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (Tesseract.js)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>TTS Provider</Label>
                <Select value={s.ttsProvider} onValueChange={(v) => update("ttsProvider", v)}>
                  <SelectTrigger className="bg-zinc-900/60 border-cyan-400/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser SpeechSynthesis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>STT Provider</Label>
                <Select value={s.sttProvider} onValueChange={(v) => update("sttProvider", v)}>
                  <SelectTrigger className="bg-zinc-900/60 border-cyan-400/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser SpeechRecognition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </HolographicPanel>
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
          <HolographicPanel accent="magenta" className="space-y-4 p-5">
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
          </HolographicPanel>
        </TabsContent>

        {/* Project context */}
        <TabsContent value="ctx">
          <HolographicPanel accent="amber" className="space-y-3 p-5">
            <p className="text-xs text-zinc-400">Enable the projects you want AI Jarwisyan to optimize scoring for.</p>
            {([
              ["projectAgentOs", "Agent OS"],
              ["projectAiLegal", "AI Legal Armenia"],
              ["projectRagOcr", "RAG / OCR / PDF"],
              ["projectVideo", "AI video / content automation"],
              ["projectSaas", "SaaS / business automation"],
              ["projectTrading", "Trading / broker / finance"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between rounded border border-amber-400/20 bg-zinc-900/60 p-2">
                <span className="text-sm text-zinc-300">{label}</span>
                <div className="flex items-center gap-2">
                  {s[k] && <CheckCircle2 className="h-3 w-3 text-lime-400" />}
                  <Switch checked={s[k]} onCheckedChange={(v) => update(k, v)} />
                </div>
              </label>
            ))}
          </HolographicPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
