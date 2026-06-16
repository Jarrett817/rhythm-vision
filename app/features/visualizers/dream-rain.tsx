import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Points } from "three";
import { AdditiveBlending, Color, PointsMaterial } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { featuresToPalette } from "~/features/visualizers/shared/palette";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";

const RAIN_COUNT = 3000;

function Rain({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const pointsRef = useRef<Points>(null);
  const speeds = useMemo(
    () => Float32Array.from({ length: RAIN_COUNT }, () => 0.4 + Math.random() * 0.8),
    [],
  );
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = Math.random() * 25;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, []);
  const color = useRef(new Color("#9ec5ff"));

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const features = featuresRef.current;
    const palette = featuresToPalette(features);
    color.current.set(palette.mist);
    const mat = points.material as PointsMaterial;
    mat.color.lerp(color.current, 0.05);

    const pos = points.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const speed = (6 + features.bass * 14) * intensity;

    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= speeds[i]! * speed * delta;
      if (arr[i * 3 + 1] < -1) {
        arr[i * 3 + 1] = 18 + Math.random() * 8;
        arr[i * 3] = (Math.random() - 0.5) * 50;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12 * intensity}
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
        color="#a8c8ff"
      />
    </points>
  );
}

function MistOrbs({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { rms, treble } = featuresRef.current;
    const t = state.clock.elapsedTime;
    group.rotation.y = t * 0.05;
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const scale = 1 + rms * 2 * intensity + Math.sin(t * 0.8 + i) * 0.15;
      mesh.scale.setScalar(scale);
      mesh.position.y = Math.sin(t * 0.3 + i * 1.2) * (0.5 + treble);
    });
  });

  const orbs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        pos: [
          Math.cos((i / 5) * Math.PI * 2) * 4,
          2 + Math.sin(i) * 0.5,
          Math.sin((i / 5) * Math.PI * 2) * 4,
        ] as [number, number, number],
        size: 0.8 + Math.random() * 0.6,
      })),
    [],
  );

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.pos}>
          <sphereGeometry args={[orb.size, 32, 32]} />
          <meshBasicMaterial
            color={`hsl(${260 + i * 15}, 70%, 65%)`}
            transparent
            opacity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

function WetGround({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    const { bass, treble } = featuresRef.current;
    mat.emissiveIntensity = 0.2 + bass * 0.8;
    mat.roughness = 0.15 + treble * 0.2;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0a0a14"
        metalness={0.9}
        roughness={0.2}
        emissive="#1a2040"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

export function DreamRainScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 6, 14], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.Fog("#0a0818", 8, 45);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <color attach="background" args={["#06050f"]} />
      <ambientLight intensity={0.15} color="#8090ff" />
      <pointLight position={[0, 8, 0]} intensity={2} color="#c4b5fd" distance={30} />
      <pointLight position={[-8, 4, -6]} intensity={1.2} color="#60a5fa" distance={25} />
      <Rain featuresRef={featuresRef} intensity={intensity} />
      <MistOrbs featuresRef={featuresRef} intensity={intensity} />
      <WetGround featuresRef={featuresRef} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
