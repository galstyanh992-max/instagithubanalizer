const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

// 1. Remove ConnectionLines component entirely
code = code.replace(/function ConnectionLines\(\{[\s\S]*?return \([\s\S]*?<\/group>\);\n\}/, '');

// 2. Remove <ConnectionLines nodes={NODES_DATA} selectedId={selectedId} /> from rendering
code = code.replace('<ConnectionLines nodes={NODES_DATA} selectedId={selectedId} />', '');

// 3. Update InteractiveNode
const newInteractiveNode = `
function InteractiveNode({ data, selected, onClick }: any) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Gentle floating
    ref.current.position.y = data.pos[1] + Math.sin(t * 2 + data.pos[0]) * 0.1;
    ref.current.rotation.y = t * 0.5;
    ref.current.rotation.x = t * 0.3;
    
    // Scale on hover
    const targetScale = hovered || selected ? 1.3 : 1;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <group position={data.pos} ref={ref as any}>
      {/* Light source for the node */}
      <pointLight distance={1.5} intensity={hovered || selected ? 1.5 : 0.5} color={data.color} />
      
      {/* Interactive invisible hit area */}
      <mesh 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Holographic Core */}
      <mesh>
        <icosahedronGeometry args={[0.08, 1]} />
        <meshBasicMaterial color={data.color} wireframe transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Inner glowing sphere */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Outer rotating ring */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.2, 0.005, 16, 64]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered || selected ? 0.8 : 0.3} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Second rotating ring (perpendicular) */}
      <mesh rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.15, 0.005, 16, 64]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered || selected ? 0.6 : 0.2} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Icon and Label overlay */}
      <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
        <div className={\`transition-all duration-300 pointer-events-none flex flex-col items-center justify-center gap-1 \${selected ? 'opacity-0 scale-95' : hovered ? 'opacity-100 scale-100 translate-y-6' : 'opacity-80 scale-90 translate-y-6'}\`}>
          <div className="flex items-center justify-center bg-zinc-950/80 border border-cyan-400/30 p-1.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] backdrop-blur-sm" style={{ borderColor: data.color, boxShadow: \`0 0 10px \${data.color}40\` }}>
            <data.icon className="w-3 h-3" style={{ color: data.color }} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-50 drop-shadow-md whitespace-nowrap">
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
          </div>
        </Html>
      )}
    </group>
  );
}
`;

code = code.replace(/function InteractiveNode\(\{[\s\S]*?function SceneControls\(\{/m, newInteractiveNode + '\n\nfunction SceneControls({');

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
