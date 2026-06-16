import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InstancedMesh } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";

const PETAL_COUNT = 400;

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
        x: (Math.random() - 0.5) * 30,
        y: Math.random() * 20,
        z: (Math.random() - 0.5) * 30,
        rot: Math.random() * Math.PI,
        speed: 0.3 + Math.random() * 0.6,
        drift: Math.random() * Math.PI * 2,
        hue: 320 + Math.random() * 40,
      })),
    [],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { mid, treble, bass } = featuresRef.current;
    const t = state.clock.elapsedTime;
    const wind = (mid - 0.3) * 3 * intensity;

    data.forEach((petal, i) => {
      petal.y -= petal.speed * (0.6 + bass * 0.8) * delta * 2;
      petal.x += Math.sin(t * 0.5 + petal.drift) * wind * delta;
      petal.rot += delta * (0.5 + treble);

      if (petal.y < -2) {
        petal.y = 16 + Math.random() * 6;
        petal.x = (Math.random() - 0.5) * 30;
        petal.z = (Math.random() - 0.5) * 30;
      }

      dummy.position.set(petal.x, petal.y, petal.z);
      dummy.rotation.set(petal.rot, petal.rot * 0.5, 0);
      dummy.scale.setScalar(0.25 + treble * 0.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PETAL_COUNT]}>
      <planeGeometry args={[0.6, 0.9]} />
      <meshStandardMaterial
        color="#f9a8d4"
        emissive="#fda4af"
        emissiveIntensity={0.4}
        transparent
        opacity={0.75}
        side={THREE.DoubleSide}
        roughness={0.6}
        metalness={0.1}
      />
    </instancedMesh>
  );
}

function SoftParticles({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1200 * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 35;
    return arr;
  }, []);

  useFrame((state) => {
    const points = ref.current;
    if (!points) return;
    const mat = points.material as THREE.PointsMaterial;
    mat.opacity = 0.25 + featuresRef.current.treble * 0.35;
    points.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#fce7f3"
        size={0.15}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function PetalDriftScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 4, 12], fov: 50 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2("#1a0a14", 0.035);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <color attach="background" args={["#120810"]} />
      <ambientLight intensity={0.25} color="#ffd6e8" />
      <directionalLight position={[5, 10, 5]} intensity={0.8} color="#fff1f2" />
      <pointLight position={[-6, 3, 2]} intensity={1.5} color="#f472b6" distance={20} />
      <SoftParticles featuresRef={featuresRef} />
      <Petals featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
