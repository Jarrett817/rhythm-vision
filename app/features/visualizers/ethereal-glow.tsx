import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { featuresToPalette } from "~/features/visualizers/shared/palette";

function AuroraRings({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => [2.5, 4, 5.5, 7, 8.5, 10], []);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { rms, bass, mid } = featuresRef.current;
    const t = state.clock.elapsedTime;
    group.rotation.x = Math.sin(t * 0.12) * 0.25;
    group.rotation.z = t * 0.06;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const palette = featuresToPalette(featuresRef.current);
      mat.color.set(palette.glow);
      mat.opacity = 0.1 + rms * 0.25 + Math.sin(t * 1.2 + i) * 0.06;
      const pulse = 1 + bass * 0.4 * intensity + Math.sin(t * 0.8 + i * 0.7) * 0.1;
      mesh.scale.set(pulse, pulse, 1);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.12, i * 0.5, i * 0.3]}>
          <torusGeometry args={[radius, 0.025 + i * 0.003, 12, 128]} />
          <meshBasicMaterial
            color={`hsl(${260 + i * 18}, 85%, 68%)`}
            transparent
            opacity={0.2}
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
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = ref.current;
    const inner = innerRef.current;
    if (!mesh || !inner) return;
    const features = featuresRef.current;
    const palette = featuresToPalette(features);
    mesh.scale.setScalar(1.3 + features.bass * 1 * intensity);
    mesh.rotation.y = state.clock.elapsedTime * 0.12;
    mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    inner.rotation.y = -state.clock.elapsedTime * 0.2;
    inner.scale.setScalar(0.55 + features.treble * 0.3);
    const mat = inner.material as THREE.MeshBasicMaterial;
    mat.color.set(palette.accent);
    mat.opacity = 0.25 + features.rms * 0.4;
  });

  return (
    <group>
      <Sphere ref={ref} args={[1.4, 64, 64]}>
        <MeshDistortMaterial
          color="#a78bfa"
          emissive="#818cf8"
          emissiveIntensity={1.2}
          roughness={0.15}
          metalness={0.5}
          distort={0.45}
          speed={3}
          transparent
          opacity={0.88}
        />
      </Sphere>
      <Sphere ref={innerRef} args={[0.8, 32, 32]}>
        <meshBasicMaterial color="#e9d5ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </Sphere>
    </group>
  );
}

export function EtherealGlowScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.slow;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 11], fov: 55 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.018);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.15} color="#a78bfa" />
      <pointLight position={[0, 0, 5]} intensity={2.5} color="#ddd6fe" distance={35} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={700} />
      <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={270} />
      <AuroraRings featuresRef={featuresRef} intensity={intensity} />
      <CoreOrb featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
