import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { LineSegments } from "three";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { MoonlitWaterSurface } from "~/features/visualizers/shared/moonlit-water-surface";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { useAudioResponse } from "~/features/visualizers/shared/audio-response";
import {
  Bloom,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";

const RAIN_COUNT = 6500;
const FOREGROUND_RAIN_COUNT = 1200;
const MOON_DIR = new THREE.Vector3(0.42, 0.78, -0.38);

function Moon() {
  return (
    <group position={[14, 16, -28]}>
      <mesh>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshBasicMaterial color="#eef2ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#9eb8ff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#6b8fd4" transparent opacity={0.025} depthWrite={false} />
      </mesh>
      <pointLight color="#d4e4ff" intensity={4} distance={80} decay={2} />
    </group>
  );
}

function StageRainBeams({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<import("~/lib/audio/types").AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.rotation.z = Math.sin(t * 0.18 + i) * 0.08;
      mesh.position.x = (i - 2) * 8 + Math.sin(t * 0.12 + i) * 1.2;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.045 + audio.rms * 0.05 * intensity + audio.treble * 0.025;
    });
  });

  return (
    <group ref={groupRef} position={[0, 5, -11]}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} rotation={[0.12, 0, (i - 2) * 0.08]}>
          <planeGeometry args={[4.5, 24]} />
          <meshBasicMaterial
            color="#9fb7ff"
            transparent
            opacity={0.055}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function ForegroundRain({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<import("~/lib/audio/types").AudioFeatures>;
  intensity: number;
}) {
  const linesRef = useRef<LineSegments>(null);
  const audio = useAudioResponse(featuresRef);
  const speeds = useMemo(
    () => Float32Array.from({ length: FOREGROUND_RAIN_COUNT }, () => 24 + Math.random() * 28),
    [],
  );
  const positions = useMemo(() => {
    const arr = new Float32Array(FOREGROUND_RAIN_COUNT * 6);
    for (let i = 0; i < FOREGROUND_RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * 52;
      const y = Math.random() * 28;
      const z = 4 + Math.random() * 10;
      const len = 1.3 + Math.random() * 2.4;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + 0.12;
      arr[i * 6 + 4] = y - len;
      arr[i * 6 + 5] = z + 0.05;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const lines = linesRef.current;
    if (!lines) return;
    audio.update(delta);
    const arr = lines.geometry.attributes.position.array as Float32Array;
    const speedMul = 1 + audio.bass * 0.9 * intensity;

    for (let i = 0; i < FOREGROUND_RAIN_COUNT; i++) {
      const spd = speeds[i]! * speedMul * delta;
      for (let v = 0; v < 2; v++) {
        const idx = i * 6 + v * 3;
        arr[idx]! += (0.16 + audio.mid * 0.5) * delta;
        arr[idx + 1]! -= spd;
      }
      if (arr[i * 6 + 1]! < -1) {
        const x = (Math.random() - 0.5) * 52;
        const y = 24 + Math.random() * 10;
        const z = 4 + Math.random() * 10;
        const len = 1.3 + Math.random() * 2.4;
        arr[i * 6] = x;
        arr[i * 6 + 1] = y;
        arr[i * 6 + 2] = z;
        arr[i * 6 + 3] = x + 0.12;
        arr[i * 6 + 4] = y - len;
        arr[i * 6 + 5] = z + 0.05;
      }
    }

    lines.geometry.attributes.position.needsUpdate = true;
    const mat = lines.material as THREE.LineBasicMaterial;
    mat.opacity = 0.12 + audio.treble * 0.18 * intensity;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#dbeafe"
        transparent
        opacity={0.14}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

function MistVeil() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 0.15) * 0.4;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
  });
  return (
    <mesh ref={ref} position={[0, 2, -15]} rotation={[-0.1, 0, 0]}>
      <planeGeometry args={[120, 18]} />
      <meshBasicMaterial color="#8aa8d8" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function RealisticRain({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<import("~/lib/audio/types").AudioFeatures>;
  intensity: number;
}) {
  const linesRef = useRef<LineSegments>(null);
  const audio = useAudioResponse(featuresRef);
  const speeds = useMemo(
    () => Float32Array.from({ length: RAIN_COUNT }, () => 18 + Math.random() * 22),
    [],
  );
  const lengths = useMemo(
    () => Float32Array.from({ length: RAIN_COUNT }, () => 0.6 + Math.random() * 1.4),
    [],
  );
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * 70;
      const y = Math.random() * 35;
      const z = (Math.random() - 0.5) * 50;
      const len = lengths[i]!;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + 0.04;
      arr[i * 6 + 4] = y - len;
      arr[i * 6 + 5] = z + 0.02;
    }
    return arr;
  }, [lengths]);

  useFrame((_, delta) => {
    const lines = linesRef.current;
    if (!lines) return;
    audio.update(delta);
    const wind = 0.3 + audio.mid * 1.2 * intensity;
    const speedMul = 1 + audio.bass * 0.8 * intensity;
    const arr = lines.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const spd = speeds[i]! * speedMul * delta;
      for (let v = 0; v < 2; v++) {
        const idx = i * 6 + v * 3;
        arr[idx]! += wind * delta * 0.6;
        arr[idx + 1]! -= spd;
      }
      const headY = arr[i * 6 + 1]!;
      if (headY < -0.5) {
        const x = (Math.random() - 0.5) * 70;
        const y = 28 + Math.random() * 8;
        const z = (Math.random() - 0.5) * 50;
        const len = lengths[i]!;
        arr[i * 6] = x;
        arr[i * 6 + 1] = y;
        arr[i * 6 + 2] = z;
        arr[i * 6 + 3] = x + 0.04;
        arr[i * 6 + 4] = y - len;
        arr[i * 6 + 5] = z + 0.02;
      }
    }
    lines.geometry.attributes.position.needsUpdate = true;
    const mat = lines.material as THREE.LineBasicMaterial;
    mat.opacity = 0.22 + audio.treble * 0.18 * intensity;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#b8cce8"
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </lineSegments>
  );
}

function RainRipples({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<import("~/lib/audio/types").AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const ripples = useRef<{ x: number; z: number; r: number; life: number }[]>([]);
  const pool = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);

    if ((audio.isBeatDrop || audio.rms > 0.35) && Math.random() > 0.7 && ripples.current.length < 18) {
      ripples.current.push({
        x: (Math.random() - 0.5) * 30,
        z: (Math.random() - 0.5) * 20,
        r: 0.05,
        life: 1,
      });
    }

    ripples.current = ripples.current.filter((rp) => {
      rp.r += delta * (3 + audio.bass * 2 * intensity);
      rp.life -= delta * 0.9;
      return rp.life > 0 && rp.r < 6;
    });

    while (pool.current.length > ripples.current.length) {
      const m = pool.current.pop()!;
      group.remove(m);
    }
    while (pool.current.length < ripples.current.length) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1, 48),
        new THREE.MeshBasicMaterial({
          color: "#a8c4e8",
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      pool.current.push(ring);
    }

    ripples.current.forEach((rp, i) => {
      const mesh = pool.current[i]!;
      mesh.position.set(rp.x, 0.02, rp.z);
      mesh.scale.setScalar(rp.r);
      (mesh.material as THREE.MeshBasicMaterial).opacity = rp.life * 0.12;
    });
  });

  return <group ref={groupRef} />;
}

export function DreamRainScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <ThreeVisualizerShell>
      <Canvas
        className="size-full"
        camera={{ position: [0, 1.8, 10], fov: 52 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color("#040810");
          scene.fog = new THREE.FogExp2("#0a1428", 0.028);
          onCanvasReady?.(gl.domElement);
        }}
      >
        <SceneSpringEntry>
          <Suspense fallback={null}>
            <SceneEnvironment variant="night" intensity={0.48} />
            <color attach="background" args={["#040810"]} />
            <ambientLight intensity={0.12} color="#4a6088" />
            <hemisphereLight args={["#1a2848", "#020408", 0.35]} />
            <directionalLight position={[-8, 9, 6]} intensity={0.9} color="#6ea8ff" />
            <Moon />
            <StageRainBeams featuresRef={featuresRef} intensity={intensity} />
            <MistVeil />
            <MoonlitWaterSurface
              featuresRef={featuresRef}
              intensity={intensity}
              moonDir={MOON_DIR}
            />
            <RealisticRain featuresRef={featuresRef} intensity={intensity} />
            <ForegroundRain featuresRef={featuresRef} intensity={intensity} />
            <RainRipples featuresRef={featuresRef} intensity={intensity} />
            <EffectComposer multisampling={4}>
              <Bloom
                intensity={1.2 + intensity * 0.8}
                luminanceThreshold={0.35}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.22} darkness={0.65} />
            </EffectComposer>
          </Suspense>
        </SceneSpringEntry>
      </Canvas>
    </ThreeVisualizerShell>
  );
}
