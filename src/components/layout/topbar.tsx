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

import { useOsMetrics } from "@/lib/os-mock-data";

export function TopBar() {
  const pathname = usePathname();
  const now = useNow();
  const metrics = useOsMetrics();

  const links = [
    { label: "Dashboard", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Agents", href: "/agents" },
    { label: "Memory", href: "/memory" },
    { label: "Analysis", href: "/upload" },
    { label: "System", href: "/system" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-10 items-center justify-between border-b border-cyan-400/20 bg-zinc-950/90 px-3 backdrop-blur-md">
      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/20 via-cyan-400/50 to-cyan-500/20" />
      
      {/* Left Area */}
      <div className="flex items-center h-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group mr-6">
          <div className="relative h-6 w-6">
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-[4px] group-hover:bg-cyan-400/50 transition-colors" />
            <div className="relative h-6 w-6 rounded-full border border-cyan-400/50 bg-zinc-950 flex items-center justify-center">
              <div className="absolute inset-1 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, rgba(224,252,255,0.9), rgba(34,211,238,0.5) 40%, rgba(15,23,42,0.8) 80%)" }} />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="font-mono text-[11px] font-bold tracking-widest neon-text">ДЖАРВИС OS</div>
          </div>
        </Link>

        {/* Links */}
        <nav className="hidden lg:flex items-center gap-1 h-full">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-mono uppercase tracking-wider text-[10px] h-full flex items-center px-3 border-b-2 transition-all",
                  active 
                    ? "text-cyan-300 border-cyan-400 bg-cyan-400/10" 
                    : "text-zinc-400 border-transparent hover:text-cyan-100 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Area - Metrics */}
      <div className="flex items-center gap-3 md:gap-4 lg:gap-6 h-full font-mono text-[9px] uppercase text-zinc-400">
        
        <div className="hidden xl:flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">GPU</span>
            <span className={cn("font-bold", metrics.gpu > 80 ? "text-red-400" : "text-cyan-300")}>{metrics.gpu.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">RAM</span>
            <span className="text-cyan-300">{(metrics.ram / 64 * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Model</span>
            <span className="text-lime-400">OpenRouter (Primary)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Tokens</span>
            <span className="text-amber-300">{metrics.tokenUsage.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Lat</span>
            <span className={metrics.latency > 100 ? "text-amber-400" : "text-cyan-300"}>{metrics.latency.toFixed(0)}ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Queue</span>
            <span className="text-cyan-300">{metrics.queue}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
            <span className="text-lime-400 hidden sm:block">SYSTEM ONLINE</span>
          </div>
          
          <div className="text-cyan-50 font-medium px-2 py-0.5 rounded bg-zinc-900 border border-cyan-400/20">
            {now ? now.toLocaleTimeString("ru-RU") : "--:--:--"}
          </div>
        </div>

      </div>
    </header>
  );
}
