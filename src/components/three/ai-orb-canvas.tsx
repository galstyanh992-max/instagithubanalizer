'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

function Orb({ listening }: { listening: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    const speed = listening ? 4 : 1
    ref.current.rotation.y = t * 0.3 * speed
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.2
    const pulse = 1 + Math.sin(t * (listening ? 6 : 2)) * (listening ? 0.08 : 0.03)
    ref.current.scale.setScalar(pulse)
  })
  const emissive = listening ? '#e879f9' : '#22d3ee'
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial
          color={emissive}
          emissive={emissive}
          emissiveIntensity={listening ? 0.7 : 0.4}
          roughness={0.1}
          metalness={0.7}
          distort={listening ? 0.5 : 0.25}
          speed={listening ? 4 : 1.5}
        />
      </mesh>
      <mesh scale={1.18}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={emissive} wireframe transparent opacity={0.18} />
      </mesh>
    </Float>
  )
}

export default function AiOrbCanvas({ listening = false }: { listening?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#22d3ee" />
      <pointLight position={[-3, -2, -2]} intensity={0.8} color="#e879f9" />
      <Orb listening={listening} />
    </Canvas>
  )
}
