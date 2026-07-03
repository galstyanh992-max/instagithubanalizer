"use client";

import { motion } from "framer-motion";
import { Upload, ScanLine, GitBranch, Brain, Gauge, Flag } from "lucide-react";

const STAGES = [
  { icon: Upload, label: "Загрузка" },
  { icon: ScanLine, label: "OCR" },
  { icon: GitBranch, label: "Резолв" },
  { icon: Brain, label: "Анализ" },
  { icon: Gauge, label: "Оценка" },
  { icon: Flag, label: "Вердикт" },
];

export default function PipelineViz({ active = 0 }: { active?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === active;
        const isDone = i < active;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{
                opacity: isActive ? 1 : isDone ? 0.85 : 0.4,
                scale: isActive ? 1.15 : 1,
              }}
              transition={{ duration: 0.4 }}
              className={`relative flex h-12 w-12 items-center justify-center rounded-lg border ${
                isActive
                  ? "border-cyan-400 bg-cyan-500/20"
                  : isDone
                    ? "border-lime-400/40 bg-lime-500/10"
                    : "border-zinc-700 bg-zinc-800/40"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-cyan-300" : isDone ? "text-lime-300" : "text-zinc-500"
                }`}
              />
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-cyan-400"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
            </motion.div>
            <div className="hidden md:block text-xs">
              <div className={isActive ? "text-cyan-300" : "text-zinc-400"}>
                {s.label}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="mx-1 h-px w-6 bg-gradient-to-r from-cyan-400/60 to-fuchsia-400/60 md:w-10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
