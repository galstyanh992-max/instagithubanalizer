"use client";

import { useEffect, useState } from "react";

// ============================================================
// ДЖАРВИС AI Core — LIVING Neural Hologram (Premium)
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
  state?: "idle" | "thinking" | "processing" | "speaking" | "error" | "critical" | "offline";
};

const SIZE_MAP = {
  sm: { px: 200, core: 110 },
  md: { px: 300, core: 160 },
  lg: { px: 460, core: 240 },
  xl: { px: 560, core: 300 },
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
    breatheSpeed: "7s", pulseOpacity: 0.8, glowSize: 100, ringOpacity: 0.55,
    label: "Спокойствие",
  },
  thinking: {
    primary: "#38bdf8", secondary: "#818cf8", inner: "#a5b4fc",
    accent: "#a3e635", white: "#ECFEFF", violet: "rgba(139, 92, 246, 0.18)",
    breatheSpeed: "5s", pulseOpacity: 0.9, glowSize: 120, ringOpacity: 0.7,
    label: "Анализ",
  },
  processing: {
    primary: "#22d3ee", secondary: "#67e8f9", inner: "#ECFEFF",
    accent: "#a3e635", white: "#ffffff", violet: "rgba(139, 92, 246, 0.10)",
    breatheSpeed: "3s", pulseOpacity: 0.95, glowSize: 140, ringOpacity: 0.85,
    label: "Обработка",
  },
  speaking: {
    primary: "#c084fc", secondary: "#e879f9", inner: "#fbcfe8",
    accent: "#a3e635", white: "#ffffff", violet: "rgba(139, 92, 246, 0.20)",
    breatheSpeed: "2s", pulseOpacity: 0.95, glowSize: 130, ringOpacity: 0.8,
    label: "Синтез",
  },
  active: {
    primary: "#22d3ee", secondary: "#67e8f9", inner: "#ECFEFF",
    accent: "#a3e635", white: "#ffffff", violet: "rgba(139, 92, 246, 0.10)",
    breatheSpeed: "4s", pulseOpacity: 0.9, glowSize: 130, ringOpacity: 0.8,
    label: "Активен",
  },
  warning: {
    primary: "#fbbf24", secondary: "#f59e0b", inner: "#fde68a",
    accent: "#f97316", white: "#FFFBEB", violet: "rgba(139, 92, 246, 0.08)",
    breatheSpeed: "2s", pulseOpacity: 0.85, glowSize: 110, ringOpacity: 0.75,
    label: "Внимание",
  },
  error: {
    primary: "#f97316", secondary: "#ea580c", inner: "#fdba74",
    accent: "#fbbf24", white: "#FFFBEB", violet: "rgba(234, 88, 12, 0.08)",
    breatheSpeed: "1.5s", pulseOpacity: 0.9, glowSize: 120, ringOpacity: 0.8,
    label: "Ошибка",
  },
  critical: {
    primary: "#f87171", secondary: "#ef4444", inner: "#fca5a5",
    accent: "#fbbf24", white: "#FEF2F2", violet: "rgba(139, 92, 246, 0.05)",
    breatheSpeed: "0.8s", pulseOpacity: 1, glowSize: 130, ringOpacity: 0.9,
    label: "Критическая ошибка",
  },
  offline: {
    primary: "#475569", secondary: "#334155", inner: "#64748b",
    accent: "#94a3b8", white: "#f1f5f9", violet: "transparent",
    breatheSpeed: "10s", pulseOpacity: 0.3, glowSize: 40, ringOpacity: 0.2,
    label: "Оффлайн",
  },
} as const;

export function JarwisyanAICoreFallback(props: JarwisyanAICoreFallbackProps) {
  const { size = "md", active = false, reducedMotion = false, compact = false, className, state = "idle" } = props;
  const [systemReduced, setSystemReduced] = useState(false);
  // User wants idle to map to calm
  const [liveState, setLiveState] = useState<keyof typeof STATE_CONFIG>("calm");

  useEffect(() => {
    // Map standard states to our internal config
    if (state === "idle") setLiveState("calm");
    else if (state in STATE_CONFIG) setLiveState(state as keyof typeof STATE_CONFIG);
    else setLiveState("calm");
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setSystemReduced(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // When active without specific state, cycle gently
  useEffect(() => {
    if (!active || reducedMotion || state !== "idle") return;
    const t1 = setTimeout(() => setLiveState("thinking"), 100);
    const t2 = setTimeout(() => setLiveState("calm"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, reducedMotion, state]);

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
      aria-label={`Ядро ДЖАРВИС — ${cfg.label}`}
    >
      {/* === Outer aura — soft volumetric glow === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-10%] rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0.3) 20%, transparent 60%)`,
          opacity: cfg.pulseOpacity * 0.9,
          animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
        }}
      />
      {/* === Hot Core Center === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[35%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 80%)",
          opacity: cfg.pulseOpacity,
          animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
        }}
      />

      {/* === Base Neural Sphere === */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: dim.core * 1.4,
          height: dim.core * 1.4,
          background: `radial-gradient(circle at 40% 30%, rgba(255,255,255,1) 0%, transparent 20%), radial-gradient(circle at 50% 50%, rgba(6,182,212,0.9) 0%, rgba(8,145,178,0.7) 40%, transparent 70%)`,
          boxShadow: `
            inset 0 0 40px #ffffff,
            inset 0 0 60px #06b6d4,
            0 0 80px rgba(6,182,212,0.6),
            0 0 30px rgba(255,255,255,0.4)
          `,
          border: `1px solid rgba(255,255,255,0.3)`,
          animation: motionOff ? "none" : `ai-core-breathe ${cfg.breatheSpeed} ease-in-out infinite`,
        }}
      >
        {/* === Neural Network Lattice Overlay === */}
        <svg viewBox="0 0 100 100" className={`absolute inset-0 h-full w-full ${motionOff ? "" : active ? "ai-core-spin-reverse" : "ai-core-spin-slow"}`} style={{ filter: 'drop-shadow(0 0 4px #ffffff)' }}>
          {/* Connection lines */}
          <g stroke="#ffffff" strokeWidth="0.3" opacity="0.6" fill="none">
            {NEURAL_LINKS.map(([a, b], i) => (
              <line key={i} x1={NEURAL_NODES[a].x} y1={NEURAL_NODES[a].y} x2={NEURAL_NODES[b].x} y2={NEURAL_NODES[b].y} />
            ))}
          </g>
          {/* Neural nodes */}
          <g>
            {NEURAL_NODES.map((node, i) => (
              <circle
                key={i}
                cx={node.x} cy={node.y} r={node.r * 1.2}
                fill="#ffffff"
                opacity={node.bright ? 1 : 0.8}
                style={motionOff ? undefined : { animation: `ai-core-breathe ${1.5 + (i % 5) * 0.2}s ease-in-out ${i * 0.08}s infinite` }}
              />
            ))}
          </g>
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
              
            }}
          />
        )}
      </div>

      {/* === Neural Globe Orbit Rings === */}
      <svg
        aria-hidden viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : active ? "ai-core-spin-fast" : "ai-core-spin-slow"}`}
        style={{ filter: `drop-shadow(0 0 8px ${cfg.white}) drop-shadow(0 0 2px ${cfg.white})`, opacity: cfg.ringOpacity }}
      >
        <ellipse cx="50" cy="50" rx="46" ry="12" fill="none" stroke={cfg.white} strokeWidth="0.25" strokeDasharray="4 4" transform="rotate(25 50 50)">
          {!motionOff && <animate attributeName="stroke-dashoffset" values="8;0" dur="1.5s" repeatCount="indefinite" calcMode="linear" />}
        </ellipse>
      </svg>
      
      <svg
        aria-hidden viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : "ai-core-spin-reverse"}`}
        style={{ filter: `drop-shadow(0 0 6px ${cfg.primary}) drop-shadow(0 0 3px ${cfg.primary})`, opacity: cfg.ringOpacity * 0.9 }}
      >
        <ellipse cx="50" cy="50" rx="48" ry="18" fill="none" stroke={cfg.primary} strokeWidth="0.2" strokeDasharray="8 6 2 6" transform="rotate(-35 50 50)">
          {!motionOff && <animate attributeName="stroke-dashoffset" values="22;0" dur="2s" repeatCount="indefinite" calcMode="linear" />}
        </ellipse>
      </svg>

      <svg
        aria-hidden viewBox="0 0 100 100"
        className={`pointer-events-none absolute inset-0 h-full w-full ${motionOff ? "" : active ? "ai-core-spin-reverse" : "ai-core-spin-fast"}`}
        style={{ filter: `drop-shadow(0 0 10px ${cfg.inner}) drop-shadow(0 0 4px ${cfg.inner})`, opacity: cfg.ringOpacity }}
      >
        <ellipse cx="50" cy="50" rx="45" ry="8" fill="none" stroke={cfg.inner} strokeWidth="0.3" strokeDasharray="12 4 4 4" transform="rotate(75 50 50)">
          {!motionOff && <animate attributeName="stroke-dashoffset" values="24;0" dur="2.5s" repeatCount="indefinite" calcMode="linear" />}
        </ellipse>
      </svg>

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
