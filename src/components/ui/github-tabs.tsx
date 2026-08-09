"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UploadCloud, Search, Swords, Eye, Zap, Wrench } from "lucide-react";

export function GithubTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "СКРИНШОТЫ", href: "/upload", icon: UploadCloud },
    { name: "РЕПОЗИТОРИИ", href: "/repos", icon: Search },
    { name: "АНАЛИЗ", href: "/repos/analyze", icon: Zap },
    { name: "ИНТЕГРАЦИЯ", href: "/projects", icon: Wrench },
    { name: "СРАВНЕНИЕ", href: "/compare", icon: Swords },
    { name: "WATCHLIST", href: "/watchlist", icon: Eye },
  ];

  return (
    <div className="mb-6 flex space-x-1 border-b border-cyan-400/20 pb-0.5 overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const isActive = pathname === t.href || (pathname?.startsWith(t.href + "/") && t.href !== "/");
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition whitespace-nowrap rounded-t-md ${
              isActive 
                ? "border-b-2 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[inset_0_-2px_8px_rgba(34,211,238,0.15)]" 
                : "text-zinc-500 hover:bg-cyan-500/5 hover:text-cyan-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}
