"use client";

import { useFrame, Canvas } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { useUiStore } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { JarwisyanAICoreFallback } from "./JarwisyanAICoreFallback";

// ============================================================
// Jarwisyan AI Core — Transparent Neural Hologram Core
// ============================================================
// Paleтa: cyan / ice blue / lime accent / deep space
// Структура:
//  - transparent background (no panel, no rectangle)
//  - central glass sphere (cyan, semi-transparent, neural lines inside)
//  - 2 thin elegant rings (cyan + lime accent)
//  - 6-12 small orbit dots (cyan + few lime)
//  - soft radial glow behind (no hard edges)
//  - seamless blend with page dark background

export type JarwisyanAICoreProps = {
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  reducedMotion?: boolean;
  compact?: boolean;
  className?: string;
  /** Состояние ядра — определяет цвет, скорость, интенсивность */
  state?: "calm" | "thinking" | "active" | "warning" | "overload";
};

const SIZE_MAP = {
  sm: { px: 200, scale: 0.7 },
  md: { px: 300, scale: 1.0 },
  lg: { px: 460, scale: 1.35 },
  xl: { px: 560, scale: 1.6 },
};

// Palette
const CYAN = "#22d3ee";
const ICE_BLUE = "#38bdf8";
const INNER_CYAN = "#67e8f9";
const LIME = "#a3e635";
const VIOLET_MUTED = "#a855f7";

// ---------- Inner pieces ----------

function GlassCore({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * (active ? 2.4 : 1.4)) * (active ? 0.04 : 0.02);
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.y = t * 0.18;
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.28;
      wireRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
    if (innerRef.current) {
      const innerPulse = 1 + Math.sin(t * 1.8) * 0.08;
      innerRef.current.scale.setScalar(innerPulse);
    }
  });
  return (
    <group>
      {/* Glass core — cyan, semi-transparent, depth via transmission — УСИЛЕН */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[1, 3]} />
        <meshPhysicalMaterial
          color="#0a1a2e"
          emissive={CYAN}
          emissiveIntensity={active ? 0.6 : 0.4}
          metalness={0.7}
          roughness={0.1}
          transmission={0.75}
          thickness={1.0}
          transparent
          opacity={0.55}
          ior={1.3}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
      {/* Neural wireframe lattice — мозг-подобная структура, плотная */}
      <mesh ref={wireRef} scale={1.02}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color={INNER_CYAN}
          wireframe
          transparent
          opacity={active ? 0.42 : 0.3}
        />
      </mesh>
      {/* Второй слой wireframe — для эффекта нейронной сети */}
      <mesh scale={0.95} rotation={[0.3, 0.5, 0.1]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={"#E0FCFF"}
          wireframe
          transparent
          opacity={active ? 0.25 : 0.18}
        />
      </mesh>
      {/* White-hot inner core — яркое бело-голубое свечение */}
      <mesh ref={innerRef} scale={0.38}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color="#ECFEFF"
          transparent
          opacity={active ? 0.9 : 0.75}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Дополнительный очень яркий центр — white-hot */}
      <mesh scale={0.18}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Neural pulse particles — маленькие точки внутри мозга */}
      <NeuralPulse active={active} />
    </group>
  );
}

// Neural pulse — маленькие яркие точки внутри ядра, имитируют нейронную активность
function NeuralPulse({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    // 20 deterministic точек внутри сферы радиусом 0.8
    const pts = [
      [0.3, 0.4, 0.2], [-0.4, 0.2, 0.3], [0.1, -0.5, 0.3], [-0.2, 0.3, -0.4],
      [0.5, -0.1, -0.2], [-0.3, -0.3, 0.1], [0.2, 0.5, -0.3], [-0.5, 0.1, 0.2],
      [0.4, 0.3, 0.4], [-0.1, -0.4, -0.3], [0.3, -0.2, 0.5], [-0.4, -0.2, -0.1],
      [0.1, 0.4, -0.5], [0.5, 0.2, 0.1], [-0.3, 0.4, 0.3], [0.2, -0.5, -0.2],
      [-0.2, 0.1, 0.5], [0.4, -0.3, 0.2], [-0.5, -0.1, -0.2], [0.1, 0.2, 0.4],
    ];
    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      arr[i * 3] = p[0];
      arr[i * 3 + 1] = p[1];
      arr[i * 3 + 2] = p[2];
    });
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.5;
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = active ? 0.7 + Math.sin(t * 4) * 0.3 : 0.4 + Math.sin(t * 2) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ECFEFF"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ThinRing({
  radius,
  tube,
  speed,
  axis,
  color,
  opacity,
}: {
  radius: number;
  tube: number;
  speed: number;
  axis: [number, number, number];
  color: string;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = axis[0] * t * speed + Math.PI / 2.4;
    ref.current.rotation.y = axis[1] * t * speed;
    ref.current.rotation.z = axis[2] * t * speed;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 8, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.NormalBlending} />
    </mesh>
  );
}

function OrbitDots({
  count,
  radius,
  active,
}: {
  count: number;
  radius: number;
  active: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    // Deterministic pseudo-random offsets (no Math.random — prevents hydration mismatch)
    const offsets = [0.95, 1.03, 0.98, 1.05, 0.97, 1.02, 0.99, 1.04, 1.0, 0.96, 1.01, 0.98];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = radius * (offsets[i % offsets.length]);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.1 * (active ? 1.5 : 1);
    ref.current.rotation.x = Math.sin(t * 0.15) * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={INNER_CYAN}
        transparent
        opacity={active ? 0.6 : 0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

// GlowPlane удалён — обрезался по краям canvas, создавая видимый прямоугольник.

function Scene({ active, compact, reducedMotion }: { active: boolean; compact: boolean; reducedMotion: boolean }) {
  const dotCount = compact ? 6 : reducedMotion ? 4 : 10;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 2, 3]} intensity={1.5} color={CYAN} />
      <pointLight position={[-2, -1, 2]} intensity={0.8} color={ICE_BLUE} />
      <pointLight position={[0, 0, 4]} intensity={1.0} color={"#E0FCFF"} />

      {/* Все элементы уменьшены и прижаты к центру, чтобы не создавать свечение по краям canvas */}

      {!reducedMotion && (
        <>
          {/* Primary cyan ring — compact, close to core */}
          <ThinRing radius={1.1} tube={0.005} speed={0.35} axis={[1, 0.2, 0.1]} color={CYAN} opacity={0.45} />
          {/* Secondary ice blue ring */}
          <ThinRing radius={1.25} tube={0.004} speed={-0.25} axis={[0.15, 1, 0.15]} color={ICE_BLUE} opacity={0.32} />
          {/* Lime accent ring — very subtle */}
          <ThinRing radius={1.38} tube={0.003} speed={0.18} axis={[0.3, 0.4, 1]} color={LIME} opacity={0.25} />
        </>
      )}

      <GlassCore active={active} />

      <OrbitDots count={dotCount} radius={1.2} active={active} />
    </>
  );
}

// ---------- WebGL availability check ----------

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    // Force-release the context to avoid conflicts with R3F Canvas
    if (gl && "getExtension" in gl) {
      const loseExt = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
      loseExt?.loseContext?.();
    }
    return !!gl;
  } catch {
    return false;
  }
}

// ---------- Main component ----------

export function JarwisyanAICore(props: JarwisyanAICoreProps) {
  const { size = "md", active = false, reducedMotion: reducedMotionProp, compact: compactProp, className, state = "calm" } = props;
  const mounted = useMounted();
  const enable3d = useUiStore((s) => s.enable3d);
  const storeReducedMotion = useUiStore((s) => s.reduceMotion);
  const storeCompact = useUiStore((s) => s.compactMode);

  const reducedMotion = reducedMotionProp ?? storeReducedMotion;
  const compact = compactProp ?? storeCompact;
  const dim = SIZE_MAP[size];

  // До mount всегда рендерим CSS fallback — это предотвращает hydration mismatch
  // (zustand persist store ещё не загружен из localStorage, WebGL недоступен на SSR).
  if (!mounted) {
    return (
      <JarwisyanAICoreFallback
        size={size}
        active={active}
        reducedMotion={true}
        compact={compact}
        className={className}
        state={state}
      />
    );
  }

  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finalReducedMotion = reducedMotion || prefersReduced;

  const webglAvailable = hasWebGL();
  const useWebGL = enable3d && webglAvailable;

  if (!useWebGL) {
    return (
      <JarwisyanAICoreFallback
        size={size}
        active={active}
        reducedMotion={finalReducedMotion}
        compact={compact}
        className={className}
        state={state}
      />
    );
  }

  // Прямой Canvas — компонент уже client-only через useMounted, dynamic не нужен.
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
      aria-label="Ядро ИИ Jarwisyan"
    >
      <Canvas
        key={`ai-core-${size}`}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          // Clear any existing context issues
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <Scene active={active} compact={compact} reducedMotion={finalReducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default JarwisyanAICore;
