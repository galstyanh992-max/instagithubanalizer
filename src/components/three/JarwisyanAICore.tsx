"use client";

import { useFrame, Canvas, useThree } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { FolderKanban, Users, HardDrive, Github, Database, Globe, Terminal, Wrench, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
          emissiveIntensity={3.0}
          transparent
          opacity={0.8}
          roughness={0.1}
          transmission={0.9}
          thickness={1.5}
        />
      </mesh>

      {/* 2. Inner Hot Core (To give volume) */}
      <mesh scale={0.7}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1.0} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 3. Neural Wireframe (The connections) */}
      <mesh>
        <icosahedronGeometry args={[1, 4]} />
        <meshBasicMaterial
          color="#a5f3fc" // Cyan-200
          wireframe
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Neural Nodes (The glowing dots at vertices) */}
      <points>
        <icosahedronGeometry args={[1, 4]} />
        <pointsMaterial
          size={0.045}
          color="#ffffff"
          transparent
          opacity={1.0}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* 5. Highlight Nodes (Larger, brighter dots for variety) */}
      <points scale={1.01}>
        <icosahedronGeometry args={[1, 1]} />
        <pointsMaterial
          size={0.08}
          color="#cffafe"
          transparent
          opacity={1.0}
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


function InteractiveNode({ data, selected, onClick, index, total }: any) {
  const ref = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [orbitHovered, setOrbitHovered] = useState(false);
  const router = useRouter();

  // Orbital parameters - calculated once
  const orbitParams = useRef({
    radius: 1.3 + index * 0.22,
    speed: (index % 2 === 0 ? 1 : -1) * (0.1 + (total - index) * 0.015),
    tiltX: (index % 3 - 1) * 0.15, 
    tiltZ: (index % 2 - 0.5) * 0.2,
    baseAngle: (index / total) * Math.PI * 2
  }).current;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    
    const currentAngle = orbitParams.baseAngle + t * orbitParams.speed;
    
    // Base circle
    let x = Math.cos(currentAngle) * orbitParams.radius;
    let z = Math.sin(currentAngle) * orbitParams.radius;
    let y = 0;

    // Apply tilt X
    let y1 = y * Math.cos(orbitParams.tiltX) - z * Math.sin(orbitParams.tiltX);
    let z1 = y * Math.sin(orbitParams.tiltX) + z * Math.cos(orbitParams.tiltX);

    // Apply tilt Z
    let x2 = x * Math.cos(orbitParams.tiltZ) - y1 * Math.sin(orbitParams.tiltZ);
    let y2 = x * Math.sin(orbitParams.tiltZ) + y1 * Math.cos(orbitParams.tiltZ);

    ref.current.position.set(x2, y2, z1);
    
    // Planet rotation on its axis
    if (planetRef.current) {
      planetRef.current.rotation.y = t * 0.4;
    }
    
    // Rings rotation
    if (ringsRef.current) {
      ringsRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
    }

    const targetScale = hovered || selected || orbitHovered ? 1.4 : 1;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <group>
      {/* --- THE ORBIT PATH --- */}
      <group rotation={[orbitParams.tiltX, 0, orbitParams.tiltZ]}>
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          onPointerOver={(e) => { e.stopPropagation(); setOrbitHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={(e) => { e.stopPropagation(); setOrbitHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); router.push(data.href); }}
        >
          <ringGeometry args={[orbitParams.radius - 0.015, orbitParams.radius + 0.015, 64]} />
          <meshBasicMaterial 
            color={data.color} 
            transparent 
            opacity={orbitHovered || selected ? 0.8 : 0.15} 
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* --- THE PLANET --- */}
      <group ref={ref as any}>
        {/* Light source illuminating the planet itself */}
        <pointLight distance={2} intensity={hovered || selected || orbitHovered ? 2 : 0.8} color={data.color} />
        
        {/* Invisible hit area for easier clicking */}
        <mesh 
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); router.push(data.href); }}
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* The Solid Planet */}
        <mesh ref={planetRef as any}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial 
            color={data.color} 
            roughness={0.4} 
            metalness={0.8}
            emissive={data.color}
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Atmosphere Glow */}
        <mesh>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshBasicMaterial 
            color={data.color} 
            transparent 
            opacity={hovered || selected || orbitHovered ? 0.6 : 0.3} 
            blending={THREE.AdditiveBlending} 
            depthWrite={false}
          />
        </mesh>

        {/* Planetary Rings */}
        {data.hasRings && (
          <group ref={ringsRef as any} rotation={[Math.PI / 2.5, Math.PI / 8, 0]}>
            <mesh>
              <ringGeometry args={[0.18, 0.22, 64]} />
              <meshBasicMaterial 
                color={data.color} 
                transparent 
                opacity={0.4} 
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.24, 0.25, 64]} />
              <meshBasicMaterial 
                color="#ffffff" 
                transparent 
                opacity={0.2} 
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )}

        {/* Icon floating above the planet */}
        <Html position={[0, 0.25, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`transition-all duration-300 pointer-events-none flex flex-col items-center justify-center gap-1 ${selected ? 'opacity-0 scale-95' : hovered || orbitHovered ? 'opacity-100 scale-100' : 'opacity-90 scale-90'}`}>
            <div className="flex items-center justify-center bg-zinc-950/60 border border-cyan-400/20 p-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md" style={{ borderColor: `${data.color}80`, boxShadow: `0 0 15px ${data.color}40` }}>
              <data.icon className="w-3.5 h-3.5" style={{ color: data.color }} />
            </div>
          </div>
        </Html>

        {/* Label floating below the planet */}
        <Html position={[0, -0.22, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`transition-all duration-300 pointer-events-none ${selected ? 'opacity-0' : hovered || orbitHovered ? 'opacity-100 translate-y-1' : 'opacity-70'}`}>
             <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-50 drop-shadow-md whitespace-nowrap" style={{ textShadow: `0 0 5px ${data.color}` }}>
              {data.label}
            </span>
          </div>
        </Html>

        {/* Expanded Glassmorphic Panel when Selected */}
        {selected && (
          <Html position={[0.4, 0, 0]} transform zIndexRange={[150, 0]}>
            <div className="w-[240px] bg-zinc-950/70 border backdrop-blur-xl p-3 rounded-lg flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto" style={{ borderColor: `${data.color}40`, boxShadow: `0 0 20px ${data.color}20` }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderBottomColor: `${data.color}20` }}>
                <div className="flex items-center gap-2">
                  <data.icon className="h-4 w-4" style={{ color: data.color }} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-100">{data.label}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClick(null); }} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-500 font-mono">STATUS</span>
                  <span className="text-[9px] font-mono" style={{ color: data.color }}>{data.status}</span>
                </div>
                <div className="h-0.5 w-full bg-zinc-900 rounded overflow-hidden">
                  <div className="h-full w-full animate-pulse" style={{ backgroundColor: data.color }} />
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); router.push(data.href); }}
                className="mt-2 w-full py-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all font-mono text-[10px] uppercase tracking-widest"
                style={{ color: data.color }}
              >
                Перейти к модулю
              </button>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}


function Scene({ active, compact, reducedMotion, selectedId, setSelectedId }: { active: boolean; compact: boolean; reducedMotion: boolean; selectedId: string | null; setSelectedId: any }) {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          <Scene active={active} compact={compact} reducedMotion={finalReducedMotion} selectedId={selectedId} setSelectedId={setSelectedId} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default JarwisyanAICore;
