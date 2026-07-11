"use client";

import { motion } from "framer-motion";
import { TaskListSidebar } from "@/components/sidebar/task-list-sidebar";
import JarwisyanAICore from "@/components/three/JarwisyanAICore";

import { OsSystemStatus } from "@/components/os/OsSystemStatus";
import { OsOperationsHub } from "@/components/os/OsOperationsHub";
import { OsConsole } from "@/components/os/OsConsole";
import { MacDock } from "@/components/layout/mac-dock";

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden absolute inset-0 pt-24">
      
      {/* 3-Column Layout Area */}
      <div className="flex-1 w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 px-4 py-4 z-10 overflow-hidden relative perspective-[2000px]">
        
        {/* Left Column */}
        <motion.div 
          initial={{ opacity: 0, x: -30, rotateY: 15 }}
          animate={{ opacity: 1, x: 0, rotateY: 15 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-24 [transform-style:preserve-3d] shadow-[-20px_0_50px_rgba(34,211,238,0.05)] rounded-2xl"
        >
          <OsSystemStatus />
        </motion.div>

        {/* Center Column: Global AI Core Space */}
        <div className="hidden lg:flex flex-col items-center justify-between relative min-h-[500px] z-20">
          <div className="flex-1" /> {/* Spacer for Core to be visible from layout.tsx background */}
        </div>

        {/* Right Column */}
        <motion.div 
          initial={{ opacity: 0, x: 30, rotateY: -15 }}
          animate={{ opacity: 1, x: 0, rotateY: -15 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-24 justify-self-end w-full [transform-style:preserve-3d] shadow-[20px_0_50px_rgba(34,211,238,0.05)] rounded-2xl"
        >
          <OsOperationsHub />
        </motion.div>
        
      </div>

      {/* Bottom Area: AI Console */}
      <OsConsole />

      {/* MacOS Style Dock */}
      <MacDock />

    </div>
  );
}
