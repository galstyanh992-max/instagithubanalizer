"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  variant = "cyan",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  variant?: "cyan" | "lime" | "amber" | "red";
}) {
  const variants: Record<string, { track: string; fill: string }> = {
    cyan: { track: "bg-cyan-400/10", fill: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" },
    lime: { track: "bg-lime-400/10", fill: "bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.5)]" },
    amber: { track: "bg-amber-400/10", fill: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" },
    red: { track: "bg-red-400/10", fill: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]" },
  };
  const style = variants[variant] ?? variants.cyan;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]",
        style.track,
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 rounded-full transition-all duration-500", style.fill)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
