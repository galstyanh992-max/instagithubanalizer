'use client'

import { SciFiPanel } from "@/components/ui/sci-fi-panel";
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/layout/page-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SEED_REPOS } from '@/lib/constants'
import { GithubTabs } from "@/components/ui/github-tabs";

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
      const contentType = r.headers.get('content-type') ?? ''
      if (r.redirected || !contentType.includes('application/json')) {
        throw new Error('Сессия истекла. Войдите в систему и повторите анализ.')
      }
      const data = await r.json()
      if (!r.ok) {
        const detail = typeof data?.error === 'string' ? data.error : ''
        if (detail === 'MockMode') {
          throw new Error('ИИ-провайдер не ответил. Проверьте подключение модели в настройках.')
        }
        throw new Error(detail || 'Не удалось выполнить анализ репозитория.')
      }
      if (!data?.repositoryId) {
        throw new Error('Сервер вернул неполный результат анализа. Повторите попытку.')
      }
      return data
    },
    onSuccess: (data) => {
      toast.success('Анализ завершён')
      router.push(`/repos/${data.repoId}`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Не удалось выполнить анализ репозитория.'),
  })

  const submit = () => {
    const v = input.trim()
    if (!v) return
    // Accept "owner/repo" or full URL
    const m = v.match(/(?:github\.com\/)?([^/\s]+)\/([^/\s]+)/)
    if (!m) {
      toast.error('Используйте формат: владелец/репозиторий')
      return
    }
    analyze.mutate(`${m[1]}/${m[2]}`)
  }

  return (
    <PageContainer>
      <GithubTabs />
      <PageHeader
        title="Анализ репозитория"
        subtitle="Укажите GitHub-репозиторий в формате владелец/репозиторий или полную ссылку. Этапы: поиск → загрузка → анализ → оценка → вывод."
      />
      <SciFiPanel accent="cyan">
        <div className="mb-3 text-xs font-bold tracking-widest text-cyan-400/80 uppercase">РЕПОЗИТОРИЙ</div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например: docling-project/docling"
            className="bg-black/40 border-cyan-400/30 text-foreground placeholder:text-muted-foreground/60"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button
            onClick={submit}
            disabled={analyze.isPending}
            className="gap-2 bg-cyan-400/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/25"
          >
            {analyze.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Анализировать
          </Button>
        </div>
      </SciFiPanel>

      <SciFiPanel accent="magenta" className="mt-6">
        <div className="mb-3 text-xs font-bold tracking-widest text-fuchsia-400/80 uppercase">БЫСТРЫЙ ВЫБОР</div>
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
      </SciFiPanel>
    </PageContainer>
  )
}
