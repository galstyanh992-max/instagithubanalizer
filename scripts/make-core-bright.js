const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

// 1. Make the core brighter (NeuralGlobe)
code = code.replace(
  /<meshPhysicalMaterial\s+color="#06b6d4"\s+\/\/ Cyan-500\s+emissive="#0891b2"\s+emissiveIntensity=\{0.8\}\s+transparent\s+opacity=\{0.3\}\s+roughness=\{0.1\}\s+transmission=\{0.9\}\s+thickness=\{1.5\}\s+\/>/m,
  `<meshPhysicalMaterial
          color="#06b6d4" // Cyan-500
          emissive="#0891b2"
          emissiveIntensity={2.0}
          transparent
          opacity={0.6}
          roughness={0.1}
          transmission={0.9}
          thickness={1.5}
        />`
);

code = code.replace(
  /<mesh scale=\{0.4\}>\s+<sphereGeometry args=\{\[1, 16, 16\]\} \/>\s+<meshBasicMaterial color="#ffffff" transparent opacity=\{0.8\} blending=\{THREE.AdditiveBlending\} \/>\s+<\/mesh>/m,
  `<mesh scale={0.5}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1.0} blending={THREE.AdditiveBlending} />
      </mesh>`
);

code = code.replace(
  /<meshBasicMaterial\s+color="#a5f3fc"\s+\/\/ Cyan-200\s+wireframe\s+transparent\s+opacity=\{0.15\}\s+blending=\{THREE.AdditiveBlending\}\s+\/>/m,
  `<meshBasicMaterial
          color="#a5f3fc" // Cyan-200
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />`
);

code = code.replace(
  /<pointsMaterial\s+size=\{0.03\}\s+color="#ffffff"\s+transparent\s+opacity=\{0.9\}\s+sizeAttenuation\s+blending=\{THREE.AdditiveBlending\}\s+\/>/m,
  `<pointsMaterial
          size={0.045}
          color="#ffffff"
          transparent
          opacity={1.0}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />`
);

code = code.replace(
  /<pointsMaterial\s+size=\{0.06\}\s+color="#cffafe"\s+transparent\s+opacity=\{1\}\s+sizeAttenuation\s+blending=\{THREE.AdditiveBlending\}\s+\/>/m,
  `<pointsMaterial
          size={0.08}
          color="#cffafe"
          transparent
          opacity={1.0}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />`
);


// 2. Fix planet clickability
// Add style={{ pointerEvents: 'none' }} to the Html wrappers for labels, but not the expanded panel
code = code.replace(
  /<Html position=\{\[0, 0.25, 0\]\} center zIndexRange=\{\[100, 0\]\}>/g,
  `<Html position={[0, 0.25, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>`
);

code = code.replace(
  /<Html position=\{\[0, -0.22, 0\]\} center zIndexRange=\{\[100, 0\]\}>/g,
  `<Html position={[0, -0.22, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>`
);

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
