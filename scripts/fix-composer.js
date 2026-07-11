const fs = require('fs');

let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

code = code.replace(/<EffectComposer disableNormalPass>/, '<EffectComposer>');

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);
