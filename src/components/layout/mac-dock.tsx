"use client";

import { motion } from "framer-motion";
import { 
  FolderKanban, Github, Terminal, Globe, Folder, 
  HardDrive, Calendar, Settings, Server, Code2 
} from "lucide-react";

export function MacDock() {
  const items = [
    { icon: FolderKanban, label: "Projects", color: "text-blue-400" },
    { icon: Github, label: "GitHub", color: "text-zinc-200" },
    { icon: Terminal, label: "Terminal", color: "text-green-400" },
    { icon: Globe, label: "Browser", color: "text-cyan-400" },
    { icon: Folder, label: "Files", color: "text-amber-400" },
    { icon: HardDrive, label: "Memory", color: "text-purple-400" },
    { icon: Calendar, label: "Calendar", color: "text-red-400" },
    { icon: Settings, label: "Settings", color: "text-zinc-400" },
    { icon: Server, label: "Docker", color: "text-blue-500" },
    { icon: Code2, label: "VSCode", color: "text-sky-400" },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 group">
      {/* Invisible hover area to trigger dock appearing if it was hidden, but user asked for auto-hide or always visible. Let's make it always visible but slightly translucent until hovered for a sleek look */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
        className="flex items-start gap-2 p-2 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-xl shadow-2xl transition-all hover:bg-zinc-900/90"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="relative group/item flex flex-col items-center">
              {/* Tooltip */}
              <div className="absolute -bottom-10 bg-zinc-900/90 border border-cyan-500/30 text-cyan-50 text-[10px] px-2 py-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                {item.label}
              </div>
              
              <button className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 hover:border-cyan-500/50 flex items-center justify-center hover:translate-y-2 active:translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_rgba(255,255,255,0.1),inset_0_-2px_rgba(0,0,0,0.6),0_5px_15px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_rgba(255,255,255,0.2),inset_0_-2px_rgba(0,0,0,0.4),0_0_20px_rgba(34,211,238,0.4)]">
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.color} drop-shadow-[0_0_8px_currentColor] group-hover/item:animate-pulse`} />
              </button>
              
              {/* Active dot indicator (mock active for a few) */}
              {i % 3 === 0 && (
                <div className="h-1 w-1 rounded-full bg-zinc-400 mt-1 absolute -bottom-1.5" />
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
