"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

function Orb({ listening }: { listening: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.y = t * 0.3;
    if (matRef.current) {
      const target = listening ? 1.5 : 0.8;
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        matRef.current.emissiveIntensity,
        target,
        0.05
      );
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.2, 4]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0891b2"
        emissive="#22d3ee"
        emissiveIntensity={0.8}
        metalness={0.7}
        roughness={0.2}
        wireframe={false}
      />
    </mesh>
  );
}

export default function AiOrb({
  listening = false,
  size = 280,
}: {
  listening?: boolean;
  size?: number;
}) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 3]} intensity={2} color="#22d3ee" />
        <pointLight position={[-3, -2, 2]} intensity={1.5} color="#e879f9" />
        <Orb listening={listening} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: listening
            ? "0 0 80px 20px rgba(34, 211, 238, 0.45)"
            : "0 0 60px 10px rgba(34, 211, 238, 0.25)",
        }}
      />
    </div>
  );
}
