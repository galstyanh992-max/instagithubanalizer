"use client";

import { motion } from "framer-motion";
import { TaskListSidebar } from "@/components/sidebar/task-list-sidebar";
import JarwisyanAICore from "@/components/three/JarwisyanAICore";

export default function Home() {
  return (
    <div className="cosmic-page-shell flex flex-1 h-full w-full flex-col overflow-hidden min-h-0">
      
      {/* Top Header */}
      <div className="flex flex-col items-center justify-center pt-2 pb-2 z-10 gap-2 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="jarwisyan-title text-xl md:text-2xl tracking-[0.3em] font-light opacity-90">J.A.R.V.I.S</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-[10px] uppercase tracking-widest text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
          Система онлайн · Ядро активно
        </motion.div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 px-4 pb-4 items-center z-10 min-h-0">
        
        {/* Left Column: Merged Panels */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col w-[280px]"
        >
          <div className="cyber-panel p-5 flex flex-col gap-6">
            <div>
              <h2 className="cyber-panel-header">System Status</h2>
              <div className="flex flex-col gap-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-500">ONLINE</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse"></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-200/50">CORE TEMP</span>
                  <span className="text-cyan-100">36.7°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-200/50">MEMORY</span>
                  <span className="text-cyan-100">78%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-200/50">NETWORK</span>
                  <span className="text-cyan-400">SECURE</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-cyan-400/10">
              <h2 className="cyber-panel-header mt-2">Repository Matrix</h2>
              <div className="h-[120px] relative w-full opacity-80">
                <svg width="100%" height="100%" viewBox="0 0 200 100">
                  <motion.path 
                    d="M10,50 L40,30 L70,60 L120,20 L160,70 L190,40" 
                    fill="none" 
                    stroke="rgba(34,211,238,0.5)" 
                    strokeWidth="1.5" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                  />
                  <motion.path 
                    d="M10,50 L40,30 L70,60 L120,20 L160,70 L190,40" 
                    fill="none" 
                    stroke="rgba(34,211,238,1)" 
                    strokeWidth="2" 
                    strokeDasharray="4 20"
                    animate={{ strokeDashoffset: [24, 0] }}
                    transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                  />
                  {[
                    { cx: 10, cy: 50, color: "#22d3ee", delay: 0 },
                    { cx: 40, cy: 30, color: "#a3e635", delay: 0.2 },
                    { cx: 70, cy: 60, color: "#22d3ee", delay: 0.4 },
                    { cx: 120, cy: 20, color: "#e879f9", delay: 0.6 },
                    { cx: 160, cy: 70, color: "#22d3ee", delay: 0.8 },
                    { cx: 190, cy: 40, color: "#a3e635", delay: 1 },
                  ].map((node, i) => (
                    <motion.circle 
                      key={i}
                      cx={node.cx} 
                      cy={node.cy} 
                      fill={node.color} 
                      animate={{ r: [2, 4, 2], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, delay: node.delay, repeat: Infinity }}
                    />
                  ))}
                  {/* Data points */}
                  <motion.path 
                    d="M10,90 L40,80 L70,85 L120,70 L160,88 L190,80" 
                    fill="none" 
                    stroke="rgba(168,85,247,0.3)" 
                    strokeWidth="1" 
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center Column: Empty space for Global AI Core to show through */}
        <div className="hidden lg:block w-full max-w-[400px] lg:max-w-[550px] mx-auto min-h-[500px]" />

        {/* Right Column: Merged Panels */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col w-[280px] justify-self-end min-h-0 h-full max-h-full"
        >
          <TaskListSidebar />
        </motion.div>
        
      </div>
    </div>
  );
}
