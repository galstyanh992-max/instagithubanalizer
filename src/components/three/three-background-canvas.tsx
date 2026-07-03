'use client'

import { Canvas } from '@react-three/fiber'
import { Stars, Wireframe } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

function Icosahedron() {
  const geom = useMemo(() => new THREE.IcosahedronGeometry(2.4, 1), [])
  return (
    <mesh rotation={[0, 0, 0]}>
      <primitive object={geom} attach="geometry" />
      <Wireframe
        fill="transparent"
        stroke="#22d3ee"
        thickness={0.5}
        opacity={0.55}
      />
    </mesh>
  )
}

function RotatingScene() {
  return (
    <group rotation={[0.3, 0.4, 0]}>
      <Icosahedron />
      <mesh scale={1.05}>
        <icosahedronGeometry args={[2.4, 0]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

function GridFloor() {
  return (
    <gridHelper
      args={[60, 60, '#22d3ee', '#0a1822']}
      position={[0, -4, 0]}
    />
  )
}

export default function ThreeBackgroundCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} color="#22d3ee" />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="#e879f9" />
      <Stars radius={80} depth={40} count={1200} factor={4} saturation={0} fade speed={1} />
      <RotatingScene />
      <GridFloor />
    </Canvas>
  )
}
