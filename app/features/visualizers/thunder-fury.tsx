import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

function LightningField({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bolts = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const pts = new Float32Array(36);
        let x = 0;
        let y = 0;
        let z = 0;
        for (let j = 0; j < 12; j++) {
          pts[j * 3] = x;
          pts[j * 3 + 1] = y;
          pts[j * 3 + 2] = z;
          x += (Math.random() - 0.5) * 2.5;
          y += 0.8 + Math.random() * 0.6;
          z += (Math.random() - 0.5) * 2.5;
        }
        return { pts, angle: (i / 16) * Math.PI * 2, offset: Math.random() * 10 };
      }),
    [],
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { bass, mid, rms } = featuresRef.current;
    const rage = (bass + mid + rms) * intensity;
    const t = state.clock.elapsedTime;
    group.rotation.y = t * (0.15 + rage * 0.3);

    group.children.forEach((child, i) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      const flash = Math.sin(t * 8 + i * 2) * 0.5 + 0.5;
      line.visible = rage > 0.12 || flash > 0.85;
      mat.opacity = 0.15 + rage * 0.85 + flash * 0.2;
      mat.color.setHSL(0.02 + rage * 0.05, 0.95, 0.45 + flash * 0.2);
    });
  });

  return (
    <group ref={groupRef}>
      {bolts.map((b, i) => (
        <group key={i} rotation={[0, b.angle, 0]} position={[Math.cos(b.angle) * 3, b.offset - 5, Math.sin(b.angle) * 3]}>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[b.pts, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#ff4422" transparent opacity={0.7} blending={THREE.AdditiveBlending} linewidth={2} />
          </line>
        </group>
      ))}
    </group>
  );
}

function EmberSwarm({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(2500 * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 25;
    return arr;
  }, []);
  const velocities = useMemo(
    () => Float32Array.from({ length: 2500 }, () => 0.5 + Math.random()),
    [],
  );

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const { bass, rms, mid } = featuresRef.current;
    const arr = points.geometry.attributes.position!.array as Float32Array;
    const speed = (1.5 + bass * 12) * intensity;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < 2500; i++) {
      arr[i * 3]! += Math.sin(t + i) * delta * mid * 2;
      arr[i * 3 + 1]! += velocities[i]! * speed * delta;
      if (arr[i * 3 + 1]! > 12) {
        arr[i * 3 + 1] = -8;
        arr[i * 3] = (Math.random() - 0.5) * 25;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 25;
      }
    }
    points.geometry.attributes.position!.needsUpdate = true;
    const mat = points.material as THREE.PointsMaterial;
    mat.size = 0.06 + rms * 0.2;
    mat.color.setHSL(0.05 + bass * 0.05, 0.9, 0.55);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export function ThunderFuryScene({ featuresRef, intensity, onCanvasReady }: VisualizerProps) {
  const theme = SKY_THEMES.angry;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 3, 12], fov: 58 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.035);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.1} color="#ff4400" />
      <pointLight position={[0, 6, 2]} intensity={4} color="#ff6600" distance={30} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={350} />
      <EmberSwarm featuresRef={featuresRef} intensity={intensity} />
      <LightningField featuresRef={featuresRef} intensity={intensity} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
