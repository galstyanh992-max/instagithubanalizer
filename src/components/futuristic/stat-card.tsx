"use client";

import { HolographicPanel } from "./holographic-panel";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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
  accent?: "cyan" | "magenta" | "lime" | "amber" | "red";
  hint?: string;
}) {
  const accentMap: Record<string, string> = {
    cyan: "text-cyan-300",
    magenta: "text-fuchsia-300",
    lime: "text-lime-300",
    amber: "text-amber-300",
    red: "text-red-300",
  };
  return (
    <HolographicPanel accent={accent === "red" ? "magenta" : accent} className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-400">{label}</div>
          <div className={cn("mt-1 font-mono text-2xl font-bold", accentMap[accent])}>
            {value}
          </div>
          {hint && <div className="mt-1 text-[10px] text-zinc-500">{hint}</div>}
        </div>
        <Icon className={cn("h-6 w-6", accentMap[accent])} />
      </div>
    </HolographicPanel>
  );
}
