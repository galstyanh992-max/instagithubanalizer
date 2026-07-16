"use client";

import { HolographicPanel } from "./holographic-panel";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ACCENT_MAP: Record<string, { color: string; panel: "cyan" | "blue" | "magenta" | "lime" | "amber" | "red" }> = {
  cyan:  { color: "text-cyan-300",  panel: "cyan" },
  blue:  { color: "text-blue-300",  panel: "blue" },
  magenta:{ color: "text-fuchsia-300", panel: "magenta" },
  lime:  { color: "text-lime-300",  panel: "lime" },
  amber: { color: "text-amber-300", panel: "amber" },
  red:   { color: "text-red-300",   panel: "red" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "cyan",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "cyan" | "blue" | "magenta" | "lime" | "amber" | "red";
  hint?: string;
}) {
  const style = ACCENT_MAP[accent] ?? ACCENT_MAP.cyan;
  return (
    <HolographicPanel accent={style.panel} className="p-4 group hover:border-cyan-400/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="data-label truncate">{label}</div>
          <div className={cn("mt-1.5 font-mono text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate", style.color)}>
            {value}
          </div>
          {hint && <div className="mt-1 text-[10px] text-zinc-500 truncate">{hint}</div>}
        </div>
        <div className={cn("h-9 w-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0", style.color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </HolographicPanel>
  );
}
