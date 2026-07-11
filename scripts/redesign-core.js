const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

// 1. Fix the blue square bounding box issue
// The issue is likely caused by the radial-gradient in layout.tsx OR Bloom in EffectComposer.
// In layout.tsx: we should just remove that radial-gradient div because it's not needed since the core glows itself.
let layoutCode = fs.readFileSync('src/app/layout.tsx', 'utf8');
layoutCode = layoutCode.replace(
  /<div className="absolute inset-0 pointer-events-none animate-pulse" style=\{\{ background: 'radial-gradient\(circle at 50% 50%, rgba\(6,182,212,0\.15\) 0%, transparent 60%\)' \}\} \/>/,
  ''
);
fs.writeFileSync('src/app/layout.tsx', layoutCode);

// Add disableNormalPass to EffectComposer to prevent background artifacting
code = code.replace(/<EffectComposer>/, '<EffectComposer disableNormalPass>');


// 2. Redesign NeuralGlobe to be much more realistic and beautiful
const newNeuralGlobe = `
function NeuralGlobe({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const outerGlassRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    
    groupRef.current.rotation.y = t * 0.1 * (active ? 1.5 : 1);
    groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    groupRef.current.rotation.z = Math.cos(t * 0.15) * 0.1;

    if (outerGlassRef.current) {
      outerGlassRef.current.rotation.y = -t * 0.05;
      outerGlassRef.current.rotation.x = t * 0.05;
    }

    if (coreRef.current) {
       // Pulsating inner core
       const scale = 0.45 + Math.sin(t * 3) * 0.03;
       coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. The Intense Inner Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#a5f3fc"
          emissiveIntensity={4.0}
          roughness={0.2}
        />
      </mesh>

      {/* 2. Complex Neural Geometry Inside */}
      <mesh scale={0.75}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#22d3ee" // Cyan-400
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={0.85} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#0ea5e9" // Sky-500
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. The Outer Glass Shell (Realistic refractions) */}
      <mesh ref={outerGlassRef} scale={1.0}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#06b6d4" // Cyan-500
          emissive="#0891b2"
          emissiveIntensity={0.5}
          transparent
          opacity={active ? 0.3 : 0.15}
          roughness={0.05}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={1.0}
          thickness={2.0}
          ior={1.3} // Index of refraction for glass-like distortion
        />
      </mesh>

      {/* 4. Energy Particles Inside */}
      <points scale={0.9}>
        <icosahedronGeometry args={[1, 3]} />
        <pointsMaterial
          size={0.03}
          color="#ffffff"
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 5. Outer Halo */}
      <mesh scale={1.15}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color="#06b6d4"
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
`;

// Replace NeuralGlobe
code = code.replace(/function NeuralGlobe\(\{ active \}: \{ active: boolean \}\) \{[\s\S]*?\n\}\n\nfunction GlassCore/m, newNeuralGlobe + '\nfunction GlassCore');

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
