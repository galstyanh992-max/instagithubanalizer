"use client";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";


import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Cpu, MemoryStick, HardDrive, Save, AlertTriangle } from "lucide-react";
import type { MyPcProfile } from "@/lib/types";
import { MY_PC_PROFILE } from "@/lib/constants";

export function PcProfileSettings() {
  const [profile, setProfile] = useState<MyPcProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/pc-profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.pcProfile))
      .catch(() => void 0);
  }, []);

  function update<K extends keyof MyPcProfile>(k: K, v: MyPcProfile[K]) {
    setProfile((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/pc-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("PC profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <div className="text-cyan-300 text-sm">Loading...</div>;

  return (
    <SciFiPanel accent="lime" className="space-y-4 p-5">
      <div className="flex items-center gap-2 text-lime-300">
        <Cpu className="h-4 w-4" />
        <h2 className="font-mono text-xs uppercase tracking-wider">My PC Profile</h2>
      </div>
      <p className="text-[11px] text-zinc-500">
        Compatibility scoring uses this profile. CUDA-only repos will be flagged because your GPU is AMD Radeon RX 580.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label>Profile name</Label>
          <Input value={profile.profileName} onChange={(e) => update("profileName", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>OS</Label>
          <Input value={profile.os} onChange={(e) => update("os", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>System type</Label>
          <Input value={profile.systemType} onChange={(e) => update("systemType", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>CPU</Label>
          <Input value={profile.cpu} onChange={(e) => update("cpu", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>CPU cores hint</Label>
          <Input value={profile.cpuCoresHint} onChange={(e) => update("cpuCoresHint", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>RAM (GB) <MemoryStick className="inline h-3 w-3" /></Label>
          <Input type="number" value={profile.ramGb} onChange={(e) => update("ramGb", Number(e.target.value))} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>GPU</Label>
          <Input value={profile.gpu} onChange={(e) => update("gpu", e.target.value)} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>VRAM (GB)</Label>
          <Input type="number" value={profile.vramGb} onChange={(e) => update("vramGb", Number(e.target.value))} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>Storage total (GB) <HardDrive className="inline h-3 w-3" /></Label>
          <Input type="number" value={profile.storageTotalGb} onChange={(e) => update("storageTotalGb", Number(e.target.value))} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>Storage used (GB)</Label>
          <Input type="number" value={profile.storageUsedGb} onChange={(e) => update("storageUsedGb", Number(e.target.value))} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>Storage free (GB)</Label>
          <Input type="number" value={profile.storageFreeGb} onChange={(e) => update("storageFreeGb", Number(e.target.value))} className="bg-zinc-900/60 border-lime-400/20" />
        </div>
        <div>
          <Label>Python version</Label>
          <Input
            placeholder="e.g. 3.11"
            value={profile.pythonVersion ?? ""}
            onChange={(e) => update("pythonVersion", e.target.value || null)}
            className="bg-zinc-900/60 border-lime-400/20"
          />
        </div>
        <div>
          <Label>Node.js version</Label>
          <Input
            placeholder="e.g. 20"
            value={profile.nodeVersion ?? ""}
            onChange={(e) => update("nodeVersion", e.target.value || null)}
            className="bg-zinc-900/60 border-lime-400/20"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="flex items-center gap-2 rounded border border-lime-400/20 bg-zinc-900/60 p-2">
          <Switch checked={profile.dockerAvailable ?? false} onCheckedChange={(v) => update("dockerAvailable", v)} />
          <span className="text-xs text-zinc-300">Docker</span>
        </label>
        <label className="flex items-center gap-2 rounded border border-lime-400/20 bg-zinc-900/60 p-2">
          <Switch checked={profile.gitAvailable ?? false} onCheckedChange={(v) => update("gitAvailable", v)} />
          <span className="text-xs text-zinc-300">Git</span>
        </label>
        <label className="flex items-center gap-2 rounded border border-amber-400/20 bg-zinc-900/60 p-2">
          <Switch
            checked={profile.cudaAvailable}
            onCheckedChange={(v) => update("cudaAvailable", v)}
            disabled
          />
          <span className="text-xs text-amber-300 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> CUDA (locked)
          </span>
        </label>
        <label className="flex items-center gap-2 rounded border border-lime-400/20 bg-zinc-900/60 p-2">
          <Switch checked={profile.rocmAvailable ?? false} onCheckedChange={(v) => update("rocmAvailable", v)} />
          <span className="text-xs text-zinc-300">ROCm</span>
        </label>
      </div>
      <div className="text-[11px] text-amber-300/80 rounded border border-amber-400/30 bg-amber-500/10 p-2">
        <AlertTriangle className="inline h-3 w-3 mr-1" />
        CUDA is locked to <b>false</b> — your GPU is AMD Radeon RX 580 2048SP, not NVIDIA.
      </div>
      <div className="flex gap-3">
        <Input value={profile.preferredRunMode} onChange={(e) => update("preferredRunMode", e.target.value)} placeholder="preferred run mode" className="bg-zinc-900/60 border-lime-400/20" />
        <Input value={profile.fallbackRunMode} onChange={(e) => update("fallbackRunMode", e.target.value)} placeholder="fallback run mode" className="bg-zinc-900/60 border-lime-400/20" />
      </div>
      <Button onClick={save} disabled={saving}>
        <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save PC Profile"}
      </Button>
      <div className="text-[10px] text-zinc-600">
        Default profile: {MY_PC_PROFILE.cpu} · {MY_PC_PROFILE.ramGb} GB RAM · {MY_PC_PROFILE.gpu} · {MY_PC_PROFILE.vramGb} GB VRAM
      </div>
    </SciFiPanel>
  );
}
