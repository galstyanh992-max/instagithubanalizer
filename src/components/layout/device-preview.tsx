"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Laptop, Terminal, Globe, FileText, Cpu } from "lucide-react";

export function DevicePreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full max-w-[800px] aspect-video group", className)}>
      {/* Floating MacBook / Device Frame */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full h-full rounded-[2rem] border-[8px] border-zinc-800 bg-zinc-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7),0_0_40px_rgba(34,211,238,0.1)] overflow-hidden"
      >
        {/* Screen Bezel */}
        <div className="absolute inset-0 p-1 bg-gradient-to-b from-zinc-700/20 to-transparent z-10 pointer-events-none" />
        
        {/* "Live" Workspace Content */}
        <div className="relative w-full h-full bg-background overflow-hidden flex flex-col">
          {/* Mock OS Header */}
          <div className="h-6 bg-zinc-800/50 border-b border-white/5 flex items-center px-3 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            <div className="flex-1" />
            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">Jarvis_Workspace_v4.2</div>
          </div>

          {/* Mock IDE / App Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Mock Sidebar */}
            <div className="w-12 border-r border-white/5 bg-zinc-900/50 flex flex-col items-center py-4 gap-4">
              <div className="w-6 h-6 rounded bg-cyan-400/20 border border-cyan-400/30" />
              <div className="w-6 h-6 rounded bg-zinc-800" />
              <div className="w-6 h-6 rounded bg-zinc-800" />
            </div>
            
            {/* Mock Editor Area */}
            <div className="flex-1 flex flex-col">
              <div className="h-8 bg-zinc-800/30 border-b border-white/5 flex items-center px-3 gap-4">
                <div className="text-[9px] font-mono text-cyan-300/60">index.ts</div>
                <div className="text-[9px] font-mono text-zinc-600">package.json</div>
              </div>
              <div className="flex-1 p-4 font-mono text-[10px] space-y-2">
                <div className="h-2 w-3/4 bg-cyan-400/10 rounded" />
                <div className="h-2 w-1/2 bg-zinc-800 rounded" />
                <div className="h-2 w-2/3 bg-zinc-800 rounded" />
                <div className="h-2 w-4/5 bg-cyan-400/10 rounded" />
                <div className="h-2 w-1/3 bg-zinc-800 rounded" />
                <div className="pt-4 h-2 w-1/2 bg-zinc-800 rounded" />
                <div className="h-2 w-3/4 bg-zinc-800 rounded" />
              </div>
            </div>

            {/* Right Mock Inspector */}
            <div className="w-48 border-l border-white/5 bg-zinc-900/30 p-3 space-y-4">
              <div className="h-3 w-full bg-zinc-800 rounded" />
              <div className="space-y-2">
                <div className="h-2 w-full bg-zinc-800/50 rounded" />
                <div className="h-2 w-full bg-zinc-800/50 rounded" />
                <div className="h-2 w-2/3 bg-zinc-800/50 rounded" />
              </div>
              <div className="h-12 w-full rounded bg-cyan-400/5 border border-cyan-400/20" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Holographic Glow under device */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-cyan-500/10 blur-[60px] rounded-full -z-10" />
    </div>
  );
}
