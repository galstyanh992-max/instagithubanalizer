"use client";

import { useMounted } from "@/lib/use-mounted";
import { useCinematicParallax } from "@/lib/use-cinematic-parallax";

/**
 * CosmicBackground — космический завораживающий фон
 * CSS-only: nebula clouds, star dust, holographic grid, cyan aurora, vignette
 * Performant, no external assets, respects prefers-reduced-motion
 */
export function CosmicBackground() {
  const mounted = useMounted();
  const parallax = useCinematicParallax(10);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
      {/* Deep space base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.8) 0%, #020617 100%),
            radial-gradient(ellipse at 20% 0%, rgba(34, 211, 238, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, 0.10) 0%, transparent 60%)
          `,
        }}
      />

      {/* Center Atmospheric Glow (Volume Light) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Nebula cloud 1 — cyan, brighter (Deep background depth 0.2) */}
      <div
        className={`absolute -left-1/4 top-0 h-[60vh] w-[80vw] rounded-full ${mounted ? "cosmic-drift-slow" : ""}`}
        style={{
          background: "radial-gradient(circle, rgba(34, 211, 238, 0.20) 0%, rgba(56, 189, 248, 0.10) 40%, transparent 70%)",
          filter: "blur(70px)",
          transform: `translate3d(${parallax.x * 0.2}px, ${parallax.y * 0.2}px, 0)`,
        }}
      />

      {/* Nebula cloud 2 — violet, brighter */}
      <div
        className={`absolute -right-1/4 bottom-0 h-[50vh] w-[70vw] rounded-full ${mounted ? "cosmic-drift-reverse" : ""}`}
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, rgba(168, 85, 247, 0.08) 40%, transparent 70%)",
          filter: "blur(80px)",
          transform: `translate3d(${parallax.x * 0.3}px, ${parallax.y * 0.3}px, 0)`,
        }}
      />

      {/* Nebula cloud 3 — lime micro accent */}
      <div
        className={`absolute left-1/3 top-1/4 h-[30vh] w-[40vw] rounded-full ${mounted ? "cosmic-drift-slow" : ""}`}
        style={{
          background: "radial-gradient(circle, rgba(163, 230, 53, 0.08) 0%, transparent 60%)",
          filter: "blur(50px)",
          transform: `translate3d(${parallax.x * 0.4}px, ${parallax.y * 0.4}px, 0)`,
        }}
      />

      {/* Star dust — deterministic dots (Mid ground depth 0.6) */}
      {mounted && (
        <div 
          className="absolute inset-0"
          style={{ transform: `translate3d(${parallax.x * 0.6}px, ${parallax.y * 0.6}px, 0)` }}
        >
          {STAR_DUST.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                background: star.color,
                opacity: star.opacity,
                boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
                animation: `cosmic-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Holographic grid (Foreground depth 0.8) */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%)",
          transform: `translate3d(${parallax.x * 0.8}px, ${parallax.y * 0.8}px, 0)`,
        }}
      />

      {/* Orbit lines — thin curved cosmic paths (Max depth 1.2) */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ opacity: 0.08, transform: `translate3d(${parallax.x * 1.2}px, ${parallax.y * 1.2}px, 0)` }}>
        <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="#22d3ee" strokeWidth="0.5" transform="rotate(15 50 50)" />
        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#38bdf8" strokeWidth="0.5" transform="rotate(-25 50 50)" />
        <ellipse cx="50" cy="50" rx="45" ry="18" fill="none" stroke="#8b5cf6" strokeWidth="0.3" transform="rotate(45 50 50)" />
      </svg>

      {/* Vignette — radial depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(2, 6, 23, 0.7) 100%)",
        }}
      />
    </div>
  );
}

// Deterministic star positions (no Math.random — prevents hydration mismatch)
const STAR_DUST = [
  { x: 12, y: 18, size: 1.5, color: "#67e8f9", opacity: 0.8, duration: 3, delay: 0.1 },
  { x: 28, y: 65, size: 1, color: "#22d3ee", opacity: 0.6, duration: 4, delay: 0.5 },
  { x: 45, y: 12, size: 2, color: "#e0fcff", opacity: 0.9, duration: 3.5, delay: 0.8 },
  { x: 62, y: 78, size: 1, color: "#a3e635", opacity: 0.5, duration: 5, delay: 1.2 },
  { x: 78, y: 25, size: 1.5, color: "#67e8f9", opacity: 0.7, duration: 4, delay: 0.3 },
  { x: 88, y: 55, size: 1, color: "#38bdf8", opacity: 0.6, duration: 3, delay: 0.9 },
  { x: 15, y: 85, size: 1, color: "#e0fcff", opacity: 0.7, duration: 4.5, delay: 1.5 },
  { x: 35, y: 40, size: 0.8, color: "#a3e635", opacity: 0.4, duration: 5, delay: 0.6 },
  { x: 55, y: 90, size: 1.2, color: "#67e8f9", opacity: 0.6, duration: 3.5, delay: 1.0 },
  { x: 72, y: 50, size: 0.8, color: "#22d3ee", opacity: 0.5, duration: 4, delay: 0.2 },
  { x: 92, y: 15, size: 1, color: "#e0fcff", opacity: 0.7, duration: 3, delay: 1.3 },
  { x: 8, y: 50, size: 1.2, color: "#67e8f9", opacity: 0.6, duration: 4.5, delay: 0.7 },
  { x: 48, y: 70, size: 0.8, color: "#38bdf8", opacity: 0.5, duration: 5, delay: 1.1 },
  { x: 82, y: 88, size: 1, color: "#a3e635", opacity: 0.4, duration: 3.5, delay: 0.4 },
  { x: 25, y: 30, size: 0.8, color: "#e0fcff", opacity: 0.6, duration: 4, delay: 1.4 },
  { x: 68, y: 10, size: 1.5, color: "#67e8f9", opacity: 0.8, duration: 3, delay: 0.5 },
  { x: 5, y: 75, size: 1, color: "#22d3ee", opacity: 0.5, duration: 5, delay: 0.8 },
  { x: 95, y: 70, size: 0.8, color: "#a3e635", opacity: 0.4, duration: 4, delay: 1.0 },
  { x: 42, y: 55, size: 1, color: "#67e8f9", opacity: 0.6, duration: 3.5, delay: 0.3 },
  { x: 58, y: 35, size: 0.8, color: "#e0fcff", opacity: 0.5, duration: 4.5, delay: 1.2 },
  { x: 3, y: 10, size: 0.6, color: "#67e8f9", opacity: 0.5, duration: 4, delay: 0.2 },
  { x: 18, y: 95, size: 0.8, color: "#e0fcff", opacity: 0.5, duration: 3, delay: 1.6 },
  { x: 33, y: 8, size: 0.6, color: "#22d3ee", opacity: 0.4, duration: 5, delay: 0.9 },
  { x: 52, y: 28, size: 0.5, color: "#67e8f9", opacity: 0.4, duration: 4.5, delay: 1.8 },
  { x: 75, y: 65, size: 0.6, color: "#e0fcff", opacity: 0.5, duration: 3.5, delay: 0.1 },
  { x: 87, y: 35, size: 0.5, color: "#a3e635", opacity: 0.3, duration: 5, delay: 1.7 },
  { x: 10, y: 40, size: 0.6, color: "#38bdf8", opacity: 0.4, duration: 4, delay: 2.0 },
  { x: 65, y: 92, size: 0.5, color: "#67e8f9", opacity: 0.4, duration: 3, delay: 0.6 },
  { x: 38, y: 80, size: 0.6, color: "#e0fcff", opacity: 0.5, duration: 4.5, delay: 1.9 },
];

export default CosmicBackground;
