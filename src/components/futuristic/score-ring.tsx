"use client";

import { motion } from "framer-motion";

export function ScoreRing({
  value,
  max = 100,
  size = 80,
  label,
  color = "#22d3ee",
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <defs>
            <linearGradient id={`grad-${label ?? "x"}-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#grad-${label ?? "x"}-${color})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-bold" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</span>
      )}
    </div>
  );
}
