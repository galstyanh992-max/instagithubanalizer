"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DeviceStatusBadge } from "./device-status-badge";

const NAV_ITEMS = [
  { label: 'ЦЕНТРЫ', href: '/phase-b' },
  { label: 'ПАНЕЛЬ УПРАВЛЕНИЯ', href: '/' },
  { label: 'ПРОЕКТЫ', href: '/projects' },
  { label: 'РЕПОЗИТОРИИ', href: '/repos' },
  { label: 'АГЕНТЫ', href: '/agents' },
  { label: 'ПАМЯТЬ', href: '/memory' },
  { label: 'НАСТРОЙКИ', href: '/settings' }
];

export function TopBar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex-none h-[4.5rem] flex items-center px-8 z-50 relative justify-between font-rajdhani">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      {/* Left Logo */}
      <div className="flex items-center gap-3 sci-fi-panel-chamfer-tl-br border border-cyan-500/20 px-6 py-2 bg-[#050a14]/80">
        <div className="w-8 h-8 rounded-full border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-glow-intense shadow-[0_0_10px_#00f0ff]">
          J
        </div>
        <div className="flex flex-col">
          <span className="text-cyan-100 font-bold text-lg tracking-[0.3em] uppercase leading-tight">ДЖАРВИС OS</span>
          <span className="text-cyan-700 text-[10px] font-mono tracking-widest">v 2.5.0</span>
        </div>
      </div>

      {/* Center Tabs */}
      <div className="flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
        {NAV_ITEMS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href} className={`text-[11px] font-bold tracking-[0.2em] transition-all uppercase ${
              isActive 
                ? 'text-cyan-400 text-glow-intense border-b-2 border-cyan-400 pb-1' 
                : 'text-cyan-700 hover:text-cyan-300'
            }`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right Status */}
      <div className="flex items-center gap-6 text-[11px] font-mono tracking-widest">
        <div className="flex gap-4 text-cyan-700">
          <span>CPU <span className="text-cyan-100">18%</span></span>
          <span>GPU <span className="text-cyan-100">32%</span></span>
          <span>RAM <span className="text-cyan-100">41%</span></span>
          <span>СЕТЬ <span className="text-cyan-100">1.2Гбит/с</span></span>
        </div>
        <DeviceStatusBadge />
        <div className="text-cyan-100">{time}</div>
      </div>
    </header>
  );
}
