const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

const newNodesData = `
// --- NODES DATA ---
const NODES_DATA = [
  { id: "projects", label: "Projects", icon: FolderKanban, status: "12 Active", color: "#22d3ee", hasRings: true, href: "/projects" },
  { id: "agents", label: "Agents", icon: Users, status: "16 Running", color: "#a3e635", hasRings: false, href: "/agents" },
  { id: "memory", label: "Memory", icon: HardDrive, status: "1.2M Docs", color: "#a855f7", hasRings: true, href: "/memory" },
  { id: "github", label: "GitHub", icon: Github, status: "Connected", color: "#a1a1aa", hasRings: false, href: "/github" },
  { id: "database", label: "Database", icon: Database, status: "PostgreSQL", color: "#3b82f6", hasRings: true, href: "/database" },
  { id: "departments", label: "Departments", icon: Globe, status: "Active", color: "#fbbf24", hasRings: false, href: "/departments" },
  { id: "terminal", label: "Terminal", icon: Terminal, status: "2 Active", color: "#a3e635", hasRings: false, href: "/terminal" },
  { id: "tools", label: "Tools", icon: Wrench, status: "24 Available", color: "#22d3ee", hasRings: true, href: "/tools" },
];
`;

code = code.replace(/\/\/ --- NODES DATA ---[\s\S]*?\];/, newNodesData.trim());

// Add useRouter import if missing
if (!code.includes('import { useRouter } from "next/navigation";')) {
  code = code.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useRouter } from "next/navigation";');
}

const newInteractiveNode = `
function InteractiveNode({ data, selected, onClick, index, total }: any) {
  const ref = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    
    // Orbital mechanics: symmetrical spacing + continuous rotation
    const orbitSpeed = 0.15;
    const radius = 1.8;
    const baseAngle = (index / total) * Math.PI * 2;
    const currentAngle = baseAngle + t * orbitSpeed;
    
    // Calculate new position (circular orbit on XZ plane)
    ref.current.position.x = Math.cos(currentAngle) * radius;
    ref.current.position.z = Math.sin(currentAngle) * radius;
    // Add slight bobbing motion to make it feel natural
    ref.current.position.y = Math.sin(t * 1.5 + baseAngle * 2) * 0.15;
    
    // Planet rotation on its axis
    if (planetRef.current) {
      planetRef.current.rotation.y = t * 0.2;
    }
    
    // Rings rotation
    if (ringsRef.current) {
      ringsRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
    }

    const targetScale = hovered || selected ? 1.4 : 1;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <group ref={ref as any}>
      {/* Light source illuminating the planet itself */}
      <pointLight distance={2} intensity={hovered || selected ? 2 : 0.8} color={data.color} />
      
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
          opacity={hovered || selected ? 0.6 : 0.3} 
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
      <Html position={[0, 0.25, 0]} center zIndexRange={[100, 0]}>
        <div className={\`transition-all duration-300 pointer-events-none flex flex-col items-center justify-center gap-1 \${selected ? 'opacity-0 scale-95' : hovered ? 'opacity-100 scale-100' : 'opacity-90 scale-90'}\`}>
          <div className="flex items-center justify-center bg-zinc-950/60 border border-cyan-400/20 p-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md" style={{ borderColor: \`\${data.color}80\`, boxShadow: \`0 0 15px \${data.color}40\` }}>
            <data.icon className="w-3.5 h-3.5" style={{ color: data.color }} />
          </div>
        </div>
      </Html>

      {/* Label floating below the planet */}
      <Html position={[0, -0.22, 0]} center zIndexRange={[100, 0]}>
        <div className={\`transition-all duration-300 pointer-events-none \${selected ? 'opacity-0' : hovered ? 'opacity-100 translate-y-1' : 'opacity-70'}\`}>
           <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-50 drop-shadow-md whitespace-nowrap" style={{ textShadow: \`0 0 5px \${data.color}\` }}>
            {data.label}
          </span>
        </div>
      </Html>

      {/* Expanded Glassmorphic Panel when Selected */}
      {selected && (
        <Html position={[0.4, 0, 0]} transform zIndexRange={[150, 0]}>
          <div className="w-[240px] bg-zinc-950/70 border backdrop-blur-xl p-3 rounded-lg flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto" style={{ borderColor: \`\${data.color}40\`, boxShadow: \`0 0 20px \${data.color}20\` }}>
            <div className="flex items-center justify-between border-b pb-2" style={{ borderBottomColor: \`\${data.color}20\` }}>
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
  );
}
`;

code = code.replace(/function InteractiveNode\(\{[\s\S]*?function ConnectionLines\(\{/m, newInteractiveNode + '\n\nfunction ConnectionLines({');

const mapRegex = /\{NODES_DATA\.map\(\(node\) => \([\s\S]*?<InteractiveNode[\s\S]*?onClick=\{[\s\S]*?\}[\s\S]*?\/>\n\s*\)\)\}/m;
const mapReplacement = `{NODES_DATA.map((node, i) => (
        <InteractiveNode 
          key={node.id} 
          data={node} 
          selected={selectedId === node.id} 
          onClick={(id: string | null) => setSelectedId(id === selectedId ? null : id)} 
          index={i}
          total={NODES_DATA.length}
        />
      ))}`;
code = code.replace(mapRegex, mapReplacement);

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
