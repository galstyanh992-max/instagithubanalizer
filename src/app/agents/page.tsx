"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CockpitShell } from "@/components/layout/cockpit-shell";
import { SciFiPanel } from "@/components/ui/sci-fi-panel";
import { Bot, RefreshCw, Plus, AlertCircle, Cpu, Shield, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  department: string;
  status: string;
  riskLevel: string;
  tools: string[];
  enabled: boolean;
  load?: number;
}

const statusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "online":
      return "bg-lime-400/15 text-lime-300 border-lime-400/30";
    case "idle":
      return "bg-cyan-400/10 text-cyan-300 border-cyan-400/25";
    case "busy":
      return "bg-amber-400/15 text-amber-300 border-amber-400/30";
    case "offline":
      return "bg-red-400/10 text-red-300 border-red-400/25";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
};

const riskStyle = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-amber-400";
    case "low":
      return "text-lime-400";
    default:
      return "text-zinc-400";
  }
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
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

  if (loading) {
    return (
      <CockpitShell label="Агенты">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </CockpitShell>
    );
  }

  return (
    <CockpitShell label="Агенты">
      <div className="mx-auto max-w-7xl space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold leading-none neon-text">АГЕНТЫ</h1>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">Управление автономными агентами системы</p>
          </div>
          <div className="flex items-center gap-2">
            {fallback && (
              <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-300">
                <AlertCircle className="mr-1 h-3 w-3" /> Fallback
              </Badge>
            )}
            <Button disabled variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Создать
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-1 h-4 w-4" /> Обновить
            </Button>
          </div>
        </div>

        {agents.length === 0 ? (
          <SciFiPanel accent="amber" className="p-12 text-center">
            <Bot className="mx-auto h-10 w-10 text-amber-300/60" />
            <p className="mt-4 text-zinc-400">Агенты не найдены</p>
            <p className="mt-1 text-[10px] text-zinc-500">Создайте первого агента или обновите список</p>
          </SciFiPanel>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {agents.map((agent) => (
              <SciFiPanel key={agent.id} accent="cyan" className="group relative !min-h-0 !p-2 transition hover:scale-[1.01]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border",
                      agent.enabled ? "border-cyan-400/30 bg-cyan-400/10" : "border-zinc-600/30 bg-zinc-800/50"
                    )}>
                      <Bot className={cn("h-4 w-4", agent.enabled ? "text-cyan-300" : "text-zinc-500")} />
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-bold leading-tight text-cyan-100">{agent.name}</h3>
                      <p className="text-[9px] leading-tight text-zinc-500">{agent.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", agent.enabled ? "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]" : "bg-red-500/60")} />
                    <span className="text-[9px] text-zinc-500">{agent.enabled ? "ON" : "OFF"}</span>
                  </div>
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <div className="glass-panel-subtle rounded-md p-1">
                    <div className="flex items-center gap-1 text-[9px] leading-none text-zinc-500">
                      <Cpu className="h-3 w-3" /> Статус
                    </div>
                    <Badge variant="outline" className={cn("mt-1 h-5 px-1.5 text-[9px]", statusStyle(agent.status))}>
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="glass-panel-subtle rounded-md p-1">
                    <div className="flex items-center gap-1 text-[9px] leading-none text-zinc-500">
                      <Shield className="h-3 w-3" /> Риск
                    </div>
                    <div className={cn("mt-1 text-[10px] font-mono font-bold leading-5", riskStyle(agent.riskLevel))}>
                      {agent.riskLevel}
                    </div>
                  </div>
                </div>

                <div className="mt-1.5">
                  <div className="flex items-center gap-1 text-[9px] leading-none text-zinc-500">
                    <Wrench className="h-3 w-3" /> Инструменты
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <span key={tool} className="rounded border border-cyan-400/15 bg-cyan-400/5 px-1 py-0.5 text-[9px] leading-none text-cyan-200/80">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </SciFiPanel>
            ))}
          </div>
        )}
      </div>
    </CockpitShell>
  );
}
