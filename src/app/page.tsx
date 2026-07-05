"use client";

import { motion } from "framer-motion";
import { TaskListSidebar } from "@/components/sidebar/task-list-sidebar";
import JarwisyanAICore from "@/components/three/JarwisyanAICore";

import { OsSystemStatus } from "@/components/os/OsSystemStatus";
import { OsModelsList } from "@/components/os/OsModelsList";
import { OsAgentsRoster } from "@/components/os/OsAgentsRoster";
import { OsMemoryTree } from "@/components/os/OsMemoryTree";
import { OsTimeline } from "@/components/os/OsTimeline";
import { OsActiveProjects } from "@/components/os/OsActiveProjects";
import { OsRunningTasks } from "@/components/os/OsRunningTasks";
import { OsNotifications } from "@/components/os/OsNotifications";
import { OsConsole } from "@/components/os/OsConsole";
import { MacDock } from "@/components/layout/mac-dock";

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden absolute inset-0 pt-10">
      
      {/* 3-Column Layout Area */}
      <div className="flex-1 w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 px-4 py-4 z-10 overflow-hidden relative">
        
        {/* Left Column */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-24"
        >
          <OsSystemStatus />
          <OsModelsList />
          <OsAgentsRoster />
          <OsMemoryTree />
        </motion.div>

        {/* Center Column: Global AI Core Space + Timeline + Orbits */}
        <div className="hidden lg:flex flex-col items-center justify-between relative min-h-[500px]">
          
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center -mt-20">
             {/* 3D Core Handles Orbits now */}
          </div>

          <div className="flex-1" /> {/* Spacer for Core */}

          <div className="w-full relative z-10 pb-10">
            <OsTimeline />
          </div>
        </div>

        {/* Right Column */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-24 justify-self-end w-full"
        >
          <OsActiveProjects />
          <OsRunningTasks />
          <OsNotifications />
        </motion.div>
        
      </div>

      {/* Bottom Area: AI Console */}
      <OsConsole />

      {/* MacOS Style Dock */}
      <MacDock />

    </div>
  );
}
