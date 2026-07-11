"use client";

import { useFrame, Canvas } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
  state?: "idle" | "thinking" | "processing" | "speaking" | "error" | "critical" | "offline";
};

const SIZE_MAP = {
  sm: { px: 200, scale: 0.9 },
  md: { px: 300, scale: 1.4 },
  lg: { px: 460, scale: 1.8 },
  xl: { px: 560, scale: 2.2 },
};

// Palette
const CYAN = "#22d3ee";
const ICE_BLUE = "#38bdf8";
const INNER_CYAN = "#67e8f9";
const LIME = "#a3e635";
const VIOLET_MUTED = "#a855f7";

// --- NEURAL GLOBE COMPONENTS ---

function NeuralGlobe({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.15 * (active ? 1.5 : 1);
    ref.current.rotation.x = Math.sin(t * 0.2) * 0.1;
  });

  return (
    <group ref={ref}>
      {/* 1. Base Glowing Sphere (The blue glass core) */}
      <mesh scale={0.98}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color="#06b6d4" // Cyan-500
          emissive="#0891b2"
          emissiveIntensity={0.8}
          transparent
          opacity={0.3}
          roughness={0.1}
          transmission={0.9}
          thickness={1.5}
        />
      </mesh>

      {/* 2. Inner Hot Core (To give volume) */}
      <mesh scale={0.4}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 3. Neural Wireframe (The connections) */}
      <mesh>
        <icosahedronGeometry args={[1, 4]} />
        <meshBasicMaterial
          color="#a5f3fc" // Cyan-200
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Neural Nodes (The glowing dots at vertices) */}
      <points>
        <icosahedronGeometry args={[1, 4]} />
        <pointsMaterial
          size={0.03}
          color="#ffffff"
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* 5. Highlight Nodes (Larger, brighter dots for variety) */}
      <points scale={1.01}>
        <icosahedronGeometry args={[1, 1]} />
        <pointsMaterial
          size={0.06}
          color="#cffafe"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function GlassCore({ active }: { active: boolean }) {
  // We use NeuralGlobe instead now, this wrapper keeps it compatible
  return <NeuralGlobe active={active} />;
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
    
    // Electric flicker effect for current flow
    if (ref.current.material) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * (0.7 + Math.sin(t * 40 + radius) * 0.3);
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <torusGeometry args={[radius, tube, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Wireframe shell to enhance the electric look */}
      <mesh rotation-x={Math.PI / 2.4}>
        <torusGeometry args={[radius, tube * 1.5, 4, 32]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={opacity * 0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
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
      
      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={active ? 1.5 : 1.0}
            mipmapBlur
          />
        </EffectComposer>
      )}
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
  const { size = "md", active = false, reducedMotion: reducedMotionProp, compact: compactProp, className, state = "idle" } = props;
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
  const useWebGL = webglAvailable; // Forced 3D, bypassing enable3d

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
        camera={{ position: [0, 0, 5.5], fov: 45 }}
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
