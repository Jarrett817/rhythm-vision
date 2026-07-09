import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";

// 深紫震金：锁定 2-3 色，不做彩虹转色
const DEEP_VIOLET = new THREE.Color("#2a0a4a");
const AMBER = new THREE.Color("#f5a623");
const MAGENTA = new THREE.Color("#7c1f6e");

// 天幕主题：深紫底、品红中调、琥珀金高光
const PULSE_SKY = {
  color1: "#0c0518",
  color2: "#3b0a52",
  color3: "#b26b1f",
  fog: "#0a0512",
  sparkle: "#e9c46a",
} as const;

// ================= 节奏脉冲环 =================
function RhythmPulseRings({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const count = 16;

  const smoothScales = useRef(
    Array.from({ length: count }, () => new SmoothValue(0.15)),
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 扩散节奏跟人声语调（mid）走，整体更沉稳
    const baseSpeed = (0.55 + audio.mid * 3 + audio.rms * 0.8) * intensity;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      // 分层频段响应
      const ringBand = Math.floor(i / 4) % 3; // 0-3=bass, 4-7=mid, 8-11=treble, 12-15=rms
      let drive = 0;
      if (ringBand === 0) drive = audio.bass;
      else if (ringBand === 1) drive = audio.mid;
      else if (ringBand === 2) drive = audio.treble;
      else drive = audio.rms;

      // 相位和半径
      const phase = t * baseSpeed + i * 0.4;
      const baseRadius = 1.2 + i * 0.6;
      const pulseAmount = (0.5 + Math.sin(phase) * 0.4) + drive * 1.2;
      const targetRadius = baseRadius * (1 + pulseAmount * intensity);

      // 平滑缩放
      mesh.scale.setScalar(smoothScales.current[i]!.update(targetRadius, delta));
      mesh.rotation.z = phase * 0.3;

      // 颜色：深紫底，随频段能量向琥珀金偏移（锁色不彩虹）
      const warm = Math.min(1, drive * 0.8 + audio.impact * 0.6);
      const hue = 0.78 - warm * 0.68; // 0.78≈紫 → 0.1≈金
      const lightness = 0.42 + drive * 0.28;
      mat.color.setHSL(hue, 0.85, lightness);

      // 透明度：bass 冲击时爆发
      const flicker = 0.1 + Math.sin(phase * 2) * 0.1;
      mat.opacity = (0.15 + flicker + audio.impact * 0.6) * intensity;
    });

    // 整体倾斜
    group.rotation.z = t * 0.25 * baseSpeed;
    group.rotation.x = Math.sin(t * 0.3) * 0.2 + audio.mid * 0.3;
  });

  const rings = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const thickness = 0.015 + (i % 4) * 0.005;
        return (
          <mesh key={i}>
            <torusGeometry args={[1, thickness, 10, 96 + i * 8]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.35}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      }),
    [],
  );

  return <group ref={groupRef}>{rings}</group>;
}

// ================= 节奏隧道 =================
function RhythmWarpTunnel({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const count = 2000;

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const bands = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 20;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.9;

      speeds[i] = 0.3 + Math.random() * 0.7;
      bands[i] = Math.floor(Math.random() * 3);
    }
    return { positions, colors, speeds, bands };
  }, []);

  const positionsRef = useRef(data.positions);
  const colorRef = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const { mid, rms, bass, treble } = featuresRef.current;

    // 隧道推进跟人声语调（mid）走，降低整体速度
    const baseSpeed = (1.2 + mid * 7 + rms * 1.5) * intensity * delta;
    const arr = positionsRef.current;

    for (let i = 0; i < count; i++) {
      // 不同粒子带响应不同速度
      const bandMult = data.bands[i] === 0
        ? 1 + bass * 1.5
        : data.bands[i] === 1
          ? 1 + mid * 0.8
          : 1 + treble * 2;

      const z = arr[i * 3 + 2]! + baseSpeed * data.speeds[i]! * bandMult;
      if (z > 18) {
        arr[i * 3 + 2] = -18;
        // 重生时重新随机位置
        const angle = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 20;
        arr[i * 3] = Math.cos(angle) * r;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 22;
      } else {
        arr[i * 3 + 2] = z;
      }
    }
    points.geometry.attributes.position!.needsUpdate = true;

    // 旋转随人声语调（mid）柔和推进
    points.rotation.y += delta * (0.15 + mid * 1.4);
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;

    const mat = points.material as THREE.PointsMaterial;
    // 大小随 rms 爆发
    mat.size = (0.05 + rms * 0.2 + audio.impact * 0.1) * intensity;

    // 颜色脉冲：紫→金，锁色
    const warm = Math.min(1, treble * 0.7 + audio.impact * 0.6);
    const hue = 0.78 - warm * 0.68;
    colorRef.current.setHSL(hue, 0.8, 0.55 + rms * 0.2);
    mat.color.copy(colorRef.current);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#67e8f9"
        size={0.08}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ================= Bass 冲击波 =================
function BassShockwaves({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const maxWaves = 10;
  const waves = useRef<{ life: number; dir: THREE.Vector3; speed: number }[]>([]);

  const pool = useMemo(() => {
    const geo = new THREE.TorusGeometry(1, 0.02, 8, 64);
    return Array.from({ length: maxWaves }, () => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: "#00ffff",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      return mesh;
    });
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    for (const mesh of pool) group.add(mesh);
    return () => {
      for (const mesh of pool) {
        group.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      }
      pool[0]?.geometry.dispose();
    };
  }, [pool]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    audio.update(delta);

    // Bass 冲击时产生新的冲击波
    if (audio.isBeatDrop && waves.current.length < maxWaves) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      waves.current.push({
        life: 1,
        dir: new THREE.Vector3(
          Math.cos(angle1) * Math.sin(angle2),
          Math.cos(angle2),
          Math.sin(angle1) * Math.sin(angle2),
        ),
        speed: 2 + audio.impact * 3,
      });
    }

    // 更新波
    waves.current = waves.current.filter((w) => {
      w.life -= delta * w.speed * 0.15;
      return w.life > 0;
    });

    for (let i = 0; i < maxWaves; i++) {
      const mesh = pool[i]!;
      const w = waves.current[i];
      if (w) {
        mesh.visible = true;
        const size = (1 - w.life) * 12 * intensity;
        mesh.scale.set(size, size, size);
        mesh.lookAt(w.dir);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = w.life * 0.5;
        mat.color.setHSL(0.78 - (1 - w.life) * 0.6, 0.85, 0.6);
      } else {
        mesh.visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
}

// ================= 中心能量核心（旋转水晶多面体） =================
function EnergyCore({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const facetRef = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothScale = useRef(new SmoothValue(0.1));
  const smoothEmissive = useRef(new SmoothValue(0.1));
  const emissiveTarget = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const group = groupRef.current;
    const crystal = crystalRef.current;
    const facet = facetRef.current;
    if (!group || !crystal || !facet) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 缓慢匀速呼吸，不随 bass 收缩式跳动（避免"心脏感"）
    const targetScale = (1 + audio.rms * 0.22 + audio.impact * 0.28) * intensity;
    group.scale.setScalar(smoothScale.current.update(targetScale, delta));

    // 稳定的水晶旋转：慢、匀速，只轻微受 mid 影响
    group.rotation.y = t * 0.18 + audio.mid * 0.15;
    group.rotation.x = t * 0.08;
    // 内层棱角与外层反向转，制造折射闪烁
    facet.rotation.y = -t * 0.26;
    facet.rotation.z = t * 0.12;

    // 深紫 → 琥珀金（锁色）
    const warm = Math.min(1, audio.treble * 0.6 + audio.impact * 0.7);
    emissiveTarget.current.copy(MAGENTA).lerp(AMBER, warm);
    const mat = crystal.material as THREE.MeshPhysicalMaterial;
    mat.emissive.lerp(emissiveTarget.current, 0.06);
    mat.emissiveIntensity = smoothEmissive.current.update(
      0.3 + audio.rms * 1.4 + audio.impact * 1.6,
      delta,
    );

    const facetMat = facet.material as THREE.MeshBasicMaterial;
    facetMat.opacity = 0.12 + audio.treble * 0.3;
  });

  return (
    <group ref={groupRef}>
      {/* 水晶主体：玻璃质 + 环境反射的多面体宝石 */}
      <mesh ref={crystalRef}>
        <icosahedronGeometry args={[1.15, 0]} />
        <meshPhysicalMaterial
          color={DEEP_VIOLET}
          emissive={MAGENTA}
          emissiveIntensity={0.4}
          roughness={0.08}
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.12}
          reflectivity={1}
          transmission={0.35}
          ior={1.7}
          thickness={1.4}
          flatShading
        />
      </mesh>
      {/* 内层棱角骨架：折射闪烁 */}
      <mesh ref={facetRef}>
        <octahedronGeometry args={[0.78, 0]} />
        <meshBasicMaterial
          color={AMBER}
          wireframe
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ================= 主场景 =================
export function PulseRushScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  return (
    <ThreeVisualizerShell>
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 9], fov: 65 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(PULSE_SKY.fog, 0.025);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <SceneSpringEntry>
      <Suspense fallback={null}>
        <SceneEnvironment variant="studio" intensity={0.5} />
        <AuroraSky featuresRef={featuresRef} theme={PULSE_SKY} />
        <ambientLight intensity={0.18} color="#3a1a5a" />
        <pointLight position={[3, 2, 4]} intensity={2.6} color="#f5a623" distance={30} />
        <pointLight position={[-4, -1, 2]} intensity={1.8} color="#7c1f6e" distance={28} />

        <SceneSparkles featuresRef={featuresRef} color="#e9c46a" count={400} />
        <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={285} />
        <RhythmWarpTunnel featuresRef={featuresRef} intensity={intensity} />
        <RhythmPulseRings featuresRef={featuresRef} intensity={intensity} />
        <BassShockwaves featuresRef={featuresRef} intensity={intensity} />
        <EnergyCore featuresRef={featuresRef} intensity={intensity} />

        <EffectComposer multisampling={2}>
          <DepthOfField
            focusDistance={0.012}
            focalLength={0.045}
            bokehScale={3.5}
          />
          <Bloom
            intensity={1.6 + intensity * 1.2}
            luminanceThreshold={0.28}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0006, 0.0006]}
            radialModulation
            modulationOffset={0.4}
          />
          {/* 电影调色：偏暖、略压对比 → 深紫震金 */}
          <HueSaturation hue={-0.05} saturation={0.12} />
          <BrightnessContrast brightness={-0.02} contrast={0.12} />
          <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.28} darkness={0.72} />
        </EffectComposer>
      </Suspense>
      </SceneSpringEntry>
    </Canvas>
    </ThreeVisualizerShell>
  );
}
