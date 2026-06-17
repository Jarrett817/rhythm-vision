import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";

const BUILDING_COUNT = 52;

// ================= 音乐驱动的摩天大楼群 =================
function MusicalSkyline({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const buildings = useMemo(
    () =>
      Array.from({ length: BUILDING_COUNT }, (_, i) => ({
        x: (i - BUILDING_COUNT / 2) * 1.7 + (Math.random() - 0.5) * 0.6,
        baseHeight: 1.5 + Math.random() * 9,
        w: 0.7 + Math.random() * 1.3,
        d: 0.7 + Math.random() * 0.9,
        hue: 260 + Math.random() * 50, // 紫色~蓝色
        band: i % 3, // 0=bass, 1=mid, 2=treble，不同建筑响应不同频段
        windowPhase: Math.random() * Math.PI * 2,
      })),
    [],
  );

  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    buildings.forEach((b, i) => {
      // 不同建筑响应不同频段，创造"分层亮起"的效果
      let heightMult = 1;
      let glowMult = 0;

      if (b.band === 0) {
        // bass 建筑：高建筑随低音脉冲
        heightMult = 1 + audio.bass * 0.25 * intensity;
        glowMult = audio.bass * 0.8;
      } else if (b.band === 1) {
        // mid 建筑：中频驱动呼吸
        heightMult = 1 + audio.mid * 0.15 * intensity;
        glowMult = audio.mid * 0.6 + audio.rms * 0.3;
      } else {
        // treble 建筑：高频驱动闪烁
        heightMult = 1 + audio.treble * 0.1 * intensity;
        glowMult = audio.treble;
      }

      const actualHeight = b.baseHeight * heightMult;

      // 窗户闪烁节奏
      const windowPulse = 0.4 + Math.sin(t * 2.5 + b.windowPhase + audio.mid * 4) * 0.3;

      dummy.position.set(b.x, actualHeight / 2 - 2, -8 - b.d * 0.4);
      dummy.scale.set(b.w, actualHeight, b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // 发光颜色和强度
      const lightness = 0.06 + windowPulse * 0.1 + glowMult * 0.25;
      color.setHSL(b.hue / 360, 0.65, lightness);
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BUILDING_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#16162a"
        emissive="#6366f1"
        emissiveIntensity={0.5}
        roughness={0.25}
        metalness={0.7}
      />
    </instancedMesh>
  );
}

// ================= 音乐窗户灯光 =================
function MusicalWindowLights({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const count = 800;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = Math.random() * 11 - 1;
      arr[i * 3 + 2] = -7 - Math.random() * 3.5;
    }
    return arr;
  }, []);

  // 每个窗口属于不同的频段
  const bands = useMemo(() => {
    return Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 3));
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    const mat = points.material as THREE.PointsMaterial;

    // 整体大小和亮度随音乐变化
    mat.size = (0.07 + audio.treble * 0.15) * intensity;
    mat.opacity = 0.35 + audio.rms * 0.5 + Math.sin(t * 2.5) * 0.08;

    // 整体颜色随 mid 偏移
    mat.color.setHSL(0.75 + audio.mid * 0.15, 0.9, 0.65);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ================= 音乐湿地面 =================
function MusicalWetStreet({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothRoughness = useRef(new SmoothValue(0.1));

  useFrame((state, delta) => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh) return;

    audio.update(delta);

    // Bass 冲击时地面震动
    if (audio.isBeatDrop) {
      mesh.position.y = -2 + audio.impact * 0.05;
    } else {
      mesh.position.y = -2;
    }

    // 地面反光强度随 bass 变化
    mat.emissiveIntensity = smoothRoughness.current.update(
      0.2 + audio.bass * 0.6,
      delta,
    );

    // 中频让地面更粗糙
    mat.roughness = 0.05 + audio.mid * 0.15;

    // 颜色随 mid 偏移
    mat.emissive.setHSL(0.75 + audio.mid * 0.1, 0.8, 0.15);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -4]}>
      <planeGeometry args={[70, 35]} />
      <meshStandardMaterial
        ref={matRef}
        color="#080812"
        metalness={0.98}
        roughness={0.06}
        emissive="#3b0764"
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

// ================= 音乐霓虹灯牌 =================
function MusicalNeonSigns({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);

  const signs = useMemo(
    () =>
      [-14, -6, 3, 13].map((x, i) => ({
        x,
        y: 1.5 + Math.random() * 3,
        z: -9.5,
        hue: [310, 340, 195, 280][i]!, // 品红~青~紫
        band: i % 3,
      })),
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const sign = signs[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      // 不同灯牌响应不同频段
      let flickerAmount = 0;
      if (sign.band === 0) {
        flickerAmount = audio.bass;
      } else if (sign.band === 1) {
        flickerAmount = audio.mid;
      } else {
        flickerAmount = audio.treble;
      }

      // 闪烁效果
      const flicker = 0.3 + audio.rms * 0.4 +
        Math.sin(t * (2 + sign.band) + i) * 0.15 +
        flickerAmount * 0.5;

      mat.opacity = Math.min(1, flicker) * intensity;

      // 颜色饱和度随能量变化
      mat.color.setHSL(sign.hue / 360, 0.95, 0.5 + audio.rms * 0.15);
    });
  });

  return (
    <group ref={groupRef}>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <planeGeometry args={[2.8, 0.5]} />
          <meshBasicMaterial
            color={`hsl(${s.hue}, 95%, 55%)`}
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ================= 音乐车流光轨 =================
function TrafficTrails({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const trailCount = 200;

  const data = useMemo(() => {
    const positions = new Float32Array(trailCount * 3);
    const speeds = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25; // x
      positions[i * 3 + 1] = -1.8; // 贴近地面
      positions[i * 3 + 2] = -6 + (i / trailCount) * 8; // z方向排开
      speeds[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);

    const pos = points.geometry.attributes.position;
    const arr = pos.array as Float32Array;

    // 车流速度随音乐加速
    const speedMult = (3 + audio.bass * 8 + audio.rms * 4) * intensity;

    for (let i = 0; i < trailCount; i++) {
      arr[i * 3] -= data.speeds[i]! * delta * speedMult;
      if (arr[i * 3] < -15) {
        arr[i * 3] = 15 + Math.random() * 5;
      }
    }
    pos.needsUpdate = true;

    const mat = points.material as THREE.PointsMaterial;
    // 车头灯（白）和尾灯（红）随音乐交错变化
    const hue = 0 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    mat.color.setHSL(hue, 0.8 + audio.rms * 0.2, 0.7);
    mat.size = 0.1 + audio.rms * 0.1;
    mat.opacity = 0.6 + audio.bass * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ================= 主场景 =================
export function NeonMetropolisScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.city;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 1, 10], fov: 58 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.028);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        <AuroraSky featuresRef={featuresRef} theme={theme} />
        <ambientLight intensity={0.08} color="#a78bfa" />
        <pointLight position={[0, 5, 0]} intensity={1.5} color="#e879f9" distance={30} />

        <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={400} />
        <MusicalSkyline featuresRef={featuresRef} intensity={intensity} />
        <MusicalWindowLights featuresRef={featuresRef} intensity={intensity} />
        <MusicalNeonSigns featuresRef={featuresRef} intensity={intensity} />
        <TrafficTrails featuresRef={featuresRef} intensity={intensity} />
        <MusicalWetStreet featuresRef={featuresRef} intensity={intensity} />

        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
    </Canvas>
  );
}
