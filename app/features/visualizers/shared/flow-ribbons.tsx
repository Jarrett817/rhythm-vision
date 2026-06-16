import { Sparkles, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";

const RIBBON_COUNT = 5;

function Ribbon({
  featuresRef,
  intensity,
  index,
  hue,
}: {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
  index: number;
  hue: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const pts = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      return new THREE.Vector3(
        Math.sin(t * Math.PI * 2 + index) * 6,
        (t - 0.5) * 8,
        Math.cos(t * Math.PI * 2 + index * 0.7) * 6,
      );
    });
    return new THREE.CatmullRomCurve3(pts);
  }, [index]);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 64, 0.04, 8, false),
    [curve],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { rms, mid, bass } = featuresRef.current;
    const t = state.clock.elapsedTime;
    mesh.rotation.y = t * (0.08 + index * 0.02) + bass * 0.5;
    mesh.rotation.x = Math.sin(t * 0.3 + index) * 0.3;
    mesh.scale.setScalar(1 + rms * intensity * 0.6);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.15 + mid * 0.35 + Math.sin(t * 1.5 + index) * 0.08;
    mat.color.setHSL(hue / 360, 0.85, 0.65);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color={`hsl(${hue}, 85%, 65%)`}
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function FlowRibbons({
  featuresRef,
  intensity,
  baseHue = 260,
}: {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
  baseHue?: number;
}) {
  return (
    <group>
      {Array.from({ length: RIBBON_COUNT }, (_, i) => (
        <Ribbon
          key={i}
          index={i}
          featuresRef={featuresRef}
          intensity={intensity}
          hue={baseHue + i * 25}
        />
      ))}
    </group>
  );
}

export function SceneSparkles({
  featuresRef,
  color = "#ffffff",
  count = 400,
}: {
  featuresRef: RefObject<AudioFeatures>;
  color?: string;
  count?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = state.clock.elapsedTime * 0.04;
    const scale = 1 + featuresRef.current.rms * 0.5;
    g.scale.setScalar(scale);
  });

  return (
    <group ref={ref}>
      <Sparkles
        count={count}
        scale={[30, 18, 30]}
        size={3}
        speed={0.5}
        opacity={0.6}
        color={color}
      />
      <Stars
        radius={50}
        depth={40}
        count={1200}
        factor={2}
        saturation={0.4}
        fade
        speed={0.5}
      />
    </group>
  );
}
