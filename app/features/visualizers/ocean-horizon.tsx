import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { OceanWaterSurface } from "~/features/visualizers/shared/ocean-water-surface";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { useFrame } from "@react-three/fiber";

function SeaMist({ featuresRef }: { featuresRef: VisualizerProps["featuresRef"] }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useRef(
    (() => {
      const arr = new Float32Array(800 * 3);
      for (let i = 0; i < 800; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 1] = Math.random() * 4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      return arr;
    })(),
  ).current;

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const arr = points.geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < 800; i++) {
      arr[i * 3]! += delta * (0.2 + featuresRef.current.mid);
      if (arr[i * 3]! > 20) arr[i * 3] = -20;
    }
    points.geometry.attributes.position!.needsUpdate = true;
    points.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#bae6fd"
        size={0.15}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
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
            <SceneEnvironment variant="sunset" intensity={0.62} />
          </Suspense>
          <AuroraSky featuresRef={featuresRef} theme={theme} />
          <ambientLight intensity={0.25} color="#7dd3fc" />
          <directionalLight position={[10, 8, -5]} intensity={1.2} color="#fdba74" />
          <SunDisk featuresRef={featuresRef} />
          <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={300} />
          <OceanWaterSurface featuresRef={featuresRef} intensity={intensity} />
          <SeaMist featuresRef={featuresRef} />
          <DreamyPostProcessing intensity={intensity} />
        </SceneSpringEntry>
      </Canvas>
    </ThreeVisualizerShell>
  );
}
