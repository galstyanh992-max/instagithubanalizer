"use client";

import { cn } from "@/lib/utils";
import { VERDICT_META, COMMERCIAL_META } from "@/lib/constants";
import type { Verdict, CommercialStatus } from "@/lib/types";
import { Rocket, FlaskConical, Bookmark, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, HelpCircle } from "lucide-react";

const VERDICT_ICONS: Record<Verdict, typeof Rocket> = {
  USE_NOW: Rocket,
  TEST: FlaskConical,
  SAVE: Bookmark,
  SKIP: XCircle,
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" | "lg" }) {
  const meta = VERDICT_META[verdict];
  const Icon = VERDICT_ICONS[verdict];
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-3 py-1 gap-1.5",
    lg: "text-sm px-4 py-2 gap-2",
  };
  const iconSizes = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-mono font-semibold uppercase tracking-wider",
        meta.bg,
        meta.color,
        meta.border,
        sizes[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      {meta.label}
    </span>
  );
}

export function CommercialBadge({ status }: { status: CommercialStatus }) {
  const meta = COMMERCIAL_META[status];
  const icons: Record<CommercialStatus, typeof ShieldCheck> = {
    SAFE: ShieldCheck,
    WARNING: AlertTriangle,
    HIGH_RISK: ShieldAlert,
    UNKNOWN: HelpCircle,
  };
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono uppercase",
        meta.bg,
        meta.color
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
