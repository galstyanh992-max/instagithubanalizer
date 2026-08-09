import { SciFiPanel, SciFiRing, SciFiBadge } from "@/components/ui/sci-fi-panel";
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, GitFork, GitBranch, Eye, ExternalLink, RefreshCw, BookmarkPlus, BookmarkMinus } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LicenseStatusBadge } from './license-badge'
import type { Verdict } from '@/lib/types'

interface RepoCardProps {
  repo: {
    id: string
    fullName: string
    owner: string
    name: string
    description?: string | null
    stars: number
    forks: number
    openIssues: number
    license?: string | null
    primaryLanguage?: string | null
    verdict: string
    finalPriorityScore: number
    usefulnessScore: number
    healthScore: number
    compatibilityScore: number
    isWatchlisted: boolean
    gpuRequired: boolean
  }
  compact?: boolean
  showCompare?: boolean
}

export function RepoCard({ repo, compact = false, showCompare = true }: RepoCardProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const [watching, setWatching] = useState(repo.isWatchlisted)

  const watch = useMutation({
    mutationFn: async () => {
      const method = watching ? 'DELETE' : 'POST'
      const r = await fetch(`/api/repos/${repo.id}/watch`, { method })
      if (!r.ok) throw new Error('watch failed')
      return r.json()
    },
    onSuccess: () => {
      setWatching((w) => !w)
      toast.success(watching ? 'Удалено из вотчлиста' : 'Добавлено в вотчлист')
      qc.invalidateQueries({ queryKey: ['repos'] })
    },
    onError: () => toast.error('Не удалось обновить вотчлист'),
  })

  return (
    <SciFiPanel
      accent={repo.gpuRequired ? 'magenta' : 'cyan'}
      className="hover:scale-[1.01] transition-transform cursor-pointer group"
    >
      <div className="flex flex-col gap-3" onClick={() => router.push(`/repos/${repo.id}`)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{repo.owner}</div>
            <div className="font-bold text-lg neon-text truncate group-hover:text-cyan-200">{repo.name}</div>
          </div>
          <SciFiBadge verdict={repo.verdict as Verdict} size="sm" />
        </div>
        {!compact && repo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400" />
            {repo.stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            {repo.forks.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {repo.openIssues.toLocaleString()} issues
          </span>
          {repo.primaryLanguage && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
              {repo.primaryLanguage}
            </span>
          )}
          {repo.gpuRequired && (
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-400/30 text-fuchsia-300 text-[10px]">
              GPU
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-cyan-400/10">
          <div className="flex items-center gap-2">
            <SciFiRing value={repo.finalPriorityScore} size={48} label="ИТОГ" />
            <SciFiRing value={repo.usefulnessScore} size={36} color="var(--neon-lime)" label="ПОЛЬЗА" />
            <SciFiRing value={repo.healthScore} size={36} color="var(--neon-magenta)" label="ЗДОР." />
          </div>
          <LicenseStatusBadge license={repo.license} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-cyan-400/30 text-cyan-300"
          onClick={(e) => {
            e.stopPropagation()
            watch.mutate()
          }}
        >
          {watching ? <BookmarkMinus className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
          {watching ? 'Watching' : 'Watch'}
        </Button>
        {showCompare && (
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
            <Link href={`/compare?ids=${repo.id}`} onClick={(e) => e.stopPropagation()}>
              Compare
            </Link>
          </Button>
        )}
        <a
          href={`https://github.com/${repo.fullName}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto text-muted-foreground hover:text-cyan-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </SciFiPanel>
  )
}

export function RepoCardSkeleton() {
  return (
    <div className="glass-panel p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-2/3 bg-white/5 rounded" />
      <div className="flex justify-between mt-4">
        <div className="h-10 w-10 bg-white/5 rounded-full" />
        <div className="h-6 w-20 bg-white/5 rounded" />
      </div>
    </div>
  )
}

export function MiniRefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className="gap-1 border-cyan-400/30 text-cyan-300"
    >
      <RefreshCw className="w-3 h-3" />
      Refresh
    </Button>
  )
}

export function WatchBadge({ watching }: { watching: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <Eye className={`w-3 h-3 ${watching ? 'text-cyan-300' : 'text-muted-foreground'}`} />
      {watching ? 'watching' : 'idle'}
    </span>
  )
}
