"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Home, LayoutDashboard, Upload, FolderGit2, Swords, Trello, Eye,
  ClipboardCheck, Tags, Mic, Settings, Wrench, Brain, Rocket,
  UserCog, GitMerge, CheckSquare
} from "lucide-react";

const ICONS = {
  Home, LayoutDashboard, Upload, FolderGit2, Swords, Trello, Eye,
  ClipboardCheck, Tags, Mic, Settings, Wrench, Brain, Rocket,
  UserCog, GitMerge, CheckSquare
};

const NAV_GROUPS = [
  { label: "Главное", items: ["/", "/dashboard", "/projects", "/memory"] },
  { label: "Система Агентов", items: ["/agents", "/workflows", "/approvals"] },
  { label: "Анализ", items: ["/upload", "/repos", "/compare", "/board"] },
  { label: "Управление", items: ["/watchlist", "/manual-review", "/categories"] },
  { label: "Настройки", items: ["/voice", "/settings", "/deploy"] },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-[calc(100vh-16px)] w-72 shrink-0 flex-col rounded-3xl border border-cyan-400/12 bg-gradient-to-b from-zinc-950/90 via-[#050816]/85 to-zinc-950/90 backdrop-blur-2xl lg:flex relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ boxShadow: "inset 0 0 60px rgba(34, 211, 238, 0.04)" }} />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-6 py-7">
        <div className="relative h-11 w-11">
          <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-lg animate-pulse" />
          <div className="relative h-11 w-11 rounded-full border border-cyan-400/50 bg-zinc-950 flex items-center justify-center">
            <div className="absolute inset-2 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, rgba(236,254,255,0.95), rgba(34,211,238,0.5) 40%, rgba(15,23,42,0.7) 80%)" }} />
          </div>
        </div>
        <div>
          <div className="font-mono text-base font-bold tracking-wider neon-text">ДЖАРВИС</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-[0.25em]">AI Core v1.0</div>
        </div>
      </div>

      {/* Navigation with groups */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-mono">{group.label}</div>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((item) => group.items.includes(item.href)).map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS];
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all",
                      active
                        ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-50 border border-cyan-400/25 shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)]"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                    )}
                    <Icon className={cn("h-[18px] w-[18px] transition", active ? "text-cyan-300" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="relative mx-4 mb-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_6px_rgba(163,230,53,0.9)]" />
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono">Узел: онлайн</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono">Синхронизировано</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
