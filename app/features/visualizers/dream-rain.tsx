import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Points } from "three";
import { AdditiveBlending, Color, PointsMaterial } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

const RAIN_COUNT = 5000;

function RainStreaks({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const pointsRef = useRef<Points>(null);
  const speeds = useMemo(
    () => Float32Array.from({ length: RAIN_COUNT }, () => 0.5 + Math.random()),
    [],
  );
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 55;
      arr[i * 3 + 1] = Math.random() * 28;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }
    return arr;
  }, []);
  const color = useRef(new Color("#b8d4ff"));

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const features = featuresRef.current;
    color.current.setHSL(0.58 + features.treble * 0.08, 0.7, 0.72);
    const mat = points.material as PointsMaterial;
    mat.color.lerp(color.current, 0.06);
    mat.size = (0.08 + features.rms * 0.12) * intensity;

    const pos = points.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const speed = (8 + features.bass * 16) * intensity;

    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= speeds[i]! * speed * delta;
      arr[i * 3] += Math.sin(arr[i * 3 + 1]! * 0.05) * delta * 0.5;
      if (arr[i * 3 + 1] < -2) {
        arr[i * 3 + 1] = 20 + Math.random() * 10;
        arr[i * 3] = (Math.random() - 0.5) * 55;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 55;
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
        size={0.1}
        transparent
        opacity={0.65}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
        color="#a8c8ff"
      />
    </points>
  );
}

function WaterRipples({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ripples = useRef<{ x: number; z: number; r: number; life: number }[]>([]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { bass, rms } = featuresRef.current;

    if (bass > 0.35 && Math.random() > 0.92) {
      ripples.current.push({
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
        r: 0.1,
        life: 1,
      });
    }

    ripples.current = ripples.current.filter((rp) => {
      rp.r += delta * (3 + bass * 4) * intensity;
      rp.life -= delta * 0.6;
      return rp.life > 0 && rp.r < 8;
    });

    while (group.children.length > ripples.current.length) {
      group.remove(group.children[group.children.length - 1]!);
    }
    while (group.children.length < ripples.current.length) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 32),
        new THREE.MeshBasicMaterial({
          color: "#6080ff",
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
    }

    ripples.current.forEach((rp, i) => {
      const mesh = group.children[i] as THREE.Mesh;
      mesh.position.set(rp.x, -0.95, rp.z);
      mesh.scale.setScalar(rp.r);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = rp.life * 0.35 * (0.5 + rms);
    });
  });

  return <group ref={groupRef} />;
}

function ReflectivePool({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    const { bass, treble, mid } = featuresRef.current;
    const t = state.clock.elapsedTime;
    mat.emissiveIntensity = 0.35 + bass * 1.2;
    mat.color.setHSL(0.62 + mid * 0.05, 0.5, 0.08 + treble * 0.05);
    mat.emissive.setHSL(0.65, 0.8, 0.15 + Math.sin(t * 0.5) * 0.05);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial
        ref={matRef}
        metalness={0.95}
        roughness={0.08}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

export function DreamRainScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.sad;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 5, 14], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.022);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.2} color="#8090ff" />
      <pointLight position={[0, 10, 0]} intensity={2.5} color="#c4b5fd" distance={35} />
      <pointLight position={[-10, 3, -8]} intensity={1.5} color="#60a5fa" distance={30} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={500} />
      <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={220} />
      <RainStreaks featuresRef={featuresRef} intensity={intensity} />
      <ReflectivePool featuresRef={featuresRef} />
      <WaterRipples featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
