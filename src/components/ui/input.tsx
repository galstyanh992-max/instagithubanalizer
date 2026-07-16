import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-lg border border-cyan-400/20 bg-surface-inset px-3 py-2 text-sm text-cyan-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(34,211,238,0.04)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "placeholder:text-zinc-500",
        "focus-visible:border-cyan-400/50 focus-visible:shadow-[inset_0_2px_10px_rgba(0,0,0,0.4),0_0_16px_-4px_rgba(34,211,238,0.2)]",
        "aria-invalid:border-destructive/60 aria-invalid:focus-visible:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
