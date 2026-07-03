'use client'

import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import {
  Home,
  LayoutDashboard,
  Upload,
  Boxes,
  GitCompareArrows,
  Columns3,
  Eye,
  ClipboardCheck,
  FolderTree,
  Settings,
  Mic,
  Search,
} from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Screenshot', icon: Upload },
  { href: '/repos', label: 'Repositories', icon: Boxes },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/board', label: 'Verdict Board', icon: Columns3 },
  { href: '/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/manual-review', label: 'Manual Review', icon: ClipboardCheck },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/voice', label: 'Voice Assistant', icon: Mic },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[18%] z-[70] w-[92vw] max-w-xl -translate-x-1/2 rounded-2xl glass-panel p-0 overflow-hidden">
          <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
          <Command
            label="Commands"
            className="flex flex-col"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan-400/15">
              <Search className="w-4 h-4 text-cyan-400" />
              <Command.Input
                autoFocus
                placeholder="Search commands, pages, actions…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              />
              <kbd className="text-[10px] text-muted-foreground border border-cyan-400/30 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="text-center text-xs text-muted-foreground py-6">
                No results found.
              </Command.Empty>
              <Command.Group heading="Navigate" className="text-xs text-muted-foreground px-1 pb-1">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Command.Item
                    key={href}
                    value={label}
                    onSelect={() => {
                      router.push(href)
                      setOpen(false)
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-cyan-400/10 aria-selected:text-cyan-300"
                  >
                    <Icon className="w-4 h-4 text-cyan-400/70" />
                    <span className="text-sm">{label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{href}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
