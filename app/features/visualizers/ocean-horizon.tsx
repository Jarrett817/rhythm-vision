import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { OceanWaterSurface } from "~/features/visualizers/shared/ocean-water-surface";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { useFrame } from "@react-three/fiber";

function SeaMist({ featuresRef }: { featuresRef: VisualizerProps["featuresRef"] }) {
  const groupRef = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: -22 + i * 2.6 + (Math.random() - 0.5) * 1.4,
        y: -0.65 + Math.random() * 0.75,
        z: -10 - Math.random() * 18,
        width: 5 + Math.random() * 8,
        height: 0.28 + Math.random() * 0.42,
        phase: Math.random() * Math.PI * 2,
        speed: 0.08 + Math.random() * 0.16,
      })),
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    const { mid, rms } = featuresRef.current;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const puff = puffs[i]!;
      mesh.position.x += delta * (puff.speed + mid * 0.3);
      if (mesh.position.x > 24) mesh.position.x = -24;
      mesh.position.y = puff.y + Math.sin(t * 0.25 + puff.phase) * 0.08;
      mesh.scale.set(
        puff.width * (1 + rms * 0.12),
        puff.height * (1 + rms * 0.18),
        1,
      );
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.055 + rms * 0.04 + Math.sin(t * 0.18 + puff.phase) * 0.012;
    });
  });

  return (
    <group ref={groupRef}>
      {puffs.map((puff, i) => (
        <mesh key={i} position={[puff.x, puff.y, puff.z]} rotation={[-0.22, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#b8d6df"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function SunDisk({ featuresRef }: { featuresRef: VisualizerProps["featuresRef"] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const { rms } = featuresRef.current;
    mesh.scale.setScalar(2.5 + rms * 1.5);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + rms * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, 6, -25]}>
      <circleGeometry args={[2, 32]} />
      <meshBasicMaterial
        color="#fdba74"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function OceanHorizonScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.ocean;

  return (
    <ThreeVisualizerShell>
      <Canvas
        className="size-full"
        camera={{ position: [0, 2, 12], fov: 55 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          scene.fog = new THREE.FogExp2(theme.fog, 0.015);
          onCanvasReady?.(gl.domElement);
        }}
      >
        <SceneSpringEntry>
          <Suspense fallback={null}>
            <SceneEnvironment variant="sunset" intensity={0.32} />
          </Suspense>
          <AuroraSky featuresRef={featuresRef} theme={theme} />
          <ambientLight intensity={0.25} color="#7dd3fc" />
          <directionalLight position={[10, 8, -5]} intensity={1.2} color="#fdba74" />
          <SunDisk featuresRef={featuresRef} />
          <OceanWaterSurface featuresRef={featuresRef} intensity={intensity} />
          <SeaMist featuresRef={featuresRef} />
          <DreamyPostProcessing intensity={intensity} />
        </SceneSpringEntry>
      </Canvas>
    </ThreeVisualizerShell>
  );
}
