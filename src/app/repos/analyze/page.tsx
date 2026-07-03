'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/layout/page-utils'
import { HolographicPanel } from '@/components/futuristic/holographic-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SEED_REPOS } from '@/lib/constants'

export default function AnalyzeRepoPage() {
  const router = useRouter()
  const [input, setInput] = useState('')

  const analyze = useMutation({
    mutationFn: async (fullName: string) => {
      const r = await fetch('/api/repos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      })
      if (!r.ok) throw new Error('Analyze failed')
      return r.json()
    },
    onSuccess: (data) => {
      toast.success('Analysis complete')
      router.push(`/repos/${data.repoId}`)
    },
    onError: () => toast.error('Analysis failed'),
  })

  const submit = () => {
    const v = input.trim()
    if (!v) return
    // Accept "owner/repo" or full URL
    const m = v.match(/(?:github\.com\/)?([^/\s]+)\/([^/\s]+)/)
    if (!m) {
      toast.error('Use format: owner/repo')
      return
    }
    analyze.mutate(`${m[1]}/${m[2]}`)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Analyze Repository"
        subtitle="Enter a GitHub repository (owner/repo or full URL). Pipeline: resolve → fetch → analyze → score → verdict."
      />
      <HolographicPanel accent="cyan">
        <div className="mb-3 text-xs font-bold tracking-widest text-cyan-400/80 uppercase">INPUT</div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. docling-project/docling"
            className="bg-black/40 border-cyan-400/30 text-foreground placeholder:text-muted-foreground/60"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button
            onClick={submit}
            disabled={analyze.isPending}
            className="gap-2 bg-cyan-400/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/25"
          >
            {analyze.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Analyze
          </Button>
        </div>
      </HolographicPanel>

      <HolographicPanel accent="magenta" className="mt-6">
        <div className="mb-3 text-xs font-bold tracking-widest text-fuchsia-400/80 uppercase">QUICK PICKS</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SEED_REPOS.slice(0, 12).map((r) => (
            <button
              key={r}
              onClick={() => analyze.mutate(r)}
              disabled={analyze.isPending}
              className="flex items-center gap-2 p-3 rounded-lg border border-fuchsia-400/15 hover:border-fuchsia-400/40 hover:bg-fuchsia-400/5 transition text-left disabled:opacity-50"
            >
              <Search className="w-3 h-3 text-fuchsia-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r}</div>
              </div>
            </button>
          ))}
        </div>
      </HolographicPanel>
    </PageContainer>
  )
}
