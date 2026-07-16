"use client";

import { useState, useEffect, useMemo } from "react";
import { FolderKanban, Cog, Users, HardDrive, Bell, MessageSquare, Archive, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JarvisChatList } from "@/components/jarvis/jarvis-chat-list";
import { JarvisArchiveList } from "@/components/jarvis/jarvis-archive";
import { useJarvisStore } from "@/components/jarvis/jarvis-store";

const projects = [
  { name: "ДЖАРВИС AI Core", progress: 85, status: "deploying", desc: "Версия: v2.4.1 · Сборка: 5732 · Узлы: 12" },
  { name: "Next.js Admin Template", progress: 100, status: "completed", desc: "Готово · Развернуто на 12 узлах" },
  { name: "Database Migration", progress: 45, status: "syncing", desc: "Синхронизация данных · Этап 2 из 4" },
  { name: "Neural Data Pipeline", progress: 72, status: "running", desc: "Обработка потоков · Задержка: 68ms" },
];

const tasks = [
  { name: "Building dependencies", agent: "Terminal", time: "12s ago" },
  { name: "Analyzing page.tsx", agent: "Planner", time: "45s ago" },
  { name: "Fetching repos", agent: "GitHub", time: "1m ago" },
];

const agents = [
  { name: "DevOps", status: "idle", load: 5 },
  { name: "Research", status: "active", load: 85 },
  { name: "Coder", status: "active", load: 60 },
];

const memory = [
  { file: "OsOperationsHub.tsx", type: "code", time: "Just now" },
  { file: "page.tsx", type: "layout", time: "2m ago" },
  { file: "API route (os-metrics)", type: "api", time: "5m ago" },
];

const notifications = [
  { msg: "Agent 'Coder' updated 3 files.", type: "success" },
  { msg: "CPU Load reached 85%", type: "warn" },
  { msg: "Build completed successfully.", type: "info" },
];

type TabId = 'projects' | 'tasks' | 'agents' | 'memory' | 'notifications' | 'chats' | 'archive' | 'music';

const tabs: { id: TabId; label: string; icon: typeof FolderKanban }[] = [
  { id: 'projects', label: 'Проекты', icon: FolderKanban },
  { id: 'tasks', label: 'Задачи', icon: Cog },
  { id: 'agents', label: 'Агенты', icon: Users },
  { id: 'memory', label: 'Память', icon: HardDrive },
  { id: 'chats', label: 'Чаты', icon: MessageSquare },
  { id: 'archive', label: 'Файлы', icon: Archive },
  { id: 'music', label: 'Музыка', icon: Music },
  { id: 'notifications', label: 'Алерты', icon: Bell },
];

export function OsOperationsHub() {
  const [activeTab, setActiveTab] = useState<TabId>('projects');
  const archivedFiles = useJarvisStore((s) => s.archivedFiles);
  const musicFiles = useMemo(
    () => archivedFiles.filter((f) => f.folder === "music" || f.type === "music"),
    [archivedFiles]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: TabId } | undefined;
      const tab = detail?.tab;
      if (tab && tabs.some((t) => t.id === tab)) setActiveTab(tab);
    };
    window.addEventListener('jarvis:set-hub-tab', handler);
    return () => window.removeEventListener('jarvis:set-hub-tab', handler);
  }, []);

  return (
    <div className="h-full flex flex-col glass-panel-strong p-4 space-y-4 relative overflow-hidden border-r-2 border-r-cyan-400">
      {/* Tabs Row */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-2 border-b border-cyan-400/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-200 shrink-0",
                isActive
                  ? "bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_10px_rgba(34,211,238,0.15)]"
                  : "text-zinc-500 hover:text-cyan-300 hover:bg-white/[0.03] border border-transparent"
              )}
            >
              <Icon className={cn("h-3 w-3", isActive && "text-cyan-300")} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[250px] h-[calc(100%-3rem)] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 absolute inset-0 flex flex-col"
          >
            {activeTab === 'projects' && projects.map((p, i) => (
              <div key={i} className="flex flex-col gap-1 p-2 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_5px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-100">{p.name}</span>
                  <span className={`text-[8px] uppercase tracking-wider ${p.progress === 100 ? 'text-lime-400' : 'text-cyan-400'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="h-0.5 flex-1 bg-zinc-800 rounded mr-3 overflow-hidden shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
                    <div className={`h-full ${p.progress === 100 ? 'bg-lime-400 shadow-[0_0_5px_rgba(163,230,53,0.8)]' : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]'}`} style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">{p.progress}%</span>
                </div>
              </div>
            ))}

            {activeTab === 'tasks' && tasks.map((t, i) => (
              <div key={i} className="flex flex-col gap-1 px-2 py-1.5 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
                <span className="text-[10px] text-zinc-300">{t.name}</span>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-cyan-500">@{t.agent}</span>
                  <span className="text-[8px] text-zinc-600">{t.time}</span>
                </div>
              </div>
            ))}

            {activeTab === 'agents' && agents.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
                <span className="text-[10px] text-cyan-100">{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-mono uppercase ${a.status === 'active' ? 'text-lime-400 drop-shadow-[0_0_5px_currentColor]' : 'text-zinc-500'}`}>{a.status}</span>
                  <div className="w-10 h-1 bg-zinc-800 rounded overflow-hidden">
                    <div className={`h-full ${a.load > 80 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${a.load}%` }} />
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'memory' && memory.map((m, i) => (
              <div key={i} className="flex flex-col gap-1 px-2 py-1.5 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
                <span className="text-[10px] text-zinc-300 font-mono truncate">{m.file}</span>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-purple-400 uppercase tracking-widest">{m.type}</span>
                  <span className="text-[8px] text-zinc-600">{m.time}</span>
                </div>
              </div>
            ))}

            {activeTab === 'notifications' && notifications.map((n, i) => (
              <div key={i} className={`p-2 rounded bg-zinc-900/50 border text-[10px] shadow-[inset_0_1px_rgba(255,255,255,0.05)] ${n.type === 'warn' ? 'border-amber-400/30 text-amber-300' : n.type === 'success' ? 'border-lime-400/30 text-lime-300' : 'border-cyan-400/10 text-cyan-100'}`}>
                {n.msg}
              </div>
            ))}

            {activeTab === 'chats' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                <JarvisChatList />
              </div>
            )}

            {activeTab === 'archive' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                <JarvisArchiveList />
              </div>
            )}

            {activeTab === 'music' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                {musicFiles.length === 0 ? (
                  <div className="text-[10px] text-zinc-500 font-mono text-center py-6">
                    Папка «Музыка» пуста. Скажите «сгенерируй музыку ...» или перетащите файлы сюда.
                  </div>
                ) : (
                  musicFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded bg-zinc-900/50 border border-cyan-400/10 p-2 flex flex-col gap-1"
                    >
                      <span className="text-[10px] text-zinc-300 font-mono truncate">{file.prompt || file.url.split("/").pop() || "Трек"}</span>
                      <audio controls src={file.url} className="w-full h-8 opacity-80" />
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
