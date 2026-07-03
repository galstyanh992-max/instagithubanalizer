'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  badge,
  className,
}: {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('mb-6 flex flex-col gap-2', className)}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient-neon tracking-tight">
          {title}
        </h1>
        {badge}
      </div>
      {subtitle && <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      <div className="neon-divider mt-2" />
    </motion.div>
  )
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto', className)}>{children}</div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-panel p-4 animate-pulse">
      <div className="h-4 w-1/2 bg-white/10 rounded mb-3" />
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-2/3 bg-white/5 rounded" />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
}) {
  return (
    <div className="glass-panel p-10 flex flex-col items-center justify-center text-center gap-3">
      {Icon && (
        <div className="w-14 h-14 rounded-full glass-panel flex items-center justify-center text-cyan-400">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-lg font-bold neon-text">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass-panel p-10 flex flex-col items-center justify-center text-center gap-3 border-red-400/30">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-400/30 flex items-center justify-center text-red-400">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-lg font-bold text-red-300">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 transition"
        >
          Retry
        </button>
      )}
    </div>
  )
}
