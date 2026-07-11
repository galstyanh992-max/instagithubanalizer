const fs = require('fs');

// 1. JarwisyanAICore.tsx: Remove EffectComposer entirely
let code = fs.readFileSync('src/components/three/JarwisyanAICore.tsx', 'utf8');

// Remove imports
code = code.replace(/import \{ EffectComposer, Bloom \} from "@react-three\/postprocessing";\n/, '');

// Remove EffectComposer from Scene
code = code.replace(/\{!reducedMotion && \(\s*<EffectComposer>[\s\S]*?<\/EffectComposer>\s*\)\}/g, '');

fs.writeFileSync('src/components/three/JarwisyanAICore.tsx', code);

// 2. JarwisyanAICoreFallback.tsx: Remove any potential bounding box artifacts (like mix-blend-mode) and make it prettier
let fallbackCode = fs.readFileSync('src/components/three/JarwisyanAICoreFallback.tsx', 'utf8');

// Remove mixBlendMode: "screen" which can cause bounding box issues
fallbackCode = fallbackCode.replace(/mixBlendMode: "screen",/g, '');

// Make the aura more subtle and avoid any square clipping
fallbackCode = fallbackCode.replace(
  /background: `radial-gradient\(circle at 50% 50%, #ffffff 0%, \$\{cfg\.primary\} 15%, \$\{cfg\.primary\}60 30%, \$\{cfg\.violet\}20 50%, transparent 70%\)`/,
  "background: `radial-gradient(circle at 50% 50%, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0.3) 20%, transparent 60%)`"
);

// Make the inner sphere look more like glass/energy rather than a grid
// Update the background of the Base Neural Sphere
fallbackCode = fallbackCode.replace(
  /background: `\s*radial-gradient\(circle at 40% 30%, rgba\(255,255,255,0\.9\), transparent 25%\),\s*radial-gradient\(circle at 50% 50%, #06b6d4, #0891b2 40%, rgba\(8,145,178,0\.4\) 70%, transparent 100%\)\s*`,/,
  "background: `radial-gradient(circle at 40% 30%, rgba(255,255,255,1) 0%, transparent 20%), radial-gradient(circle at 50% 50%, rgba(6,182,212,0.9) 0%, rgba(8,145,178,0.7) 40%, transparent 70%)`,"
);

fs.writeFileSync('src/components/three/JarwisyanAICoreFallback.tsx', fallbackCode);
