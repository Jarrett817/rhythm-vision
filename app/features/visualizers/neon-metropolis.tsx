import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InstancedMesh } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

const BUILDING_COUNT = 48;

function Skyline({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const buildings = useMemo(
    () =>
      Array.from({ length: BUILDING_COUNT }, (_, i) => ({
        x: (i - BUILDING_COUNT / 2) * 1.8 + (Math.random() - 0.5) * 0.5,
        h: 2 + Math.random() * 8,
        w: 0.8 + Math.random() * 1.2,
        d: 0.8 + Math.random() * 0.8,
        hue: 260 + Math.random() * 40,
        windowPhase: Math.random() * 10,
      })),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { bass, mid, rms } = featuresRef.current;
    const t = state.clock.elapsedTime;

    buildings.forEach((b, i) => {
      const pulse = 0.5 + Math.sin(t * 2 + b.windowPhase + mid * 5) * 0.5;
      const h = b.h * (1 + bass * 0.15 * intensity);
      dummy.position.set(b.x, h / 2 - 2, -8 - b.d * 0.5);
      dummy.scale.set(b.w, h, b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        new THREE.Color().setHSL(
          b.hue / 360,
          0.6,
          0.08 + pulse * 0.12 + rms * 0.15,
        ),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BUILDING_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#1a1a2e"
        emissive="#6366f1"
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.6}
      />
    </instancedMesh>
  );
}

function WindowLights({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = 600;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 45;
      arr[i * 3 + 1] = Math.random() * 10 - 1;
      arr[i * 3 + 2] = -7 - Math.random() * 3;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const points = ref.current;
    if (!points) return;
    const { mid, treble, rms } = featuresRef.current;
    const mat = points.material as THREE.PointsMaterial;
    mat.size = (0.08 + treble * 0.12) * intensity;
    mat.opacity = 0.4 + mid * 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.1 * rms;
    mat.color.setHSL(0.78 + treble * 0.1, 0.9, 0.65);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function WetStreet({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    const { bass, mid } = featuresRef.current;
    mat.emissiveIntensity = 0.15 + bass * 0.5;
    mat.roughness = 0.05 + mid * 0.1;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -4]}>
      <planeGeometry args={[60, 30]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0a0a12"
        metalness={0.95}
        roughness={0.08}
        emissive="#4c1d95"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

function NeonSigns({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const groupRef = useRef<THREE.Group>(null);
  const signs = useMemo(
    () =>
      [-12, -5, 4, 14].map((x, i) => ({
        x,
        y: 2 + Math.random() * 3,
        z: -9,
        hue: [300, 330, 190, 270][i]!,
      })),
    [],
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { rms, treble } = featuresRef.current;
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + rms * 0.5 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.15;
      mat.color.setHSL(signs[i]!.hue / 360, 0.95, 0.55 + treble * 0.2);
    });
  });

  return (
    <group ref={groupRef}>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <planeGeometry args={[3, 0.6]} />
          <meshBasicMaterial
            color={`hsl(${s.hue}, 95%, 60%)`}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function NeonMetropolisScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.city;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 1, 10], fov: 58 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.028);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.08} color="#a78bfa" />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#e879f9" distance={30} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={400} />
      <Skyline featuresRef={featuresRef} intensity={intensity} />
      <WindowLights featuresRef={featuresRef} intensity={intensity} />
      <NeonSigns featuresRef={featuresRef} />
      <WetStreet featuresRef={featuresRef} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
