import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { featuresToPalette } from "~/features/visualizers/shared/palette";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";

function AuroraRings({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => [3.5, 5, 6.5, 8], []);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { rms, bass, mid } = featuresRef.current;
    const t = state.clock.elapsedTime;
    group.rotation.x = Math.sin(t * 0.1) * 0.2;
    group.rotation.z = t * 0.08;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const palette = featuresToPalette(featuresRef.current);
      mat.color.set(palette.glow);
      mat.opacity = 0.08 + rms * 0.2 + Math.sin(t + i) * 0.03;
      mesh.scale.setScalar(1 + bass * 0.3 * intensity + i * 0.05);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.15, 0, i * 0.4]}>
          <torusGeometry args={[radius, 0.02, 8, 128]} />
          <meshBasicMaterial
            color={`hsl(${260 + i * 20}, 80%, 70%)`}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function CoreOrb({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = useRef(new THREE.Color("#c4b5fd"));

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const features = featuresRef.current;
    const palette = featuresToPalette(features);
    color.current.set(palette.glow);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.lerp(color.current, 0.08);
    mat.emissiveIntensity = 0.6 + features.rms * 2 * intensity;
    mesh.scale.setScalar(1.2 + features.bass * 0.8 * intensity);
    mesh.rotation.y = state.clock.elapsedTime * 0.15;
  });

  return (
    <Sphere ref={ref} args={[1.2, 64, 64]}>
      <MeshDistortMaterial
        color="#a78bfa"
        emissive="#818cf8"
        emissiveIntensity={0.8}
        roughness={0.2}
        metalness={0.4}
        distort={0.35}
        speed={2}
        transparent
        opacity={0.9}
      />
    </Sphere>
  );
}

function StarMist({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(2000 * 3);
    for (let i = 0; i < arr.length; i++) {
      const r = 5 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const points = ref.current;
    if (!points) return;
    points.rotation.y = state.clock.elapsedTime * 0.03;
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    const mat = points.material as THREE.PointsMaterial;
    mat.size = 0.06 + featuresRef.current.mid * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e9d5ff"
        size={0.08}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export function EtherealGlowScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 10], fov: 55 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.Fog("#08061a", 12, 40);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <color attach="background" args={["#05040f"]} />
      <ambientLight intensity={0.1} color="#a78bfa" />
      <pointLight position={[0, 0, 4]} intensity={2} color="#ddd6fe" distance={30} />
      <StarMist featuresRef={featuresRef} />
      <AuroraRings featuresRef={featuresRef} intensity={intensity} />
      <CoreOrb featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
