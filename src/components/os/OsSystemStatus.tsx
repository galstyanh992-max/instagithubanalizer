"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, Network, Thermometer, Database, Brain, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

type BarProps = {
  label: string;
  value: number;
  color: string;
};

function Bar({ label, value, color }: BarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-zinc-500">{label}</span>
        <span className="text-cyan-100">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
        <div className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const models = [
  { name: "Claude 3.5 Sonnet", status: "online" },
  { name: "Gemini 1.5 Pro", status: "online" },
  { name: "GPT-4o", status: "busy" },
  { name: "Codex", status: "offline" },
  { name: "GLM 5.2", status: "online" },
  { name: "Qwen 2.5", status: "waiting" },
  { name: "Llama 3.1 70B", status: "online" },
  { name: "Local Models", status: "offline" },
];

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "online": return <CheckCircle2 className="h-3 w-3 text-lime-400 drop-shadow-[0_0_5px_currentColor]" />;
    case "busy": return <AlertCircle className="h-3 w-3 text-amber-400 drop-shadow-[0_0_5px_currentColor]" />;
    case "waiting": return <Clock className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_currentColor]" />;
    case "offline": return <XCircle className="h-3 w-3 text-red-500/50" />;
    default: return null;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "online": return "text-lime-400";
    case "busy": return "text-amber-400";
    case "waiting": return "text-cyan-400";
    case "offline": return "text-red-500/50";
    default: return "text-zinc-500";
  }
};

export function OsSystemStatus() {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    gpu: 0,
    ram: 0,
    totalRam: 64, // Default fallback
    vram: 0,
    temp: 40,
    networkIn: 0,
    networkOut: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/os-metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch OS metrics", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-cyan-500/30 bg-gradient-to-br from-zinc-950/90 to-zinc-900/90 rounded-2xl p-4 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-xl hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_15px_40px_rgba(0,0,0,0.9),0_0_40px_rgba(34,211,238,0.2)] transition-all duration-500 relative overflow-hidden group">
      
      {/* System Core Section */}
      <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] uppercase tracking-widest border-b border-cyan-400/20 pb-2">
        <Database className="h-3 w-3 drop-shadow-[0_0_5px_currentColor]" />
        System Core (Live)
      </div>
      
      <div className="space-y-3">
        <Bar label="CPU" value={metrics.cpu} color="bg-cyan-400" />
        <Bar label="GPU" value={metrics.gpu} color="bg-purple-400" />
        <Bar label="RAM" value={(metrics.ram / metrics.totalRam) * 100 || 0} color="bg-lime-400" />
        <Bar label="VRAM" value={(metrics.vram / 24) * 100} color="bg-amber-400" />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-400/10">
        <div className="flex items-center gap-2">
          <Thermometer className="h-3 w-3 text-red-400 drop-shadow-[0_0_5px_currentColor]" />
          <div className="text-[10px] font-mono text-zinc-300">{metrics.temp.toFixed(1)}°C</div>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3 text-zinc-400" />
          <div className="text-[10px] font-mono text-zinc-300">42%</div>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <Network className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_currentColor]" />
          <div className="text-[10px] font-mono text-zinc-400 flex justify-between w-full">
            <span>↓ {metrics.networkIn.toFixed(1)} MB/s</span>
            <span>↑ {metrics.networkOut.toFixed(1)} MB/s</span>
          </div>
        </div>
      </div>

      {/* Neural Models Section (Merged from OsModelsList) */}
      <div className="mt-4 pt-4 border-t border-cyan-400/20">
        <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] uppercase tracking-widest mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3 drop-shadow-[0_0_5px_currentColor]" />
            Neural Models
          </div>
          <span className="text-zinc-500">8/8</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {models.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_2px_5px_rgba(0,0,0,0.2)]">
              <span className={`text-[9px] font-mono truncate ${m.status === "offline" ? "text-zinc-600" : "text-cyan-100"}`}>
                {m.name}
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[8px] uppercase tracking-wider hidden sm:block ${statusColor(m.status)}`}>
                  {m.status}
                </span>
                <StatusIcon status={m.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
