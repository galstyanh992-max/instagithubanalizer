"use client";

import { useEffect, useState, useMemo } from "react";
import { Cpu, Network, Thermometer, Brain, Droplets, Fan, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type BarProps = {
  label: string;
  value: number;
  color: string;
};

const PROGRESS_VARIANTS: Record<string, "cyan" | "amber" | "lime"> = {
  cyan: "cyan",
  purple: "cyan",
  lime: "lime",
  amber: "amber",
};

function Bar({ label, value, color }: BarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const variant = PROGRESS_VARIANTS[color] ?? "cyan";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-zinc-500">{label}</span>
        <span className="text-cyan-100 data-value">{clamped.toFixed(1)}%</span>
      </div>
      <Progress value={clamped} variant={variant} className="h-1.5" />
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="w-full h-16 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#grad-${color})`}
        opacity="0.25"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

const models = [
  { name: "Claude 3.5", status: "online" },
  { name: "Gemini 1.5", status: "online" },
  { name: "GPT-4o", status: "busy" },
  { name: "Codex", status: "offline" },
  { name: "Grok 3.2", status: "online" },
  { name: "Qwen 2.5", status: "waiting" },
  { name: "Llama 3.1 70B", status: "online" },
  { name: "Local Models", status: "offline" },
];

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "online": return <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.9)]" />;
    case "busy": return <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />;
    case "waiting": return <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />;
    case "offline": return <div className="h-2 w-2 rounded-full bg-red-500/40" />;
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

function MetricTile({
  icon: Icon,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md glass-panel-subtle">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <div className={cn("text-[10px] font-mono font-bold", color)}>{value}</div>
    </div>
  );
}

export function OsSystemStatus() {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    gpu: 0,
    ram: 0,
    totalRam: 64,
    vram: 0,
    temp: 40,
    networkIn: 0,
    networkOut: 0,
  });

  const [netHistory, setNetHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/os-metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
          setNetHistory((prev) => {
            const next = [...prev, (data.networkIn || 0) + (data.networkOut || 0)];
            if (next.length > 20) next.shift();
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch OS metrics", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col glass-panel-strong p-4 space-y-4 relative overflow-hidden border-l-2 border-l-cyan-400">
      {/* System Core Section */}
      <div className="panel-header !px-0 !pt-0">
        <Cpu className="h-3.5 w-3.5" />
        Системное ядро
      </div>

      <div className="space-y-3 pt-2">
        <Bar label="CPU" value={metrics.cpu} color="bg-cyan-400" />
        <Bar label="GPU" value={metrics.gpu} color="bg-purple-400" />
        <Bar label="RAM" value={(metrics.ram / metrics.totalRam) * 100 || 0} color="bg-lime-400" />
        <Bar label="VRAM" value={(metrics.vram / 24) * 100} color="bg-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-cyan-400/10">
        <MetricTile icon={Thermometer} value={`${metrics.temp.toFixed(1)}°C`} color="text-red-400" />
        <MetricTile icon={Fan} value="41%" color="text-cyan-400" />
        <MetricTile icon={Droplets} value="42%" color="text-blue-400" />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-cyan-400/10">
        <Network className="h-3.5 w-3.5 text-cyan-400" />
        <div className="text-[10px] font-mono text-zinc-400 flex justify-between w-full">
          <span>↓ {metrics.networkIn.toFixed(1)} MB/s</span>
          <span>↑ {metrics.networkOut.toFixed(1)} MB/s</span>
        </div>
      </div>

      {/* Neural Models Section */}
      <div className="pt-2 border-t border-cyan-400/10">
        <div className="flex items-center justify-between text-cyan-300 font-mono text-[10px] uppercase tracking-[0.15em] mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" />
            Модели
          </div>
          <span className="text-zinc-500">8/8</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {models.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded-md glass-panel-subtle border-surface-border-subtle">
              <span className={`text-[9px] font-mono truncate ${m.status === "offline" ? "text-zinc-600" : "text-cyan-100"}`}>
                {m.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[8px] uppercase tracking-wider ${statusColor(m.status)}`}>
                  {m.status}
                </span>
                <StatusIcon status={m.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Activity Sparkline */}
      <div className="flex-1 pt-2 border-t border-cyan-400/10 flex flex-col min-h-0">
        <div className="flex items-center justify-between text-cyan-300 font-mono text-[10px] uppercase tracking-[0.15em] mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Сетевая активность
          </div>
          <span className="text-[8px] text-lime-400 status-dot status-online" />
        </div>
        <div className="flex-1 min-h-0 rounded-md glass-panel-inset p-2">
          <Sparkline data={netHistory} color="#22d3ee" />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
          <span>PING 1.42K</span>
          <span>CONN 9.8K</span>
          <span>PKTS/S 120</span>
        </div>
      </div>
    </div>
  );
}
