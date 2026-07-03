"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Wireframe } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Ico() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.08;
    ref.current.rotation.x += dt * 0.03;
  });
  const geo = useMemo(() => new THREE.IcosahedronGeometry(3, 1), []);
  return (
    <mesh ref={ref}>
      <primitive object={geo} attach="geometry" />
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.35} />
    </mesh>
  );
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = 600;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#e879f9" transparent opacity={0.5} />
    </points>
  );
}

export default function ThreeBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.4} />
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
        <Ico />
      </Float>
      <ParticleField />
      <Stars radius={50} depth={20} count={1500} factor={2} fade speed={1} />
    </Canvas>
  );
}
