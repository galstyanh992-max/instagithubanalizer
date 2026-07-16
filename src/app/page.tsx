"use client";

import { motion } from "framer-motion";
import JarwisyanAICore from "@/components/three/JarwisyanAICore";
import { OsSystemStatus } from "@/components/os/OsSystemStatus";
import { OsOperationsHub } from "@/components/os/OsOperationsHub";
import { JarvisUnifiedConsole } from "@/components/jarvis/jarvis-unified-console";
import DevicePreview from "@/components/DevicePreview";

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full min-h-0 -mx-4 -my-5 lg:-mx-8 lg:-my-6 px-4 py-5 lg:px-8 lg:py-6">
      {/* 3-Column Layout Area */}
      <div className="flex-1 min-h-0 w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr_340px] gap-4 overflow-hidden">
        {/* Left Column — System Monitor */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:flex flex-col h-full min-h-0"
        >
          <OsSystemStatus />
        </motion.div>

        {/* Center Column — AI Core + Command Terminal */}
        <div className="flex flex-col relative h-full min-h-0">
          {/* AI Core sphere */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center pointer-events-none">
            {/* MacBook / Workspace Preview - Layered behind the core */}
            <div className="absolute inset-0 flex items-center justify-center z-0 opacity-40 scale-75 lg:scale-100">
              <DevicePreview className="w-[70%] h-auto" />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[min(520px,85%)] aspect-square z-10">
                <JarwisyanAICore size="xl" />
              </div>
            </div>

            {/* Core labels */}
            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 text-center pointer-events-auto">
              <div className="data-label text-cyan-300/80 mb-1">Системное ядро</div>
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-50 neon-text">
                Стабильно
              </div>
            </div>

            <div className="absolute bottom-[36%] right-[14%] text-center pointer-events-auto">
              <div className="text-2xl font-bold text-cyan-50 neon-text">100%</div>
              <div className="data-label text-cyan-300/70">Синхронизация</div>
            </div>
          </div>

          {/* Command Terminal */}
          <div className="w-full max-w-4xl mx-auto pb-2 z-20">
            <JarvisUnifiedConsole />
          </div>
        </div>

        {/* Right Column — Operations Hub */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:flex flex-col h-full min-h-0"
        >
          <OsOperationsHub />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="hidden lg:flex items-center justify-center pt-2 text-[9px] font-mono uppercase tracking-[0.25em] text-cyan-500/40 z-10">
        JARVIS OS · Premium AI Operating System
      </div>
    </div>
  );
}
