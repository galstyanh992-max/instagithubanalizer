"use client";

import { motion } from "framer-motion";
import JarwisyanAICore from "@/components/three/JarwisyanAICore";
import { JarwisyanChatPanel } from "@/components/chat/JarwisyanChatPanel";

export default function Home() {
  return (
    <div className="cosmic-page-shell mx-auto flex max-w-5xl flex-col items-center justify-center gap-6 py-6 lg:py-10">
      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/5 px-4 py-1.5 text-[10px] uppercase tracking-widest text-cyan-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
        Система онлайн · Ядро активно
      </motion.div>

      {/* Hero title — крупный градиент */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center"
      >
        <h1 className="jarwisyan-title">AI JARWISYAN</h1>
        <p className="jarwisyan-subtitle mt-3">Repository Intelligence Core</p>
      </motion.div>

      {/* AI Core — большой, сияющий, на platform */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="ai-core-stage relative flex items-center justify-center overflow-visible w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[500px] py-4"
      >
        <JarwisyanAICore size="xl" active state="thinking" />
      </motion.div>

      {/* Jarwisyan Signal Console */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-full max-w-3xl"
      >
        <JarwisyanChatPanel />
      </motion.div>
    </div>
  );
}
