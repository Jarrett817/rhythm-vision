import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { Points } from "three";
import { AdditiveBlending } from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import {
  useAudioResponse,
  waterAudioPresets,
  particleAudioPresets,
  SmoothValue,
} from "~/features/visualizers/shared/audio-response";

const RAIN_COUNT = 6000;

// ================= 音乐雨丝 =================
function MusicalRain({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const pointsRef = useRef<Points>(null);
  const audio = useAudioResponse(featuresRef);

  const speeds = useMemo(
    () => Float32Array.from({ length: RAIN_COUNT }, () => 0.4 + Math.random() * 0.6),
    [],
  );
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);
  const sizes = useMemo(() => new Float32Array(RAIN_COUNT), []);
  const color = useRef(new THREE.Color());

  const smoothGlow = useRef(new SmoothValue(0.15));

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    audio.update(delta);
    const preset = particleAudioPresets.rain;

    // 颜色随音乐变化：bass增强蓝色调，mid增加色彩倾向
    const hue = 210 + audio.mid * 20 * intensity;
    const saturation = 60 + audio.bass * 30;
    const lightness = 70 + audio.treble * 15;
    color.current.setHSL(hue / 360, saturation / 100, lightness / 100);

    const mat = points.material as THREE.PointsMaterial;
    mat.color.lerp(color.current, 0.03);

    // 雨滴密度和大小随音乐变化
    const baseSpeed = audio.speed(8, intensity) * intensity;
    const bassImpact = audio.impact; // Bass 冲击时的爆发

    const pos = points.geometry.attributes.position;
    const arr = pos.array as Float32Array;

    let activeCount = 0;
    for (let i = 0; i < RAIN_COUNT; i++) {
      // Bass 强时，雨滴下落加速
      const speedMult = 1 + audio.bass * preset.speedBass + audio.treble * preset.speedTreble;
      arr[i * 3 + 1] -= speeds[i]! * baseSpeed * speedMult * delta;

      // 随 mid 产生横向飘动
      arr[i * 3] += Math.sin(arr[i * 3 + 1]! * 0.1 + state.clock.elapsedTime) *
        audio.mid * delta * 8 * intensity;

      // 落到地面时，Bass冲击的瞬间会让雨滴弹起一点点
      if (arr[i * 3 + 1] < -1.5) {
        if (bassImpact > 0.3) {
          arr[i * 3 + 1] = -1 + bassImpact * 2; // 弹起效果
        } else {
          arr[i * 3 + 1] = 25 + Math.random() * 10;
        }
        arr[i * 3] = (Math.random() - 0.5) * 60;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }

      if (arr[i * 3 + 1] < 25) activeCount++;
    }

    // 高频时雨滴更亮、更大
    mat.size = (0.08 + audio.treble * 0.15 * preset.sizeTreble) * intensity;

    // 整体能量影响透明度
    mat.opacity = smoothGlow.current.update(audio.opacity(0.5, 0.4), delta);
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
        color="#8cb4ff"
      />
    </points>
  );
}

// ================= 音乐水波纹 =================
function MusicalWaterRipples({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const ripples = useRef<
    { x: number; z: number; r: number; life: number; strength: number }[]
  >([]);

  // 用一个 ref 存 mesh，避免每一帧查 children
  const meshPool = useRef<THREE.Mesh[]>([]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);

    // ====== 核心：Bass 冲击时产生新波纹 ======
    if (audio.isBeatDrop && ripples.current.length < 25) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 18;
      ripples.current.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        r: 0.1,
        life: 1,
        strength: audio.impact,
      });
    }

    // 高能量时也随机产生小波纹
    if (audio.rms > 0.4 && Math.random() > 0.92 && ripples.current.length < 20) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 15;
      ripples.current.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        r: 0.05,
        life: 0.8,
        strength: audio.rms * 0.5,
      });
    }

    // 更新波纹
    const speedMult = 1 + audio.bass * waterAudioPresets.rippleSpeedFromBass * intensity;
    ripples.current = ripples.current.filter((rp) => {
      rp.r += delta * 4 * speedMult;
      rp.life -= delta * 0.8;
      return rp.life > 0 && rp.r < 10;
    });

    // 维护 mesh 池
    while (meshPool.current.length > ripples.current.length) {
      const m = meshPool.current.pop()!;
      group.remove(m);
    }
    while (meshPool.current.length < ripples.current.length) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1.05, 48),
        new THREE.MeshBasicMaterial({
          color: "#7ea8ff",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      meshPool.current.push(ring);
    }

    ripples.current.forEach((rp, i) => {
      const mesh = meshPool.current[i]!;
      mesh.position.set(rp.x, -0.98, rp.z);
      mesh.scale.setScalar(rp.r);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      // 强度越大的波纹越亮
      mat.opacity = rp.life * 0.35 * rp.strength * (0.6 + audio.rms * 0.4);
      // mid 强时波纹偏紫
      mat.color.setHSL((0.62 + audio.mid * 0.08), 0.7, 0.7);
    });
  });

  return <group ref={groupRef} />;
}

// ================= 音乐反光水面 =================
function MusicalReflectivePool({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const audio = useAudioResponse(featuresRef);
  const colorBase = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;

    audio.update(delta);

    // Bass 驱动金属感和反光强度
    mat.metalness = 0.9 + audio.bass * 0.1;
    mat.roughness = Math.max(0.05, 0.1 - audio.treble * 0.05);
    mat.emissiveIntensity = 0.4 + audio.bass * 1.2 + audio.rms * 0.3;

    // Mid 驱动水面颜色变化
    const hue = 220 + audio.mid * 40;
    const saturation = 50 + audio.bass * 20;
    const lightness = 8 + audio.treble * 8;
    colorBase.current.setHSL(hue / 360, saturation / 100, lightness / 100);
    mat.color.lerp(colorBase.current, 0.03);

    // 发光颜色带呼吸感
    const glowHue = 230 + Math.sin(state.clock.elapsedTime * 0.3) * 10 + audio.mid * 20;
    mat.emissive.setHSL(glowHue / 360, 0.75, 0.18);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial
        ref={matRef}
        metalness={0.95}
        roughness={0.08}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// ================= 主场景 =================
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
      <Suspense fallback={null}>
        <AuroraSky featuresRef={featuresRef} theme={theme} />
        <ambientLight intensity={0.2} color="#8090ff" />
        <pointLight position={[0, 10, 0]} intensity={2.5} color="#c4b5fd" distance={35} />
        <pointLight position={[-10, 3, -8]} intensity={1.5} color="#60a5fa" distance={30} />

        {/* 音乐驱动的视觉元素 */}
        <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={600} />
        <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={220} />
        <MusicalRain featuresRef={featuresRef} intensity={intensity} />
        <MusicalReflectivePool featuresRef={featuresRef} />
        <MusicalWaterRipples featuresRef={featuresRef} intensity={intensity} />

        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
    </Canvas>
  );
}
