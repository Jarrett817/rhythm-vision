import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import {
  useAudioResponse,
  SmoothValue,
} from "~/features/visualizers/shared/audio-response";

// ================= 音乐极光环 =================
function MusicalAuroraRings({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const ringCount = 8;

  // 每个环的相位偏移
  const phases = useMemo(
    () => Array.from({ length: ringCount }, (_, i) => i * Math.PI / ringCount),
    [],
  );

  const smoothSizes = useRef(
    Array.from({ length: ringCount }, () => new SmoothValue(0.1)),
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 整体旋转随 bass 加速
    group.rotation.x = Math.sin(t * 0.15) * 0.3 + audio.bass * 0.2;
    group.rotation.z = t * 0.06 + audio.mid * 0.3;

    // 每个环有独立的音乐响应
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      // 不同的环响应不同的频段：内层 bass，外层 treble
      const ringWeight = i / ringCount;
      const freqAmount = ringWeight < 0.4
        ? audio.bass * (1 - ringWeight * 2) // 内层 bass 驱动
        : ringWeight > 0.7
          ? audio.treble * (ringWeight - 0.7) * 3 // 外层 treble 驱动
          : audio.mid; // 中间 mid 驱动

      // 环的大小脉冲
      const baseSize = 3.5 + i * 1.2;
      const pulse = Math.sin(t * 1.5 + phases[i]!) * 0.15;
      const musicPulse = freqAmount * 0.8 * intensity;
      const finalSize = smoothSizes.current[i]!.update(
        baseSize * (1 + pulse + musicPulse),
        delta,
      );
      mesh.scale.setScalar(finalSize);

      // 颜色随 mid 变化，每个环有偏移
      const hue = 260 + i * 15 + audio.mid * 30;
      const lightness = 60 + audio.treble * 20;
      mat.color.setHSL(hue / 360, 0.75, lightness / 100);

      // 透明度：bass 冲击时最亮，平时有呼吸感
      const breath = 0.5 + Math.sin(t * 0.8 + i * 0.5) * 0.2;
      mat.opacity = (0.08 + audio.rms * breath) * intensity;

      // 环的旋转速度分层
      mesh.rotation.z = t * (0.2 + i * 0.05) * (1 + audio.bass * 0.5);
    });
  });

  const rings = useMemo(() => {
    return Array.from({ length: ringCount }, (_, i) => (
      <mesh key={i} rotation={[Math.PI / 2, 0, i * 0.3]}>
        <torusGeometry args={[3.5 + i * 1.2, 0.03, 8, 128]} />
        <meshBasicMaterial
          color={`hsl(${260 + i * 15}, 70%, 60%)`}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    ));
  }, []);

  return <group ref={groupRef}>{rings}</group>;
}

// ================= 音乐核心光球 =================
function MusicalCoreOrb({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const colorTarget = useRef(new THREE.Color());

  const smoothScale = useRef(new SmoothValue(0.1));
  const smoothGlow = useRef(new SmoothValue(0.1));

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // ====== 核心形态变化 ======
    // Bass 驱动大的缩放脉冲
    const bassPulse = audio.bass * 0.4 * intensity;
    // RMS 驱动持续呼吸
    const breath = 1 + audio.rms * 0.2 * intensity;
    // 高频产生颤动
    const trebleVibrate = 1 + audio.treble * 0.1;

    const targetScale = (1 + bassPulse) * breath * trebleVibrate;
    mesh.scale.setScalar(smoothScale.current.update(targetScale, delta));

    // ====== 颜色变化 ======
    // Mid 频段驱动色相偏移
    const baseHue = 265;
    const hueShift = audio.mid * 60 * intensity;
    const saturation = 75 + audio.bass * 15;
    const lightness = 50 + audio.treble * 10;

    colorTarget.current.setHSL(
      (baseHue + hueShift) / 360,
      saturation / 100,
      lightness / 100,
    );

    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.lerp(colorTarget.current, 0.05);

    // 发光强度随音乐爆发
    const glowTarget = 0.7 + audio.rms * 2.5 * intensity + audio.impact * 3;
    mat.emissiveIntensity = smoothGlow.current.update(glowTarget, delta);

    // 旋转
    mesh.rotation.y = t * 0.2 + audio.mid * 0.5;
    mesh.rotation.x = Math.sin(t * 0.1) * 0.3 + audio.treble * 0.2;
  });

  return (
    <Sphere ref={ref} args={[1.2, 64, 64]}>
      <MeshDistortMaterial
        color="#a78bfa"
        emissive="#818cf8"
        emissiveIntensity={1}
        roughness={0.15}
        metalness={0.5}
        distort={0.4}
        speed={2.5}
        transparent
        opacity={0.95}
      />
    </Sphere>
  );
}

// ================= 音乐星雾 =================
function MusicalStarMist({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const starCount = 2500;

  const positions = useMemo(() => {
    const arr = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 6 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 整体旋转：低频驱动外层，高频驱动内层
    points.rotation.y = t * 0.04 + audio.bass * 0.1;
    points.rotation.x = Math.sin(t * 0.08) * 0.15 + audio.mid * 0.2;

    const mat = points.material as THREE.PointsMaterial;

    // 大小：mid 驱动整体，treble 驱动闪烁
    mat.size = 0.07 + audio.mid * 0.06 + Math.sin(t * 3) * 0.01 * audio.treble;

    // 颜色呼吸
    const hue = 270 + Math.sin(t * 0.2) * 15 + audio.mid * 25;
    mat.color.setHSL(hue / 360, 0.7, 0.75);

    // 透明度脉冲
    mat.opacity = 0.5 + audio.rms * 0.3 + Math.sin(t * 0.5) * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e9d5ff"
        size={0.08}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ================= 粒子爆发层（Beat Drop 时） =================
function ImpactBursts({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const bursts = useRef<
    { pos: THREE.Vector3; life: number; size: number; color: THREE.Color }[]
  >([]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);

    // Bass 冲击时产生爆发粒子
    if (audio.isBeatDrop && bursts.current.length < 8) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      bursts.current.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * 3,
          Math.sin(angle) * dist,
        ),
        life: 1,
        size: audio.impact * 2,
        color: new THREE.Color().setHSL(0.7 + Math.random() * 0.1, 0.8, 0.6),
      });
    }

    // 更新爆发
    bursts.current = bursts.current.filter((b) => {
      b.life -= delta * 1.5;
      b.size += delta * 3 * intensity;
      return b.life > 0;
    });

    // 同步 mesh
    while (group.children.length > bursts.current.length) {
      group.remove(group.children[group.children.length - 1]!);
    }
    while (group.children.length < bursts.current.length) {
      const burst = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(burst);
    }

    bursts.current.forEach((b, i) => {
      const mesh = group.children[i] as THREE.Mesh;
      mesh.position.copy(b.pos);
      mesh.scale.setScalar(b.size);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = b.life * 0.4;
      mat.color.copy(b.color);
    });
  });

  return <group ref={groupRef} />;
}

// ================= 主场景 =================
export function EtherealGlowScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 10], fov: 55 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.Fog("#08061a", 12, 40);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#05040f"]} />
        <ambientLight intensity={0.1} color="#a78bfa" />
        <pointLight position={[0, 0, 4]} intensity={2.5} color="#ddd6fe" distance={30} />

        <MusicalStarMist featuresRef={featuresRef} />
        <MusicalAuroraRings featuresRef={featuresRef} intensity={intensity} />
        <MusicalCoreOrb featuresRef={featuresRef} intensity={intensity} />
        <ImpactBursts featuresRef={featuresRef} intensity={intensity} />

        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
    </Canvas>
  );
}
