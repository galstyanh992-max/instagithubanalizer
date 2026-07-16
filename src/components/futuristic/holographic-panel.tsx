"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const ACCENT_MAP: Record<string, { border: string; glow: string; text: string }> = {
  cyan: {
    border: "border-cyan-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(34,211,238,0.25)]",
    text: "text-cyan-400",
  },
  blue: {
    border: "border-blue-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(14,165,233,0.25)]",
    text: "text-blue-400",
  },
  magenta: {
    border: "border-fuchsia-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(232,121,249,0.22)]",
    text: "text-fuchsia-400",
  },
  lime: {
    border: "border-lime-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(163,230,53,0.22)]",
    text: "text-lime-400",
  },
  amber: {
    border: "border-amber-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(251,191,36,0.22)]",
    text: "text-amber-400",
  },
  red: {
    border: "border-red-400/35",
    glow: "shadow-[0_0_28px_-10px_rgba(248,113,113,0.22)]",
    text: "text-red-400",
  },
};

export function HolographicPanel({
  children,
  className,
  accent = "cyan",
  glow = true,
  header,
  headerIcon: HeaderIcon,
}: {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "blue" | "magenta" | "lime" | "amber" | "red";
  glow?: boolean;
  header?: string;
  headerIcon?: React.ComponentType<{ className?: string }>;
}) {
  const style = ACCENT_MAP[accent] ?? ACCENT_MAP.cyan;

  return (
    <div
      className={cn(
        "relative overflow-hidden glass-panel transition-colors",
        style.border,
        glow && style.glow,
        className
      )}
    >
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-current to-transparent opacity-60", style.text)} />

      {/* Corner brackets */}
      <span className={cn("pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-[1.5px] border-t-[1.5px] opacity-70", style.border.replace("/35", "/60"))} />
      <span className={cn("pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-[1.5px] border-t-[1.5px] opacity-70", style.border.replace("/35", "/60"))} />
      <span className={cn("pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-[1.5px] border-l-[1.5px] opacity-70", style.border.replace("/35", "/60"))} />
      <span className={cn("pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-[1.5px] border-r-[1.5px] opacity-70", style.border.replace("/35", "/60"))} />

      {/* Header */}
      {header && (
        <div className="panel-header">
          {HeaderIcon && <HeaderIcon className={cn("h-3 w-3", style.text)} />}
          <span>{header}</span>
        </div>
      )}

      {children}
    </div>
  );
}
