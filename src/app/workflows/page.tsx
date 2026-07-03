"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows")
      .then((res) => res.json())
      .then((data) => {
        setWorkflows(data.workflows || []);
        setFallback(data.fallbackUsed || false);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-cyan-400 animate-pulse">Загрузка процессов...</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Процессы</h2>
        <div className="flex items-center space-x-2">
          {fallback && <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">Fallback режим</span>}
          <Button disabled variant="outline" className="border-cyan-400/50 text-cyan-400 bg-transparent hover:bg-cyan-950/30">Запустить процесс</Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="border-cyan-400/50 text-cyan-400 bg-transparent hover:bg-cyan-950/30">Обновить</Button>
        </div>
      </div>
      <div className="space-y-4 mt-4">
        {workflows.map(wf => (
          <div key={wf.id} className="p-4 rounded-xl border border-cyan-400/20 bg-zinc-950/50 relative overflow-hidden backdrop-blur-xl flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <h3 className="font-bold text-lg text-cyan-100">{wf.name}</h3>
              <p className="text-sm text-zinc-400">Статус: <span className="text-cyan-400">{wf.status}</span></p>
              <div className="mt-2 text-xs text-zinc-500">
                Шаги: {wf.steps.join(" ➔ ")}
              </div>
            </div>
            <div className="w-full md:w-64">
              <div className="flex justify-between text-xs mb-1 text-cyan-200">
                <span>Прогресс</span>
                <span>{wf.progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-2 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${wf.progress}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
