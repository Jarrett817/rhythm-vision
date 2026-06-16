import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

function PulseRings({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const count = 12;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { bass, mid, treble, rms } = featuresRef.current;
    const t = state.clock.elapsedTime;
    const speed = (1.2 + bass * 4 + rms * 2) * intensity;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const phase = t * speed + i * 0.45;
      const radius = 1.2 + i * 0.7 + Math.sin(phase) * (0.6 + mid);
      mesh.scale.set(radius, radius, 1);
      mesh.rotation.z = phase * 0.3;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(phase * 2) * 0.12 + treble * 0.35;
      mat.color.setHSL(0.52 + i * 0.03 + treble * 0.12, 0.95, 0.58);
    });
    group.rotation.z = t * 0.25 * speed;
    group.rotation.x = Math.sin(t * 0.3) * 0.15;
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <torusGeometry args={[1, 0.02 + (i % 3) * 0.008, 10, 96]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function WarpTunnel({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = 1500;
  const positionsRef = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 18;
        arr[i * 3] = Math.cos(angle) * r;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
        arr[i * 3 + 2] = Math.sin(angle) * r;
      }
      return arr;
    })(),
  );

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const { mid, rms, bass } = featuresRef.current;
    const arr = positionsRef.current;
    const speed = (2 + bass * 8) * intensity * delta;

    for (let i = 0; i < count; i++) {
      const z = arr[i * 3 + 2]! + speed;
      if (z > 15) arr[i * 3 + 2] = -15;
      else arr[i * 3 + 2] = z;
    }
    points.geometry.attributes.position!.needsUpdate = true;
    points.rotation.y += delta * (0.3 + mid * 1.5);
    const mat = points.material as THREE.PointsMaterial;
    mat.size = 0.04 + rms * 0.15;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positionsRef.current, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#67e8f9" size={0.08} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

export function PulseRushScene({ featuresRef, intensity, onCanvasReady }: VisualizerProps) {
  const theme = SKY_THEMES.fast;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 9], fov: 62 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.025);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.2} color="#0891b2" />
      <pointLight position={[0, 0, 3]} intensity={2} color="#22d3ee" distance={25} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={450} />
      <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={190} />
      <WarpTunnel featuresRef={featuresRef} intensity={intensity} />
      <PulseRings featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
