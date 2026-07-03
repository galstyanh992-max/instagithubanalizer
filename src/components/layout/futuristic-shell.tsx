'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { ApplySettingsClass } from './apply-settings-class'
import ThreeBackground from '@/components/three/three-background'
import CommandPalette from '@/components/futuristic/command-palette'

export function FuturisticShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <ThreeBackground />
      <ApplySettingsClass />
      <CommandPalette />
      <div className="flex flex-1 min-h-0 relative z-10">
        <div className="hidden md:block sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
