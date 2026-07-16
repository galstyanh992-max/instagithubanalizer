import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-500/15 text-cyan-200 border border-cyan-400/20 [a&]:hover:bg-cyan-500/25",
        secondary:
          "border-transparent bg-white/[0.06] text-zinc-300 border border-white/[0.08] [a&]:hover:bg-white/[0.10]",
        destructive:
          "border-transparent bg-red-500/15 text-red-200 border border-red-400/20 [a&]:hover:bg-red-500/25",
        outline:
          "bg-transparent border-cyan-400/30 text-cyan-200 [a&]:hover:bg-cyan-500/10",
        success:
          "border-transparent bg-lime-500/12 text-lime-200 border border-lime-400/20 [a&]:hover:bg-lime-500/20",
        warning:
          "border-transparent bg-amber-500/12 text-amber-200 border border-amber-400/20 [a&]:hover:bg-amber-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
