"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { Activity, AlertTriangle, Bell, MessageSquare, Twitter, Github, Mail, User, CloudSun, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "warning" | "error";
}) {
  const statusClasses = {
    ok: "text-cyan-300",
    warning: "text-amber-300",
    error: "text-red-400",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-zinc-500 text-[10px]">{label}</span>
      <span className={cn("font-bold text-[10px] tabular-nums", statusClasses[status])}>{value}</span>
    </div>
  );
}

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
    { label: "Панель", href: "/" },
    { label: "Проекты", href: "/projects" },
    { label: "Агенты", href: "/agents" },
    { label: "Память", href: "/memory" },
    { label: "Аналитика", href: "/upload" },
    { label: "Настройки", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-cyan-400/20 bg-[#050811]/95 px-6 backdrop-blur-2xl">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      {/* Bottom subtle line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/10 via-cyan-400/30 to-cyan-500/10" />

      {/* Left Area - Brand & Navigation */}
      <div className="flex items-center h-full gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group relative">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-md group-hover:bg-cyan-400/50 transition-all duration-500" />
            <div className="relative h-8 w-8 rounded-full border border-cyan-400/60 bg-zinc-950 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <div className="absolute inset-1 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, rgba(224,252,255,0.95), rgba(34,211,238,0.55) 40%, rgba(15,23,42,0.85) 80%)" }} />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="font-mono text-sm font-bold tracking-[0.2em] neon-text leading-none">ДЖАРВИС OS</div>
            <div className="font-mono text-[8px] tracking-[0.3em] text-zinc-500 uppercase leading-tight">AI Command Center</div>
          </div>
        </Link>

        {/* Navigation tabs */}
        <nav className="hidden lg:flex items-center h-full gap-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative h-full flex items-center px-5 font-mono text-[11px] uppercase tracking-wider transition-all duration-300 group",
                  active
                    ? "text-cyan-100"
                    : "text-zinc-500 hover:text-cyan-200 hover:bg-white/[0.03]"
                )}
              >
                <span className={cn("transition-all duration-300", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")}>
                  {link.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Center Area - Environmental Data */}
      <div className="hidden md:flex items-center gap-8 h-full font-mono text-[11px] text-zinc-400">
        <div className="flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05] backdrop-blur-md">
          <div className="flex items-center gap-2 text-cyan-300/80">
            <Calendar size={12} />
            <span className="tracking-wider">{now ? now.toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' }) : "-- --"}</span>
          </div>
          <div className="w-px h-3 bg-zinc-700" />
          <div className="flex items-center gap-2 text-cyan-300/80">
            <CloudSun size={12} />
            <span className="tracking-wider">+22°C / Москва</span>
          </div>
        </div>
      </div>

      {/* Right Area - System Status & Profile */}
      <div className="flex items-center gap-6 h-full">
        {/* System Metrics (Compact) */}
        <div className="hidden xl:flex items-center gap-5 font-mono text-[10px] uppercase text-zinc-500">
          <Metric label="CPU" value={`${metrics.cpu.toFixed(0)}%`} status={metrics.cpu > 80 ? "warning" : "ok"} />
          <Metric label="RAM" value={`${(metrics.ram / 64 * 100).toFixed(0)}%`} status="ok" />
          <Metric label="LAT" value={`${metrics.latency.toFixed(0)}ms`} status={metrics.latency > 100 ? "warning" : "ok"} />
        </div>

        {/* Notifications & Socials */}
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-white/[0.05] transition-colors text-zinc-400 hover:text-cyan-300 relative">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full border border-zinc-950" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/[0.05] transition-colors text-zinc-400 hover:text-cyan-300">
            <MessageSquare size={16} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-500">
            <Twitter size={12} className="hover:text-cyan-400 cursor-pointer transition-colors" />
            <Github size={12} className="hover:text-cyan-400 cursor-pointer transition-colors" />
            <Mail size={12} className="hover:text-cyan-400 cursor-pointer transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-3 pl-5 border-l border-cyan-400/20">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-cyan-100 tracking-wider">S. JARVIS</span>
            <span className="text-[8px] text-zinc-500 uppercase tracking-tighter">Administrator</span>
          </div>
          <div className="relative h-8 w-8 rounded-full border border-cyan-400/40 p-0.5 overflow-hidden ring-1 ring-cyan-400/20">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-600" />
          </div>
          <div className="text-cyan-50 font-medium px-2.5 py-1 rounded-md bg-surface-inset border border-cyan-400/30 font-mono text-[12px] tabular-nums shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            {now ? now.toLocaleTimeString("ru-RU") : "--:--:--"}
          </div>
        </div>
      </div>
    </header>
  );
}