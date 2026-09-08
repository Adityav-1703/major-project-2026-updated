import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'

function HerbOrb({ color = '#10b981', position = [0, 0, 0] as [number, number, number], scale = 1 }) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.x = state.clock.elapsedTime * 0.15
    mesh.current.rotation.y = state.clock.elapsedTime * 0.22
  })
  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
      <Sphere ref={mesh} args={[1, 64, 64]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.35}
          speed={2.2}
          roughness={0.15}
          metalness={0.35}
          transparent
          opacity={0.92}
        />
      </Sphere>
    </Float>
  )
}

function Scene() {
  const lights = useMemo(
    () => (
      <>
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 2]} intensity={1.1} color="#a7f3d0" />
        <pointLight position={[-4, -2, -3]} intensity={0.8} color="#22d3ee" />
        <pointLight position={[2, -3, 4]} intensity={0.5} color="#34d399" />
      </>
    ),
    []
  )

  return (
    <>
      {lights}
      <HerbOrb color="#059669" position={[0, 0.1, 0]} scale={1.15} />
      <HerbOrb color="#0d9488" position={[-1.8, 0.6, -1.2]} scale={0.45} />
      <HerbOrb color="#22d3ee" position={[1.7, -0.5, -0.8]} scale={0.38} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </>
  )
}

export function HeroOrb3D({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-full w-full ${className}`} aria-hidden>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 via-transparent to-cyan-400/15 blur-2xl" />
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-32 w-32 animate-pulse rounded-full bg-emerald-500/20" />
          </div>
        }
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 4.2], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  )
}
