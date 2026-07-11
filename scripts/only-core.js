const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

// 1. Remove NODES_DATA
code = code.replace(/\/\/ --- NODES DATA ---[\s\S]*?\];\n+/m, '');

// 2. Remove InteractiveNode function completely
// It starts with 'function InteractiveNode({ data, selected, onClick, index, total }: any) {'
// and ends right before 'function Scene({'
const interactiveNodeRegex = /function InteractiveNode\(\{[\s\S]*?\}\n\nfunction Scene\(\{/m;
code = code.replace(interactiveNodeRegex, 'function Scene({');

// 3. Remove the map loop from Scene
// {NODES_DATA.map((node, i) => (
//   <InteractiveNode 
//     ...
//   />
// ))}
const mapRegex = /\{NODES_DATA\.map\(\(node, i\) => \([\s\S]*?\)\)\}/m;
code = code.replace(mapRegex, '');

// 4. Make NeuralGlobe brighter
code = code.replace(
  /emissiveIntensity=\{2\.0\}/,
  'emissiveIntensity={3.0}'
);
code = code.replace(
  /opacity=\{0\.6\}\s+roughness=\{0\.1\}/m,
  'opacity={0.8}\n          roughness={0.1}'
);
code = code.replace(
  /<mesh scale=\{0\.5\}>/,
  '<mesh scale={0.7}>'
);

// We should also make the wireframe and dots brighter to make it feel more "alive"
code = code.replace(
  /opacity=\{0\.3\}\s+blending=\{THREE\.AdditiveBlending\}\s+\/>/m,
  'opacity={0.5}\n          blending={THREE.AdditiveBlending}\n        />'
);

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
