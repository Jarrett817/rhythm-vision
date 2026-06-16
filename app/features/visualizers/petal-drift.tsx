import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InstancedMesh } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

const PETAL_COUNT = 600;

function Petals({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, () => ({
        x: (Math.random() - 0.5) * 35,
        y: Math.random() * 22,
        z: (Math.random() - 0.5) * 35,
        rot: Math.random() * Math.PI,
        speed: 0.25 + Math.random() * 0.7,
        drift: Math.random() * Math.PI * 2,
        hue: 310 + Math.random() * 50,
        wobble: Math.random() * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { mid, treble, bass } = featuresRef.current;
    const t = state.clock.elapsedTime;
    const wind = (mid + 0.1) * 4 * intensity;

    data.forEach((petal, i) => {
      petal.y -= petal.speed * (0.5 + bass * 0.9) * delta * 2.5;
      petal.x +=
        (Math.sin(t * 0.6 + petal.drift) * wind +
          Math.cos(t * 0.3 + petal.wobble) * 0.5) *
        delta;
      petal.z += Math.sin(t * 0.4 + petal.drift * 1.3) * wind * 0.5 * delta;
      petal.rot += delta * (0.8 + treble * 1.5);

      if (petal.y < -3) {
        petal.y = 18 + Math.random() * 8;
        petal.x = (Math.random() - 0.5) * 35;
        petal.z = (Math.random() - 0.5) * 35;
      }

      dummy.position.set(petal.x, petal.y, petal.z);
      dummy.rotation.set(petal.rot, petal.rot * 0.6, Math.sin(t + i) * 0.3);
      dummy.scale.setScalar(0.28 + treble * 0.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PETAL_COUNT]}>
      <planeGeometry args={[0.55, 0.85]} />
      <meshStandardMaterial
        color="#f9a8d4"
        emissive="#fb7185"
        emissiveIntensity={0.6}
        transparent
        opacity={0.82}
        side={THREE.DoubleSide}
        roughness={0.4}
        metalness={0.15}
      />
    </instancedMesh>
  );
}

function SunGlow({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { rms, mid } = featuresRef.current;
    const t = state.clock.elapsedTime;
    mesh.position.y = 8 + Math.sin(t * 0.2) * 0.5;
    mesh.scale.setScalar(3 + rms * 2 + Math.sin(t * 0.8) * 0.3);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.08 + mid * 0.12;
  });

  return (
    <mesh ref={ref} position={[12, 8, -15]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#fde68a" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export function PetalDriftScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.joyful;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 3, 14], fov: 52 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.028);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.35} color="#ffd6e8" />
      <directionalLight position={[8, 12, 6]} intensity={1.2} color="#fff7ed" />
      <pointLight position={[-8, 4, 4]} intensity={2} color="#f472b6" distance={28} />
      <SunGlow featuresRef={featuresRef} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={600} />
      <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={340} />
      <Petals featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
