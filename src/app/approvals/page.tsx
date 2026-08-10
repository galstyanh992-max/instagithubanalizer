"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useJarvisRealtime } from "@/hooks/use-jarvis-realtime";

// Fallback interval if the Realtime channel is ever unavailable/dropped —
// approvals are decision-critical, so this page must never depend solely on
// a live socket to eventually show current state.
const POLL_MS = 20_000;

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchApprovalsRef = useRef<() => void>(() => {});

  const fetchApprovals = () => {
    setLoading(true);
    fetch("/api/approvals")
      .then((res) => res.json())
      .then((data) => {
        setApprovals(data.approvals || []);
        setFallback(data.fallbackUsed || false);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  // Refs must only be written outside of render (react-hooks/refs) -- keep
  // the ref current via an effect with no dependency array (runs after
  // every render) so the interval/Realtime callbacks below never close over
  // a stale fetchApprovals.
  useEffect(() => {
    fetchApprovalsRef.current = fetchApprovals;
  });

  useEffect(() => {
    fetchApprovalsRef.current();
    const id = setInterval(() => fetchApprovalsRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Immediate refetch the moment an approval is created or decided
  // elsewhere (another tab, the daemon) — see
  // src/lib/jarvis/realtime/broadcast.ts. The interval above remains the
  // fallback if this channel is ever unavailable.
  useJarvisRealtime({
    events: ["approval.created", "approval.decided"],
    onEvent: () => fetchApprovalsRef.current(),
  });

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      fetchApprovals();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading && approvals.length === 0) return <div className="p-8 text-cyan-400 animate-pulse">Загрузка подтверждений...</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Подтверждения</h2>
        <div className="flex items-center space-x-2">
          {fallback && <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">Fallback режим</span>}
          <Button variant="outline" onClick={fetchApprovals} className="border-cyan-400/50 text-cyan-400 bg-transparent hover:bg-cyan-950/30">Обновить</Button>
        </div>
      </div>
      <div className="space-y-4 mt-4">
        {approvals.length === 0 && !loading && (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            Нет активных запросов на подтверждение.
          </div>
        )}
        {approvals.map(approval => (
          <div key={approval.id} className={`p-4 rounded-xl border ${approval.status === "pending" ? "border-amber-500/40 bg-zinc-950/80" : "border-cyan-400/20 bg-zinc-950/40"} relative overflow-hidden backdrop-blur-xl flex flex-col gap-3`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-cyan-100">{approval.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{approval.description}</p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-mono uppercase tracking-wider ${approval.riskLevel === 'HIGH' || approval.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-amber-500/20 text-amber-500 border border-amber-500/50'}`}>
                РИСК: {approval.riskLevel}
              </div>
            </div>
            <div className="bg-black/50 p-3 rounded font-mono text-xs text-zinc-300 border border-zinc-800/80">
              <span className="text-cyan-500">Tool:</span> {approval.toolName}<br/>
              {approval.command && <><span className="text-cyan-500">Command:</span> {approval.command}</>}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-zinc-600">Создано: {new Date(approval.createdAt).toLocaleString("ru-RU")}</span>
              
              {approval.status === "pending" ? (
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => handleAction(approval.id, "reject")} className="h-8 text-xs px-4 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800">
                    Отклонить
                  </Button>
                  <Button onClick={() => handleAction(approval.id, "approve")} className="h-8 text-xs px-4 bg-lime-950 hover:bg-lime-900 text-lime-200 border border-lime-800">
                    Разрешить
                  </Button>
                </div>
              ) : (
                <span className={`text-sm ${approval.status === 'approved' ? 'text-lime-500' : 'text-red-500'}`}>
                  {approval.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
