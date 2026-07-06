'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'

function CubeFace({
  position,
  rotation,
  label,
  sub,
  color,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  label: string
  sub?: string
  color: string
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.6, 1.6, 0.05]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#0a0e16" emissive={color} emissiveIntensity={0.18} metalness={0.6} roughness={0.25} />
      </RoundedBox>
      <Text
        position={[0, 0.1, 0.04]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          position={[0, -0.45, 0.04]}
          fontSize={0.10}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.4}
        >
          {sub}
        </Text>
      ) : null}
    </group>
  )
}

function Cube({ name, fullName }: { name: string; fullName: string }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame((state, delta) => {
    if (!group.current) return
    const target = hovered ? 0.6 : 0.15
    group.current.rotation.y += delta * (hovered ? 1.2 : 0.3)
    group.current.rotation.x += delta * target * 0.4
  })
  const cyan = '#22d3ee'
  const magenta = '#e879f9'
  const lime = '#a3e635'
  return (
    <group
      ref={group}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <CubeFace position={[0, 0, 0.81]} rotation={[0, 0, 0]} label={name} sub={fullName} color={cyan} />
      <CubeFace position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]} label="AI" sub="ДЖАРВИС" color={magenta} />
      <CubeFace position={[0.81, 0, 0]} rotation={[0, Math.PI / 2, 0]} label="SCORE" color={lime} />
      <CubeFace position={[-0.81, 0, 0]} rotation={[0, -Math.PI / 2, 0]} label="VERDICT" color={cyan} />
      <CubeFace position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]} label="LIVE" color={magenta} />
      <CubeFace position={[0, -0.81, 0]} rotation={[Math.PI / 2, 0, 0]} label="OCR" color={lime} />
    </group>
  )
}

export default function RepoCubeCanvas({ name, fullName }: { name: string; fullName: string }) {
  return (
    <Canvas
      camera={{ position: [2.5, 2, 3.5], fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent', aspectRatio: '1' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#22d3ee" />
      <pointLight position={[-5, -3, -3]} intensity={0.6} color="#e879f9" />
      <Cube name={name} fullName={fullName} />
    </Canvas>
  )
}
