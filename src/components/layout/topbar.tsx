"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { Activity, AlertTriangle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, LayoutDashboard, Upload, FolderGit2, Swords, Trello, Eye,
  ClipboardCheck, Tags, Mic, Settings, Wrench, Brain, Rocket,
} from "lucide-react";
import { Button } from "../ui/button";

const ICONS = {
  Home, LayoutDashboard, Upload, FolderGit2, Swords, Trello, Eye,
  ClipboardCheck, Tags, Mic, Settings, Wrench, Brain, Rocket,
};

const NAV_GROUPS = [
  { label: "Главное", items: ["/", "/dashboard", "/projects", "/memory"] },
  { label: "Анализ", items: ["/upload", "/repos", "/compare", "/board"] },
  { label: "Управление", items: ["/watchlist", "/manual-review", "/categories"] },
  { label: "Система", items: ["/voice", "/settings", "/deploy"] },
];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useFallbackMode() {
  const [mode, setMode] = useState<{ github: boolean; ai: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings;
        setMode({
          github: !s?.githubToken,
          ai: !s?.glmApiKey || s?.aiProvider === "mock",
        });
      })
      .catch(() => setMode({ github: true, ai: true }));
  }, []);
  return mode;
}

export function TopBar() {
  const pathname = usePathname();
  const now = useNow();
  const fallback = useFallbackMode();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-cyan-400/20 bg-zinc-950/80 px-4 backdrop-blur-2xl lg:px-8">
      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9">
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-md group-hover:bg-cyan-400/50 transition-colors" />
            <div className="relative h-9 w-9 rounded-full border border-cyan-400/50 bg-zinc-950 flex items-center justify-center">
              <div className="absolute inset-1.5 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, rgba(224,252,255,0.9), rgba(34,211,238,0.5) 40%, rgba(15,23,42,0.8) 80%)" }} />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="font-mono text-sm font-bold tracking-wider neon-text">JARWISYAN</div>
          </div>
        </Link>

        {/* Horizontal Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {NAV_GROUPS.map(group => (
            <DropdownMenu key={group.label}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-zinc-300 hover:text-cyan-300 hover:bg-cyan-400/10 data-[state=open]:bg-cyan-400/10 data-[state=open]:text-cyan-300 font-mono uppercase tracking-wider text-[11px] h-9 px-3 border border-transparent hover:border-cyan-400/30 transition-all rounded-lg">
                  {group.label}
                  <ChevronDown className="ml-1.5 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-zinc-950/95 border-cyan-400/30 backdrop-blur-xl">
                {NAV_ITEMS.filter((item) => group.items.includes(item.href)).map((item) => {
                  const Icon = ICONS[item.icon as keyof typeof ICONS];
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 cursor-pointer font-sans transition-colors",
                          active ? "text-cyan-300 bg-cyan-400/10" : "text-zinc-400 hover:text-cyan-100 hover:bg-white/5"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {fallback && (fallback.github || fallback.ai) && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-400 font-mono shadow-[0_0_10px_rgba(251,191,36,0.15)]">
            <AlertTriangle className="h-3 w-3" />
            <span className="hidden sm:inline">FALLBACK</span>
          </div>
        )}
        <div className="flex items-center gap-2 border border-cyan-400/20 bg-zinc-950/50 rounded-lg px-3 py-1.5 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
          <Activity className="h-3 w-3 text-lime-400 animate-pulse" />
          <span className="font-mono text-xs text-cyan-50">
            {now ? now.toLocaleTimeString("ru-RU") : "--:--:--"}
          </span>
        </div>
      </div>
    </header>
  );
}
