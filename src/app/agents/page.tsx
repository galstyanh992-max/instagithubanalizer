"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data.agents || []);
        setFallback(data.fallbackUsed || false);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-cyan-400 animate-pulse">Загрузка агентов...</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Агенты</h2>
        <div className="flex items-center space-x-2">
          {fallback && <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">Fallback режим</span>}
          <Button disabled variant="outline" className="border-cyan-400/50 text-cyan-400 bg-transparent hover:bg-cyan-950/30">Создать агента</Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="border-cyan-400/50 text-cyan-400 bg-transparent hover:bg-cyan-950/30">Обновить</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {agents.map(agent => (
          <div key={agent.id} className="p-4 rounded-xl border border-cyan-400/20 bg-zinc-950/50 relative overflow-hidden backdrop-blur-xl">
            <h3 className="font-bold text-lg text-cyan-100">{agent.name}</h3>
            <p className="text-sm text-zinc-400">Отдел: {agent.department}</p>
            <p className="text-sm text-zinc-400">Статус: <span className="text-cyan-400">{agent.status}</span></p>
            <p className="text-sm text-zinc-400">Риск: {agent.riskLevel}</p>
            <div className="mt-2 text-xs text-zinc-500">
              Инструменты: {agent.tools.join(", ")}
            </div>
            <div className="absolute top-2 right-2 flex items-center">
              <span className={`h-2 w-2 rounded-full ${agent.enabled ? "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]" : "bg-red-500"} animate-pulse`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
