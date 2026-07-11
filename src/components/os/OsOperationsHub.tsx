"use client";

import { useState } from "react";
import { FolderKanban, Cog, Users, HardDrive, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const projects = [
  { name: "ДЖАРВИС AI Core", progress: 85, status: "deploying" },
  { name: "Next.js Admin Template", progress: 100, status: "completed" },
  { name: "Supabase Migration", progress: 45, status: "syncing" },
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

type TabId = 'projects' | 'tasks' | 'agents' | 'memory' | 'notifications';

export function OsOperationsHub() {
  const [activeTab, setActiveTab] = useState<TabId>('projects');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'tasks', label: 'Tasks', icon: Cog },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'memory', label: 'Memory', icon: HardDrive },
    { id: 'notifications', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="border border-cyan-500/30 bg-gradient-to-br from-zinc-950/90 to-zinc-900/90 rounded-2xl p-4 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-xl transition-all duration-500 relative overflow-hidden group">
      
      {/* Tabs Row */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-2 border-b border-cyan-400/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${
                isActive 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[inset_0_1px_rgba(255,255,255,0.2),0_0_10px_rgba(34,211,238,0.3)]' 
                  : 'text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <Icon className={`h-3 w-3 ${isActive ? 'drop-shadow-[0_0_5px_currentColor] animate-pulse' : ''} ${tab.id === 'tasks' && isActive ? 'animate-spin-slow' : ''}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[250px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 absolute inset-0"
          >
            {activeTab === 'projects' && projects.map((p, i) => (
              <div key={i} className="flex flex-col gap-1 p-2 rounded bg-zinc-900/50 border border-cyan-400/10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_2px_5px_rgba(0,0,0,0.2)]">
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
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
