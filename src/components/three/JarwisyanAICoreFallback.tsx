"use client";

import { useEffect, useState } from "react";

// ============================================================
// Jarwisyan AI Core — LIVING Neural Hologram (Premium)
// ============================================================
// Концепт "живого 3D AI Core" — не просто объект, а визуально разумное,
// дышащее, реагирующее энергетическое ядро ИИ.
//
// Состояния: calm | thinking | active | warning | overload
// Реакции: breathing pulse, neural firing, energy flow, scan sweep
// Материалы: liquid glass, plasma membrane, neural lattice, white-hot core

export type JarwisyanAICoreFallbackProps = {
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  reducedMotion?: boolean;
  compact?: boolean;
  className?: string;
  /** Состояние ядра — определяет цвет, скорость, интенсивность */
  state?: "calm" | "thinking" | "active" | "warning" | "overload";
};

const SIZE_MAP = {
  sm: { px: 200, core: 70 },
  md: { px: 300, core: 110 },
  lg: { px: 460, core: 170 },
  xl: { px: 560, core: 210 },
};

// Neural network — brain-like structure
const NEURAL_NODES = [
  { x: 50, y: 50, r: 2.5, bright: true },
  { x: 35, y: 35, r: 1.2 }, { x: 65, y: 35, r: 1.2 },
  { x: 35, y: 65, r: 1.2 }, { x: 65, y: 65, r: 1.2 },
  { x: 50, y: 22, r: 1 }, { x: 50, y: 78, r: 1 },
  { x: 22, y: 50, r: 1 }, { x: 78, y: 50, r: 1 },
  { x: 28, y: 28, r: 0.8 }, { x: 72, y: 28, r: 0.8 },
  { x: 28, y: 72, r: 0.8 }, { x: 72, y: 72, r: 0.8 },
  { x: 42, y: 42, r: 0.6 }, { x: 58, y: 42, r: 0.6 },
  { x: 42, y: 58, r: 0.6 }, { x: 58, y: 58, r: 0.6 },
  { x: 40, y: 30, r: 0.5 }, { x: 60, y: 30, r: 0.5 },
  { x: 40, y: 70, r: 0.5 }, { x: 60, y: 70, r: 0.5 },
  { x: 20, y: 40, r: 0.4 }, { x: 80, y: 40, r: 0.4 },
  { x: 20, y: 60, r: 0.4 }, { x: 80, y: 60, r: 0.4 },
  { x: 45, y: 15, r: 0.5 }, { x: 55, y: 15, r: 0.5 },
  { x: 45, y: 85, r: 0.5 }, { x: 55, y: 85, r: 0.5 },
];

const NEURAL_LINKS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 2], [2, 4], [4, 3], [3, 1], [1, 5], [2, 6], [3, 7], [4, 8],
  [1, 9], [2, 10], [3, 11], [4, 12],
  [0, 13], [0, 14], [0, 15], [0, 16],
  [13, 14], [14, 16], [16, 15], [15, 13],
  [5, 17], [5, 18], [6, 19], [6, 20],
  [1, 17], [2, 18], [3, 19], [4, 20],
  [9, 7], [10, 8], [11, 7], [12, 8],
  [1, 21], [2, 22], [3, 23], [4, 24],
  [5, 25], [5, 26], [6, 27], [6, 28],
  [21, 9], [22, 10], [23, 11], [24, 12],
];

// State configs — каждый state меняет цвет, скорость, интенсивность
const STATE_CONFIG = {
  calm: {
    primary: "#22d3ee", secondary: "#38bdf8", inner: "#67e8f9",
    accent: "#a3e635", white: "#ECFEFF", violet: "rgba(139, 92, 246, 0.12)",
    breatheSpeed: "4s", pulseOpacity: 0.6, glowSize: 100, ringOpacity: 0.55,
    label: "Спокойствие",
  },
  thinking: {
    primary: "#38bdf8", secondary: "#818cf8", inner: "#a5b4fc",
    accent: "#a3e635", white: "#ECFEFF", violet: "rgba(139, 92, 246, 0.18)",
    breatheSpeed: "2.5s", pulseOpacity: 0.8, glowSize: 120, ringOpacity: 0.7,
    label: "Анализ",
  },
  active: {
    primary: "#22d3ee", secondary: "#67e8f9", inner: "#ECFEFF",
    accent: "#a3e635", white: "#ffffff", violet: "rgba(139, 92, 246, 0.10)",
    breatheSpeed: "1.8s", pulseOpacity: 0.95, glowSize: 140, ringOpacity: 0.85,
    label: "Активен",
  },
  warning: {
    primary: "#fbbf24", secondary: "#f59e0b", inner: "#fde68a",
    accent: "#f97316", white: "#FFFBEB", violet: "rgba(139, 92, 246, 0.08)",
    breatheSpeed: "1.2s", pulseOpacity: 0.85, glowSize: 110, ringOpacity: 0.75,
    label: "Внимание",
  },
  overload: {
    primary: "#f87171", secondary: "#ef4444", inner: "#fca5a5",
    accent: "#fbbf24", white: "#FEF2F2", violet: "rgba(139, 92, 246, 0.05)",
    breatheSpeed: "0.8s", pulseOpacity: 1, glowSize: 130, ringOpacity: 0.9,
    label: "Перегрузка",
  },
} as const;

export function JarwisyanAICoreFallback(props: JarwisyanAICoreFallbackProps) {
  const { size = "md", active = false, reducedMotion = false, compact = false, className, state = "calm" } = props;
  const [systemReduced, setSystemReduced] = useState(false);
  // Auto-cycle states for "living" feeling when active
  const [liveState, setLiveState] = useState(state);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setSystemReduced(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // When active, cycle through thinking → active → calm to simulate "living"
  useEffect(() => {
    if (!active || reducedMotion) return;
    const t1 = setTimeout(() => setLiveState("thinking"), 100);
    const t2 = setTimeout(() => setLiveState("active"), 3000);
    const t3 = setTimeout(() => setLiveState("calm"), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active, reducedMotion]);

  const motionOff = reducedMotion || systemReduced;
  const dim = SIZE_MAP[size];
  const cfg = STATE_CONFIG[liveState];

  return (
    <div
      className={`relative mx-auto ${className ?? ""}`}
      style={{
        width: "100%",
        maxWidth: dim.px,
        aspectRatio: "1 / 1",
        background: "transparent",
      }}
      role="img"
      aria-label={`Ядро ИИ Jarwisyan — ${cfg.label}`}
    >
      {/* === Outer aura — soft volumetric glow === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${cfg.primary}${Math.round(cfg.glowSize * 0.4).toString(16).padStart(2, "0")} 0%, ${cfg.violet} 40%, transparent 70%)`,
          filter: "blur(30px)",
          opacity: cfg.pulseOpacity * 0.6,
          animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
        }}
      />

      {/* === HUD Ring outer — tick marks === */}
      <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.3 }}>
        <circle cx="50" cy="50" r="48" fill="none" stroke={cfg.primary} strokeWidth="0.15" strokeDasharray="0.5 2" />
        <circle cx="50" cy="50" r="48" fill="none" stroke={cfg.primary} strokeWidth="0.1" opacity="0.5" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x1 = 50 + 47 * Math.cos(angle);
          const y1 = 50 + 47 * Math.sin(angle);
          const x2 = 50 + 45 * Math.cos(angle);
          const y2 = 50 + 45 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={cfg.primary} strokeWidth="0.2" opacity="0.4" />;
        })}
      </svg>

      {/* === Orbit Ring 1 — primary, rotating === */}
      <svg
        aria-hidden viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : "ai-core-spin-slow"}`}
        style={{ filter: `drop-shadow(0 0 6px ${cfg.primary}66)`, opacity: cfg.ringOpacity }}
      >
        <ellipse cx="50" cy="50" rx="44" ry="44" fill="none" stroke={cfg.primary} strokeWidth="0.3" strokeDasharray="4 2" />
      </svg>

      {/* === Orbit Ring 2 — secondary, tilted, counter-rotating === */}
      {!compact && (
        <svg
          aria-hidden viewBox="0 0 100 100"
          className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : "ai-core-spin-reverse"}`}
          style={{ filter: `drop-shadow(0 0 5px ${cfg.secondary}55)`, opacity: cfg.ringOpacity * 0.8 }}
        >
          <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke={cfg.secondary} strokeWidth="0.3" strokeDasharray="6 3" transform="rotate(30 50 50)" />
        </svg>
      )}

      {/* === Orbit Ring 3 — accent, very tilted === */}
      <svg
        aria-hidden viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : "ai-core-spin-fast"}`}
        style={{ filter: `drop-shadow(0 0 4px ${cfg.accent}55)`, opacity: cfg.ringOpacity * 0.6 }}
      >
        <ellipse cx="50" cy="50" rx="36" ry="10" fill="none" stroke={cfg.accent} strokeWidth="0.2" transform="rotate(-45 50 50)" />
      </svg>

      {/* === Glass sphere — liquid glass + plasma membrane === */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: dim.core * 1.4,
          height: dim.core * 1.4,
          background: `
            radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9), transparent 0 12%),
            radial-gradient(circle at 50% 50%, ${cfg.white}99, ${cfg.inner}73 20%, ${cfg.primary}4D 40%, rgba(15,23,42,0.15) 72%, transparent 100%)
          `,
          boxShadow: `
            inset 0 0 50px ${cfg.inner}99,
            inset 0 0 20px rgba(255,255,255,0.3),
            0 0 ${cfg.glowSize}px ${cfg.primary}80,
            0 0 ${cfg.glowSize * 0.5}px ${cfg.white}59
          `,
          border: `1px solid ${cfg.inner}99`,
          animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
        }}
      >
        {/* === Subsurface energy flow — inner moving gradient === */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ opacity: cfg.pulseOpacity * 0.7 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${cfg.primary}40 25%, transparent 50%, ${cfg.secondary}30 75%, transparent 100%)`,
              animation: motionOff ? "none" : "ai-core-spin-slow 8s linear infinite",
              filter: "blur(8px)",
            }}
          />
        </div>

        {/* === Neural Network — brain-like lattice === */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {/* Connection lines — base layer */}
          <g stroke={cfg.inner} strokeWidth="0.2" opacity="0.5" fill="none">
            {NEURAL_LINKS.map(([a, b], i) => (
              <line key={i} x1={NEURAL_NODES[a].x} y1={NEURAL_NODES[a].y} x2={NEURAL_NODES[b].x} y2={NEURAL_NODES[b].y} />
            ))}
          </g>
          {/* Pulsing connection lines — neural firing */}
          <g stroke={cfg.white} strokeWidth="0.15" opacity="0.7" fill="none">
            {NEURAL_LINKS.slice(0, 12).map(([a, b], i) => (
              <line
                key={`p${i}`}
                x1={NEURAL_NODES[a].x} y1={NEURAL_NODES[a].y}
                x2={NEURAL_NODES[b].x} y2={NEURAL_NODES[b].y}
                opacity={motionOff ? 0.5 : undefined}
                style={motionOff ? undefined : { animation: `ai-core-breathe ${1.5 + (i % 4) * 0.3}s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </g>
          {/* Neural nodes — neurons */}
          <g>
            {NEURAL_NODES.map((node, i) => (
              <circle
                key={i}
                cx={node.x} cy={node.y} r={node.r}
                fill={node.bright ? cfg.white : cfg.inner}
                opacity={node.bright ? 0.95 : 0.7}
                style={motionOff ? undefined : { animation: `ai-core-breathe ${1.5 + (i % 5) * 0.2}s ease-in-out ${i * 0.08}s infinite` }}
              />
            ))}
          </g>
          {/* Neural firing — bright pulses traveling along connections */}
          {!motionOff && liveState !== "calm" && (
            <g>
              {NEURAL_LINKS.slice(0, 5).map(([a, b], i) => {
                const nodeA = NEURAL_NODES[a];
                const nodeB = NEURAL_NODES[b];
                return (
                  <circle key={`f${i}`} r="0.6" fill={cfg.white}>
                    <animate
                      attributeName="cx"
                      values={`${nodeA.x};${nodeB.x}`}
                      dur={`${1 + i * 0.3}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.4}s`}
                    />
                    <animate
                      attributeName="cy"
                      values={`${nodeA.y};${nodeB.y}`}
                      dur={`${1 + i * 0.3}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.4}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;0"
                      dur={`${1 + i * 0.3}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.4}s`}
                    />
                  </circle>
                );
              })}
            </g>
          )}
        </svg>

        {/* === White-hot core — consciousness center === */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: dim.core * 0.25,
            height: dim.core * 0.25,
            background: `radial-gradient(circle, rgba(255,255,255,1) 0%, ${cfg.white}B3 40%, transparent 80%)`,
            filter: "blur(3px)",
            animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
          }}
        />

        {/* === Scan sweep — scanning line that rotates === */}
        {!motionOff && (
          <div
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${cfg.white}33 50%, transparent 100%)`,
              backgroundSize: "100% 8px",
              animation: "ai-core-scan 4s linear infinite",
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* === Energy membrane shimmer — subtle surface ripple === */}
        {!motionOff && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${cfg.white}22, transparent 40%)`,
              animation: `ai-core-breathe ${cfg.breatheSpeed} ease-in-out 0.5s infinite`,
              mixBlendMode: "screen",
            }}
          />
        )}
      </div>

      {/* === Orbit particles — energy dots === */}
      {!compact && !motionOff && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{
              background: cfg.inner,
              boxShadow: `0 0 10px ${cfg.inner}, 0 0 20px ${cfg.primary}`,
              animation: "ai-core-orbit-1 7s linear infinite",
              transformOrigin: "0 0",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
            style={{
              background: cfg.accent,
              boxShadow: `0 0 8px ${cfg.accent}`,
              animation: "ai-core-orbit-2 9s linear infinite reverse",
              transformOrigin: "0 0",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
            style={{
              background: cfg.white,
              boxShadow: `0 0 8px ${cfg.white}`,
              animation: "ai-core-orbit-3 11s linear infinite",
              transformOrigin: "0 0",
            }}
          />
        </>
      )}

      {/* === State label — subtle indicator === */}
      {!compact && (
        <div
          aria-hidden
          className="absolute left-1/2 bottom-[5%] -translate-x-1/2 text-[8px] uppercase tracking-[0.3em] font-mono opacity-40"
          style={{ color: cfg.primary }}
        >
          {cfg.label}
        </div>
      )}
    </div>
  );
}

export default JarwisyanAICoreFallback;
