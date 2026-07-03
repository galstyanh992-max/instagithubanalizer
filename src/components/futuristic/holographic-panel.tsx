"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function HolographicPanel({
  children,
  className,
  accent = "cyan",
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "magenta" | "lime" | "amber";
  glow?: boolean;
}) {
  const accents: Record<string, string> = {
    cyan: "border-cyan-400/40",
    magenta: "border-fuchsia-400/40",
    lime: "border-lime-400/40",
    amber: "border-amber-400/40",
  };
  const shadows: Record<string, string> = {
    cyan: "shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)]",
    magenta: "shadow-[0_0_30px_-8px_rgba(232,121,249,0.4)]",
    lime: "shadow-[0_0_30px_-8px_rgba(163,230,53,0.4)]",
    amber: "shadow-[0_0_30px_-8px_rgba(251,191,36,0.4)]",
  };
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-zinc-950/60 backdrop-blur-xl",
        accents[accent],
        glow && shadows[accent],
        className
      )}
    >
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-current opacity-80" />
      <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-current opacity-80" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-current opacity-80" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-current opacity-80" />
      {children}
    </div>
  );
}
