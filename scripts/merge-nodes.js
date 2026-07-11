const fs = require('fs');

let oldCode = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

oldCode = oldCode.replace(
  'import { EffectComposer, Bloom } from "@react-three/postprocessing";',
  'import { EffectComposer, Bloom } from "@react-three/postprocessing";\nimport { Html, Line } from "@react-three/drei";\nimport { FolderKanban, Users, HardDrive, Github, Database, Globe, Terminal, Wrench, X } from "lucide-react";\nimport { useState } from "react";'
);

const nodesLogic = `
// --- NODES DATA ---
const NODES_DATA = [
  { id: "projects", label: "Projects", icon: FolderKanban, status: "12 Active", color: "#22d3ee", pos: [2.5, 1, 1.5] },
  { id: "agents", label: "Agents", icon: Users, status: "16 Running", color: "#a3e635", pos: [2, 2.5, -1] },
  { id: "memory", label: "Memory", icon: HardDrive, status: "1.2M Docs", color: "#a855f7", pos: [-2.5, 1.5, 1] },
  { id: "github", label: "GitHub", icon: Github, status: "Connected", color: "#a1a1aa", pos: [-2, -2, 1.5] },
  { id: "database", label: "Database", icon: Database, status: "PostgreSQL", color: "#3b82f6", pos: [1.5, -2.5, 1] },
  { id: "browser", label: "Browser", icon: Globe, status: "3 Sessions", color: "#fbbf24", pos: [-2.5, -1, -1.5] },
  { id: "terminal", label: "Terminal", icon: Terminal, status: "2 Active", color: "#a3e635", pos: [2.5, -1, -1.5] },
  { id: "tools", label: "Tools", icon: Wrench, status: "24 Available", color: "#22d3ee", pos: [0, 3, 1] },
];

function InteractiveNode({ data, selected, onClick }: any) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = data.pos[1] + Math.sin(t + data.pos[0]) * 0.1;
    const targetScale = hovered || selected ? 1.2 : 1;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group position={data.pos} ref={ref as any}>
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.01, 16, 32]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 0.8 : 0.2} />
      </mesh>
      <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
        <div className={\`transition-all duration-300 pointer-events-none \${selected ? 'opacity-0 scale-95' : hovered ? 'opacity-100 scale-100 translate-y-6' : 'opacity-70 scale-90 translate-y-6'}\`}>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
              {data.label}
            </span>
          </div>
        </div>
      </Html>
      {selected && (
        <Html position={[0.4, 0, 0]} transform>
          <div className="w-[280px] bg-zinc-950/60 border border-cyan-400/30 backdrop-blur-md p-4 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-cyan-400/20 pb-2">
              <div className="flex items-center gap-2">
                <data.icon className="h-4 w-4" style={{ color: data.color }} />
                <span className="font-mono text-xs uppercase tracking-widest text-cyan-50">{data.label}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onClick(null); }} className="text-zinc-400 hover:text-cyan-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">STATUS</span>
                <span className="text-[10px] text-lime-400 font-mono">{data.status}</span>
              </div>
              <div className="h-1 w-full bg-zinc-900 rounded overflow-hidden">
                <div className="h-full bg-cyan-400 w-full animate-pulse" />
              </div>
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
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });
  return (
    <group ref={ref as any}>
      {nodes.map((node) => {
        const isSelected = selectedId === node.id;
        const isDimmed = selectedId && selectedId !== node.id;
        return (
          <Line
            key={\`line-\${node.id}\`}
            points={[[0, 0, 0], node.pos]}
            color={isSelected ? node.color : "#22d3ee"}
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

function SceneControls({ selectedId }: { selectedId: string | null }) {
  const { camera } = useThree();
  useFrame(() => {
    if (selectedId) {
      const node = NODES_DATA.find(n => n.id === selectedId);
      if (node) {
        const targetPos = new THREE.Vector3(node.pos[0] * 1.5, node.pos[1] * 1.2 + 0.5, node.pos[2] * 1.5 + 2);
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(new THREE.Vector3(node.pos[0], node.pos[1], node.pos[2]));
      }
    } else {
      camera.position.lerp(new THREE.Vector3(0, 0, 5.5), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}
`;

oldCode = oldCode.replace('function Scene({', nodesLogic + '\nfunction Scene({');

oldCode = oldCode.replace('import { useFrame, Canvas } from "@react-three/fiber";', 'import { useFrame, Canvas, useThree } from "@react-three/fiber";');

oldCode = oldCode.replace(
  'function Scene({ active, compact, reducedMotion }: { active: boolean; compact: boolean; reducedMotion: boolean }) {',
  'function Scene({ active, compact, reducedMotion, selectedId, setSelectedId }: { active: boolean; compact: boolean; reducedMotion: boolean; selectedId: string | null; setSelectedId: any }) {'
);

const renderAddition = `
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
`;
oldCode = oldCode.replace('<GlassCore active={active} />', '<GlassCore active={active} />' + renderAddition);

oldCode = oldCode.replace(
  'export function JarwisyanAICore(props: JarwisyanAICoreProps) {',
  'export function JarwisyanAICore(props: JarwisyanAICoreProps) {\n  const [selectedId, setSelectedId] = useState<string | null>(null);'
);

oldCode = oldCode.replace(
  '<Scene active={active} compact={compact} reducedMotion={finalReducedMotion} />',
  '<Scene active={active} compact={compact} reducedMotion={finalReducedMotion} selectedId={selectedId} setSelectedId={setSelectedId} />'
);

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', oldCode);
