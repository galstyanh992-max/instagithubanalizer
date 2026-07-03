"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function Cube({ label }: { label: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.5) * 0.4;
    ref.current.rotation.x = Math.cos(t * 0.3) * 0.2;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="#0a1320"
        emissive="#22d3ee"
        emissiveIntensity={0.3}
        metalness={0.6}
        roughness={0.3}
        wireframe={false}
      />
    </mesh>
  );
}

export default function RepoCube({ fullName }: { fullName: string }) {
  return (
    <div className="h-32 w-32 relative">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <pointLight position={[2, 2, 2]} intensity={2} color="#22d3ee" />
        <pointLight position={[-2, -1, 1]} intensity={1.5} color="#e879f9" />
        <Cube label={fullName} />
      </Canvas>
    </div>
  );
}
