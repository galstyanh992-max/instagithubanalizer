"use client";

import { useState, useEffect } from "react";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SandboxPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/repos/${repoId}/sandbox-test-plan`, { method: "POST" });
      const d = await r.json();
      setData(d.plan);
    } finally { setLoading(false); }
  };
  return (
    <HolographicPanel accent="cyan" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-cyan-300">Sandbox Test Plan</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Создать план
        </Button>
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
          <div className="text-[10px] text-zinc-500">{String(data.notes)}</div>
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Создать план».</div>}
    </HolographicPanel>
  );
}

export function PatchPlanPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}); }, []);
  const run = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/repos/${repoId}/generate-patch-plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const d = await r.json();
      setData(d.plan);
    } finally { setLoading(false); }
  };
  return (
    <HolographicPanel accent="lime" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-lime-300">Integration Patch Plan</h2>
        <Button size="sm" onClick={run} disabled={!projectId || loading}>{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Сгенерировать"}</Button>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          <div className="rounded border border-lime-400/20 bg-lime-500/5 p-3"><div className="font-mono text-sm text-lime-200">{String(data.summary)}</div></div>
          {Array.isArray(data.implementationSteps) && (
            <div><div className="text-[10px] uppercase text-cyan-300">Шаги</div><ul className="mt-1 space-y-0.5 text-zinc-300">{(data.implementationSteps as string[]).map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ul></div>
          )}
          {Array.isArray(data.risks) && (
            <div><div className="text-[10px] uppercase text-red-300">Риски</div><ul className="mt-1 space-y-0.5 text-red-200">{(data.risks as string[]).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
          )}
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Выберите проект.</div>}
    </HolographicPanel>
  );
}

export function RiskGatePanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/risk-gate`, { method: "POST" }); const d = await r.json(); setData(d.riskGate); } finally { setLoading(false); } };
  const level = data?.riskLevel as string;
  return (
    <HolographicPanel accent={level === "HIGH" ? "magenta" : "lime"} className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-cyan-300">Risk Gate</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>{loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Проверить</Button>
      </div>
      {data && (
        <div className="space-y-3 text-xs">
          <div className={`rounded-lg border p-3 ${level === "HIGH" ? "border-red-400/40 bg-red-500/10" : "border-lime-400/40 bg-lime-500/10"}`}>
            <span className={`font-mono text-lg ${level === "HIGH" ? "text-red-300" : "text-lime-300"}`}>{level}</span>
            <span className="ml-3">{data.allowed ? "✓ Разрешено" : "✗ Заблокировано"}</span>
            <p className="mt-2 text-zinc-300">{String(data.recommendation)}</p>
          </div>
        </div>
      )}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Проверить».</div>}
    </HolographicPanel>
  );
}

export function HealthPanel({ repoId }: { repoId: string }) {
  const [snapshots, setSnapshots] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/repos/${repoId}/health-timeline`).then(r => r.json()).then(d => setSnapshots(d.timeline ?? [])).finally(() => setLoading(false));
  }, [repoId]);
  return (
    <HolographicPanel accent="cyan" className="space-y-4 p-5">
      <h2 className="font-mono text-xs uppercase text-cyan-300">Health Timeline</h2>
      {loading ? <div className="text-cyan-300">Загрузка...</div> : snapshots.length === 0 ? <div className="text-sm text-zinc-500">Нет снимков</div> : (
        <div className="space-y-1.5">
          {snapshots.map((s, i) => (
            <div key={i} className="flex gap-3 rounded border border-zinc-800/60 bg-zinc-900/40 p-2 text-[10px]">
              <span className="text-cyan-300">★ {String(s.stars)}</span>
              <span className="text-fuchsia-300">⑂ {String(s.forks)}</span>
              <span className="text-zinc-500">{new Date(String(s.checkedAt)).toLocaleDateString("ru-RU")}</span>
            </div>
          ))}
        </div>
      )}
    </HolographicPanel>
  );
}

export function CommunityPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { const r = await fetch(`/api/repos/${repoId}/community-signals`, { method: "POST" }); const d = await r.json(); setData(d.signals); } finally { setLoading(false); } };
  return (
    <HolographicPanel accent="magenta" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase text-fuchsia-300">Community Signals</h2>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>{loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Загрузить</Button>
      </div>
      {data && <div className="text-xs"><div className="text-cyan-300">Поддержка: {String(data.maintenanceSignal)}</div></div>}
      {!data && !loading && <div className="text-sm text-zinc-500">Нажмите «Загрузить».</div>}
    </HolographicPanel>
  );
}
