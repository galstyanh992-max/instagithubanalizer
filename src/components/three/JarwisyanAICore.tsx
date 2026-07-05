"use client";

import { useFrame, Canvas, useThree } from "@react-three/fiber";
import { useRef, useMemo, useState, Suspense, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Html, Text, Line, Sphere, PointMaterial, Points } from "@react-three/drei";
import { FolderKanban, Users, HardDrive, Github, Database, Globe, Terminal, Wrench, X } from "lucide-react";

// --- COLORS ---
const CYAN = "#22d3ee";
const LIME = "#a3e635";
const PURPLE = "#a855f7";
const AMBER = "#fbbf24";
const BLUE = "#3b82f6";
const ZINC_400 = "#a1a1aa";

// --- NODES DATA ---
const NODES_DATA = [
  { id: "projects", label: "Projects", icon: FolderKanban, status: "12 Active", color: CYAN, pos: [2.5, 1, 1.5] },
  { id: "agents", label: "Agents", icon: Users, status: "16 Running", color: LIME, pos: [2, 2.5, -1] },
  { id: "memory", label: "Memory", icon: HardDrive, status: "1.2M Docs", color: PURPLE, pos: [-2.5, 1.5, 1] },
  { id: "github", label: "GitHub", icon: Github, status: "Connected", color: ZINC_400, pos: [-2, -2, 1.5] },
  { id: "database", label: "Database", icon: Database, status: "PostgreSQL", color: BLUE, pos: [1.5, -2.5, 1] },
  { id: "browser", label: "Browser", icon: Globe, status: "3 Sessions", color: AMBER, pos: [-2.5, -1, -1.5] },
  { id: "terminal", label: "Terminal", icon: Terminal, status: "2 Active", color: LIME, pos: [2.5, -1, -1.5] },
  { id: "tools", label: "Tools", icon: Wrench, status: "24 Available", color: CYAN, pos: [0, 3, 1] },
];

function InteractiveNode({ data, selected, onClick }: any) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Gentle floating
    ref.current.position.y = data.pos[1] + Math.sin(t + data.pos[0]) * 0.1;
    
    // Scale on hover
    const targetScale = hovered || selected ? 1.2 : 1;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group position={data.pos} ref={ref}>
      {/* Node Core */}
      <mesh 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial 
          color={data.color} 
          emissive={data.color} 
          emissiveIntensity={hovered || selected ? 2 : 0.8}
          transparent 
          opacity={0.8} 
          roughness={0.2}
          transmission={0.9}
        />
      </mesh>

      {/* Ring around node */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.01, 16, 32]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 0.8 : 0.2} />
      </mesh>

      {/* HTML Overlay */}
      <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
        <div 
          className={`transition-all duration-300 pointer-events-none ${
            selected ? 'opacity-0 scale-95' : hovered ? 'opacity-100 scale-100 translate-y-6' : 'opacity-70 scale-90 translate-y-6'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
              {data.label}
            </span>
          </div>
        </div>
      </Html>

      {/* The Selected Panel (Glassmorphism) */}
      {selected && (
        <Html position={[0.4, 0, 0]} transform>
          <div className="w-[280px] bg-zinc-950/60 border border-cyan-400/30 backdrop-blur-md p-4 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-cyan-400/20 pb-2">
              <div className="flex items-center gap-2">
                <data.icon className="h-4 w-4" style={{ color: data.color }} />
                <span className="font-mono text-xs uppercase tracking-widest text-cyan-50">{data.label}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onClick(null); }}
                className="text-zinc-400 hover:text-cyan-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">STATUS</span>
                <span className="text-[10px] text-lime-400 font-mono">{data.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">HEALTH</span>
                <span className="text-[10px] text-cyan-400 font-mono">100%</span>
              </div>
              <div className="h-1 w-full bg-zinc-900 rounded overflow-hidden">
                <div className="h-full bg-cyan-400 w-full animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed pt-2 border-t border-cyan-400/10">
                System is operating at nominal capacity. All telemetry data streams are stable.
              </p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function ConnectionLines({ nodes, selectedId }: { nodes: any[], selectedId: string | null }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Rotate lines slightly
    ref.current.rotation.y = Math.sin(t * 0.1) * 0.1;
  });

  return (
    <group ref={ref}>
      {nodes.map((node) => {
        const isSelected = selectedId === node.id;
        const isDimmed = selectedId && selectedId !== node.id;
        return (
          <Line
            key={`line-${node.id}`}
            points={[[0, 0, 0], node.pos]}
            color={isSelected ? node.color : CYAN}
            lineWidth={isSelected ? 2 : 1}
            transparent
            opacity={isSelected ? 0.8 : isDimmed ? 0.1 : 0.3}
            dashed={false}
          />
        );
      })}
    </group>
  );
}

function CentralCore() {
  const coreRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!coreRef.current) return;
    const t = state.clock.elapsedTime;
    coreRef.current.rotation.y = t * 0.2;
    coreRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
  });

  return (
    <group ref={coreRef}>
      {/* Outer Glass Sphere */}
      <mesh>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshPhysicalMaterial 
          color={CYAN}
          emissive="#0891b2"
          emissiveIntensity={0.5}
          transparent
          opacity={0.15}
          roughness={0.1}
          transmission={0.9}
          thickness={2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Wireframe */}
      <mesh>
        <icosahedronGeometry args={[1.1, 3]} />
        <meshBasicMaterial 
          color={CYAN}
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Particles inside */}
      <Particles count={150} radius={1.1} />

      {/* Central Text */}
      <Html center position={[0, 0, 0]} zIndexRange={[50, 0]} transform distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-mono text-2xl md:text-4xl font-bold tracking-[0.4em] text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            J.A.R.V.I.S.
          </div>
          <div className="mt-1 font-mono text-[8px] md:text-xs uppercase tracking-[0.3em] text-cyan-100/70 border-t border-cyan-400/30 pt-1 w-full text-center">
            AI Core System
          </div>
          {/* Mini activity graph mock */}
          <div className="mt-4 flex items-end gap-1 h-4">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-cyan-400/60 rounded-t"
                style={{ 
                  height: `${20 + Math.random() * 80}%`,
                  animation: `pulse ${1 + Math.random()}s infinite alternate`
                }} 
              />
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Particles({ count, radius }: { count: number, radius: number }) {
  const positions = useMemo(() => {
    const pts = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * (radius - 0.1);
      
      pts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pts[i * 3 + 2] = r * Math.cos(phi);
    }
    return pts;
  }, [count, radius]);
  
  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = -t * 0.1;
    ref.current.rotation.x = Math.sin(t * 0.2) * 0.2;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#cffafe" size={0.03} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

function OrbitalRings() {
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);
  const ref3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref1.current) { ref1.current.rotation.x = t * 0.2; ref1.current.rotation.y = t * 0.1; }
    if (ref2.current) { ref2.current.rotation.x = -t * 0.15; ref2.current.rotation.y = t * 0.2; }
    if (ref3.current) { ref3.current.rotation.y = -t * 0.25; ref3.current.rotation.z = Math.sin(t * 0.1) * 0.2; }
  });

  return (
    <group>
      <mesh ref={ref1}>
        <torusGeometry args={[3, 0.005, 16, 100]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref2}>
        <torusGeometry args={[3.5, 0.005, 16, 100]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref3}>
        <torusGeometry args={[4, 0.008, 16, 100]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function SceneControls({ selectedId }: { selectedId: string | null }) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (selectedId) {
      const node = NODES_DATA.find(n => n.id === selectedId);
      if (node) {
        // Target camera position: slightly offset from the node
        const targetPos = new THREE.Vector3(node.pos[0] * 1.5, node.pos[1] * 1.2 + 0.5, node.pos[2] * 1.5 + 2);
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(new THREE.Vector3(node.pos[0], node.pos[1], node.pos[2]));
      }
    } else {
      // Default camera position
      camera.position.lerp(new THREE.Vector3(0, 0, 7), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

export type JarwisyanAICoreProps = {
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  reducedMotion?: boolean;
  compact?: boolean;
  className?: string;
  state?: "idle" | "thinking" | "processing" | "speaking" | "error" | "critical" | "offline";
};

export function JarwisyanAICore({ className, size, active, state }: JarwisyanAICoreProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Map size to a generic scale if needed, or rely on CSS
  const sizeClass = size === "sm" ? "min-h-[200px]" : size === "md" ? "min-h-[300px]" : size === "lg" ? "min-h-[400px]" : "min-h-[500px]";

  return (
    <div className={`w-full h-full cursor-crosshair ${sizeClass} ${className || ""}`}>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <color attach="background" args={["#020617"]} /> {/* Match page background */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={CYAN} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={LIME} />

        <Suspense fallback={null}>
          <CentralCore />
          <OrbitalRings />
          <ConnectionLines nodes={NODES_DATA} selectedId={selectedId} />
          
          {NODES_DATA.map((node) => (
            <InteractiveNode 
              key={node.id} 
              data={node} 
              selected={selectedId === node.id} 
              onClick={(id: string | null) => setSelectedId(id === selectedId ? null : id)} 
            />
          ))}
          
          <SceneControls selectedId={selectedId} />
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default JarwisyanAICore;
