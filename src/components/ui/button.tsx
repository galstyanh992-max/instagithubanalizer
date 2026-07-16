import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-cyan-400 to-cyan-600 text-primary-foreground border border-cyan-300/50 shadow-[0_0_16px_-4px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-cyan-300 hover:to-cyan-500 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.5)] active:translate-y-[1px]",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-700 text-white border border-red-400/50 shadow-[0_0_16px_-4px_rgba(248,113,113,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-red-400 hover:to-red-600 active:translate-y-[1px]",
        outline:
          "border border-cyan-400/30 bg-surface-raised/50 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-cyan-500/10 hover:border-cyan-400/50 hover:text-cyan-100 active:translate-y-[1px]",
        secondary:
          "bg-surface-raised border border-white/[0.08] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:text-white active:translate-y-[1px]",
        ghost:
          "text-zinc-300 hover:text-cyan-100 hover:bg-cyan-500/10 active:translate-y-[1px]",
        link: "text-cyan-300 underline-offset-4 hover:text-cyan-100 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 text-base has-[>svg]:px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
