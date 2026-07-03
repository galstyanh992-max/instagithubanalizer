"use client";

import { motion } from "framer-motion";

export default function VoiceWaveform({ active = false }: { active?: boolean }) {
  const bars = 24;
  return (
    <div className="flex h-16 items-center justify-center gap-1">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-fuchsia-400"
          animate={
            active
              ? {
                  height: [
                    `${10 + Math.random() * 8}px`,
                    `${20 + Math.random() * 40}px`,
                    `${10 + Math.random() * 8}px`,
                  ],
                }
              : { height: "8px" }
          }
          transition={{
            duration: 0.4 + (i % 4) * 0.1,
            repeat: active ? Infinity : 0,
            delay: i * 0.02,
          }}
        />
      ))}
    </div>
  );
}
