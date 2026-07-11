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
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";
import { GLSL_CLASSIC_NOISE_3D } from "~/lib/glsl/noise-chunks";

// 锁色：深紫震金（禁彩虹）
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

// ================= 远景体积噪波流体（软纹理基底，占大面积） =================
// 用 fbm(cnoise3d) 作程序化流体雾，是"70%软纹理"的主要承担者。
// 只受 rms 驱动、极慢时间流（time * ~0.08），与中景粒子/近景冲击波完全解耦。
const volumeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
}
`;

const volumeFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_3D}

uniform float uTime;
uniform float uEnergy;
uniform vec3 uColorLow;
uniform vec3 uColorMid;
uniform vec3 uColorHigh;

varying vec2 vUv;

// 三段 fbm 体积雾
float fbm(vec3 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * cnoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv - 0.5;
  // 极慢流场，与其他层完全解耦
  float t = uTime * 0.08;
  vec3 p = vec3(uv * 2.4, t);
  float n = fbm(p);
  float n2 = fbm(p * 1.7 + vec3(3.1, -1.2, t * 0.6));
  // 混合两层 fbm 造出"体积翻卷"感
  float dense = smoothstep(-0.6, 0.9, n * 0.6 + n2 * 0.4);
  // 径向 falloff：把能量往中偏下集中，边缘融入暗背景（不做全屏铺满）
  float radial = smoothstep(0.95, 0.15, length(uv * vec2(1.0, 1.35)));
  float mask = dense * radial;

  // 三段渐变：暗紫 → 品红 → 琥珀高光（能量高时高光带才浮现）
  vec3 col = mix(uColorLow, uColorMid, mask);
  col = mix(col, uColorHigh, pow(mask, 3.0) * (0.15 + uEnergy * 0.6));

  // 整体偏暗：作为背景层不能抢注意力
  float alpha = mask * (0.55 + uEnergy * 0.35);
  gl_FragColor = vec4(col, alpha);
}
`;

function VolumetricHazeField({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const smoothEnergy = useRef(new SmoothValue(0.04));
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uColorLow: { value: DEEP_VIOLET.clone().multiplyScalar(0.55) },
      uColorMid: { value: MAGENTA.clone() },
      uColorHigh: { value: AMBER.clone() },
    }),
    [],
  );

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const f = featuresRef.current;
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uEnergy!.value = smoothEnergy.current.update(f.rms, delta);
  });

  // 放在天幕(-35)和相机之间的中远景，占大面积但不遮挡近景冲击波
  return (
    <mesh position={[0, 0, -18]} rotation={[0, 0, 0]}>
      <planeGeometry args={[68, 40]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={volumeVertex}
        fragmentShader={volumeFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// ================= 中景：节奏粒子隧道（唯一硬几何族，rhythm layer） =================
function RhythmWarpTunnel({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const count = 1400;

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const bands = new Uint8Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // 每粒子基础半径 + 随机大小方差（避免复制感）
      const r = 2 + Math.random() * 20;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 36;

      speeds[i] = 0.3 + Math.random() * 0.7;
      bands[i] = Math.floor(Math.random() * 3);
      // 每粒子独立时间相位（同族但不锁步）
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, speeds, bands, phases };
  }, []);

  const positionsRef = useRef(data.positions);
  const colorRef = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const { mid, rms, bass, treble } = featuresRef.current;

    // 隧道推进跟 mid（人声/旋律）走，静默时依然缓慢漂流
    const baseSpeed = (1.1 + mid * 6.5 + rms * 1.2) * intensity * delta;
    const arr = positionsRef.current;

    for (let i = 0; i < count; i++) {
      // 不同粒子带响应不同速度
      const bandMult = data.bands[i] === 0
        ? 1 + bass * 1.4
        : data.bands[i] === 1
          ? 1 + mid * 0.8
          : 1 + treble * 1.8;

      const z = arr[i * 3 + 2]! + baseSpeed * data.speeds[i]! * bandMult;
      if (z > 18) {
        arr[i * 3 + 2] = -18;
        const angle = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 20;
        arr[i * 3] = Math.cos(angle) * r;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 22;
      } else {
        arr[i * 3 + 2] = z;
      }
    }
    points.geometry.attributes.position!.needsUpdate = true;

    // 旋转：mid 驱动柔和推进
    points.rotation.y += delta * (0.15 + mid * 1.3);
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.18;

    const mat = points.material as THREE.PointsMaterial;
    mat.size = (0.06 + rms * 0.22 + audio.impact * 0.12) * intensity;

    // 锁色脉冲：MAGENTA → AMBER（不做彩虹）
    const warm = Math.min(1, treble * 0.7 + audio.impact * 0.6);
    colorRef.current.copy(MAGENTA).lerp(AMBER, warm);
    // 中层再拉一点亮度随 rms
    mat.color.copy(colorRef.current).multiplyScalar(0.85 + rms * 0.35);
    mat.opacity = 0.7 + rms * 0.25;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
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

// ================= 近景：drop 瞬时冲击波（beat-only accent，平时隐藏） =================
// 只在 isBeatDrop 时才 spawn，寿命短(~0.25s)，池化复用，不做持续层。
function BassShockwaves({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const maxWaves = 4;
  const waves = useRef<{ life: number; speed: number; tilt: number }[]>([]);
  const spawnCooldown = useRef(0);

  const pool = useMemo(() => {
    const geo = new THREE.TorusGeometry(1, 0.025, 8, 96);
    return Array.from({ length: maxWaves }, () => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: AMBER.clone(),
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
    spawnCooldown.current -= delta;

    // 仅节拍冲击时 spawn，冷却避免连爆
    if (audio.isBeatDrop && spawnCooldown.current <= 0 && waves.current.length < maxWaves) {
      waves.current.push({
        life: 1,
        speed: 4 + audio.impact * 2, // life 消耗速度快 → ~0.2s 消失
        tilt: (Math.random() - 0.5) * 0.6,
      });
      spawnCooldown.current = 0.12;
    }

    // 更新剩余寿命
    waves.current = waves.current.filter((w) => {
      w.life -= delta * w.speed;
      return w.life > 0;
    });

    for (let i = 0; i < maxWaves; i++) {
      const mesh = pool[i]!;
      const w = waves.current[i];
      if (w) {
        mesh.visible = true;
        // 快速外扩
        const size = (1 - w.life) * 14 * intensity;
        mesh.scale.set(size, size, size * 0.15); // 压扁成"冲击环"而非球壳
        mesh.rotation.x = Math.PI / 2 + w.tilt;
        mesh.rotation.z = w.tilt * 1.5;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        // 快速衰减：外扩时越来越透明
        mat.opacity = Math.pow(w.life, 0.6) * 0.75;
        // 颜色：品红→琥珀金锁色
        mat.color.copy(MAGENTA).lerp(AMBER, 1 - w.life);
      } else {
        mesh.visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
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
        {/* 远景 A：天幕渐变噪波（time*0.08 by shader，rms 驱动） */}
        <AuroraSky featuresRef={featuresRef} theme={PULSE_SKY} />
        {/* 远景 B：体积雾 fbm 流体（软纹理主承担者，占 70% 画面） */}
        <VolumetricHazeField featuresRef={featuresRef} />

        <ambientLight intensity={0.18} color="#3a1a5a" />
        <pointLight position={[3, 2, 4]} intensity={2.6} color="#f5a623" distance={30} />
        <pointLight position={[-4, -1, 2]} intensity={1.8} color="#7c1f6e" distance={28} />

        {/* 软点缀（非硬几何） */}
        <SceneSparkles featuresRef={featuresRef} color="#e9c46a" count={300} />
        <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={285} />

        {/* 中景：唯一硬几何族 = 粒子隧道（mid 驱动节奏） */}
        <RhythmWarpTunnel featuresRef={featuresRef} intensity={intensity} />

        {/* 近景：drop 瞬时爆发（beat-only，平时隐藏） */}
        <BassShockwaves featuresRef={featuresRef} intensity={intensity} />

        <EffectComposer multisampling={2}>
          <DepthOfField
            focusDistance={0.012}
            focalLength={0.045}
            bokehScale={3.5}
          />
          <Bloom
            intensity={1.6 + intensity * 1.2}
            luminanceThreshold={0.35}
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
