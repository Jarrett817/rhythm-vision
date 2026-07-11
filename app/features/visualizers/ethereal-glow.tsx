import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import {
  Bloom,
  BrightnessContrast,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { GradientBackdrop } from "~/features/visualizers/shared/gradient-backdrop";
import {
  useAudioResponse,
  SmoothValue,
} from "~/features/visualizers/shared/audio-response";

// ================= 锁定配色（紫蓝极光） =================
// 深靛蓝紫底 + 极光青绿 + 冷紫 + 冷白高光。禁止彩虹转色，只在锁色之间插值。
const INDIGO_DEEP = new THREE.Color("#0a0725");
const AURORA_TEAL = new THREE.Color("#3ee3c2");
const AURORA_VIOLET = new THREE.Color("#8a6bff");
const COOL_WHITE = new THREE.Color("#dff5ff");

// 天幕分层色（配合 GradientBackdrop）
const SKY_TOP = "#050318";
const SKY_HORIZON = "#1a1550";
const SKY_BOTTOM = "#0a0725";

// ================= 极光幕布（Hero 层） =================
// 用大平面 + ShaderMaterial 做半透明大块面极光带，取代过去的细 torus 环。
// 跟随 mid（人声）缓慢起伏，treble 驱动上缘蒸发亮度。
const auroraVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPos;

  uniform float uTime;
  uniform float uMid;
  uniform float uTreble;
  uniform float uRms;
  uniform float uIntensity;
  uniform vec3 uColorA; // teal
  uniform vec3 uColorB; // violet
  uniform vec3 uColorHi; // cool white
  uniform float uSeed;

  // 简单 2D value noise（无外部纹理，适合极光带的柔和纵向波动）
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // 纵向柔和衰减（顶部微亮的蒸发，底部彻底透明消失）
    float verticalFade = smoothstep(0.02, 0.35, vUv.y) * smoothstep(1.02, 0.55, vUv.y);

    // 水平波动：极慢的横向漂移，跟 mid（人声）呼吸
    float slowT = uTime * 0.06 + uSeed * 6.283;
    float breath = uMid * 0.35 + uRms * 0.15;
    float wave = fbm(vec2(vUv.x * 2.3 + slowT, vUv.y * 1.4 + slowT * 0.4 + uSeed));
    wave = mix(wave, wave * (1.0 + breath * 1.6), 0.65);

    // 垂直方向的丝带感（噪声轮廓 + 边缘羽化）
    float ribbon = smoothstep(0.35, 0.75, wave);
    // 上边缘更亮的高光带（treble 驱动的蒸发感）
    float topGlow = smoothstep(0.55, 0.98, vUv.y) * (0.35 + uTreble * 0.9);

    // 颜色：teal → violet 之间的锁色渐变，不做彩虹
    float mixK = 0.35 + wave * 0.5 + uMid * 0.2;
    vec3 col = mix(uColorA, uColorB, clamp(mixK, 0.0, 1.0));
    // 顶部亮边掺一点冷白高光
    col = mix(col, uColorHi, topGlow * 0.55);

    // 强度：主要靠 ribbon + verticalFade，rms 提亮
    float alpha = ribbon * verticalFade * (0.55 + uRms * 0.4) * uIntensity;
    alpha += topGlow * verticalFade * 0.35 * uIntensity;

    // 边缘水平衰减，避免硬边
    float edgeH = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    alpha *= edgeH;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(col * (1.2 + uTreble * 0.6), alpha);
  }
`;

function AuroraCurtain({
  featuresRef,
  intensity,
  seed,
  position,
  rotation,
  scale,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  seed: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uRms: { value: 0 },
      uIntensity: { value: intensity },
      uColorA: { value: AURORA_TEAL.clone() },
      uColorB: { value: AURORA_VIOLET.clone() },
      uColorHi: { value: COOL_WHITE.clone() },
      uSeed: { value: seed },
    }),
    // seed 是常量，intensity 会通过 useFrame 更新
    [seed],
  );

  const smoothMid = useRef(new SmoothValue(0.05));
  const smoothTreble = useRef(new SmoothValue(0.08));
  const smoothRms = useRef(new SmoothValue(0.03));

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    audio.update(delta);

    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uMid.value = smoothMid.current.update(audio.mid, delta);
    uniforms.uTreble.value = smoothTreble.current.update(audio.treble, delta);
    uniforms.uRms.value = smoothRms.current.update(audio.rms, delta);
    uniforms.uIntensity.value = intensity;

    // 幕布极慢横向漂移，只跟 rms 微幅摆动
    const t = state.clock.elapsedTime;
    mesh.position.x = position[0] + Math.sin(t * 0.05 + seed * 3.1) * 0.35;
    mesh.rotation.z =
      rotation[2] + Math.sin(t * 0.04 + seed * 2.4) * 0.03 + audio.mid * 0.02;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[6, 12, 1, 1]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// ================= 沉静光核 =================
// 磨砂半透明球 + 内层薄壳的柔光。缓慢呼吸，绝不快速形变。
function CalmCoreOrb({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);

  const smoothScale = useRef(new SmoothValue(0.04));
  const emissiveTarget = useMemo(() => new THREE.Color(), []);

  // 多层柔光壳：由内到外递减透明度，形成"体积辉光渐变"，无硬表面
  const shellCount = 5;
  const baseOpacities = useMemo(
    () => [0.32, 0.2, 0.12, 0.07, 0.04],
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 极慢呼吸
    const target = (1 + audio.rms * 0.14 + audio.impact * 0.2) * intensity;
    group.scale.setScalar(smoothScale.current.update(target, delta));
    group.rotation.y = t * 0.04;

    // 锁色：紫 → 青（mid 驱动偏移）
    const warm = Math.min(1, audio.mid * 0.9 + audio.impact * 0.4);
    emissiveTarget.copy(AURORA_VIOLET).lerp(AURORA_TEAL, warm);

    const energy = 0.6 + audio.rms * 0.6 + audio.impact * 0.5;
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.lerp(emissiveTarget, 0.05);
      // 内层随能量微微抬亮，外层保持柔和，整体像一团呼吸的光
      mat.opacity = baseOpacities[i]! * energy;
    });
  });

  return (
    <group ref={groupRef}>
      {baseOpacities.map((op, i) => (
        <mesh key={i} scale={0.8 + i * 0.55}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={AURORA_VIOLET}
            transparent
            opacity={op}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ================= 星尘（treble 驱动闪烁） =================
function DriftingStardust({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);

  useFrame((_, delta) => {
    audio.update(delta);
    const g = ref.current;
    if (!g) return;
    // 极慢自转，rms 微幅加速
    g.rotation.y += delta * (0.02 + audio.rms * 0.05);
    g.rotation.x += delta * 0.01;
  });

  return (
    <group ref={ref}>
      <Sparkles
        count={220}
        scale={[22, 14, 22]}
        size={4}
        speed={0.25}
        opacity={0.55 * intensity}
        color={COOL_WHITE}
        noise={0.6}
      />
      <Sparkles
        count={120}
        scale={[14, 10, 14]}
        size={2.5}
        speed={0.35}
        opacity={0.45 * intensity}
        color={AURORA_TEAL}
        noise={0.7}
      />
    </group>
  );
}

// ================= 节拍爆发环（对象池复用） =================
function BeatShockPool({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const MAX = 6;

  type Shock = { life: number; maxLife: number; tilt: THREE.Euler };
  const shocks = useRef<Shock[]>([]);

  // 池化的 mesh：共享 torus geometry；每个 mesh 独立 material（因为 opacity/color 不同）
  const pool = useMemo(() => {
    const geo = new THREE.TorusGeometry(1, 0.06, 12, 96);
    return Array.from({ length: MAX }, () => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: AURORA_TEAL,
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
    for (const m of pool) group.add(m);
    return () => {
      for (const m of pool) {
        group.remove(m);
        (m.material as THREE.Material).dispose();
      }
      pool[0]?.geometry.dispose();
    };
  }, [pool]);

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    audio.update(delta);

    // 只在真节拍触发，慢歌下会稀疏
    if (audio.isBeatDrop && shocks.current.length < MAX) {
      shocks.current.push({
        life: 1,
        maxLife: 1,
        tilt: new THREE.Euler(
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.4,
        ),
      });
    }

    // 更新
    shocks.current = shocks.current.filter((s) => {
      s.life -= delta * 0.6; // 慢歌节奏：让爆发环慢慢褪
      return s.life > 0;
    });

    for (let i = 0; i < MAX; i++) {
      const mesh = pool[i]!;
      const s = shocks.current[i];
      if (s) {
        mesh.visible = true;
        const grow = (1 - s.life) * 8 * intensity + 0.4;
        mesh.scale.set(grow, grow, grow * 0.6);
        mesh.rotation.copy(s.tilt);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = s.life * s.life * 0.35;
        // 从 teal 起随扩散逐渐偏 violet（锁色）
        tmpColor.copy(AURORA_TEAL).lerp(AURORA_VIOLET, 1 - s.life);
        mat.color.copy(tmpColor);
      } else {
        mesh.visible = false;
      }
    }
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
    <ThreeVisualizerShell>
      <Canvas
        className="size-full"
        camera={{ position: [0, 0.4, 9.5], fov: 55 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          // 指数雾：让远处极光幕布融进天幕，绝不虚空
          scene.fog = new THREE.FogExp2("#0a0725", 0.038);
          onCanvasReady?.(gl.domElement);
        }}
      >
        <SceneSpringEntry>
          <Suspense fallback={null}>
            <SceneEnvironment variant="night" intensity={0.45} />
            <GradientBackdrop
              top={SKY_TOP}
              horizon={SKY_HORIZON}
              bottom={SKY_BOTTOM}
            />

            {/* 三层灯光：紫底冷光 + 前上青绿点光 + 后侧紫光轮廓 */}
            <ambientLight intensity={0.22} color="#3a2a70" />
            <pointLight
              position={[0, 3, 4]}
              intensity={2.2}
              color="#4de5c2"
              distance={22}
            />
            <pointLight
              position={[-4, -1, -3]}
              intensity={1.4}
              color="#8a6bff"
              distance={26}
            />

            {/* 极光幕布：4 条大块面丝带，环绕光核，不同深度/角度错开 */}
            <AuroraCurtain
              featuresRef={featuresRef}
              intensity={intensity}
              seed={0.11}
              position={[-3.4, 0.6, -1.5]}
              rotation={[0, 0.25, -0.05]}
              scale={[1.15, 1.05, 1]}
            />
            <AuroraCurtain
              featuresRef={featuresRef}
              intensity={intensity}
              seed={0.53}
              position={[3.2, 0.4, -2.2]}
              rotation={[0, -0.28, 0.04]}
              scale={[1.2, 1.15, 1]}
            />
            <AuroraCurtain
              featuresRef={featuresRef}
              intensity={intensity}
              seed={0.82}
              position={[-1.2, 1.2, -4.5]}
              rotation={[0, 0.05, -0.02]}
              scale={[1.35, 1.25, 1]}
            />
            <AuroraCurtain
              featuresRef={featuresRef}
              intensity={intensity}
              seed={0.37}
              position={[1.8, 0.8, -3.6]}
              rotation={[0, -0.08, 0.03]}
              scale={[1.28, 1.2, 1]}
            />

            {/* 星尘 */}
            <DriftingStardust
              featuresRef={featuresRef}
              intensity={intensity}
            />

            {/* Hero 光核（居中偏下，给舞台留呼吸） */}
            <group position={[0, -0.2, 0]}>
              <CalmCoreOrb
                featuresRef={featuresRef}
                intensity={intensity}
              />
            </group>

            {/* 节拍爆发环 */}
            <BeatShockPool featuresRef={featuresRef} intensity={intensity} />

            {/* 电影级后期 */}
            <EffectComposer multisampling={2}>
              <DepthOfField
                focusDistance={0.014}
                focalLength={0.05}
                bokehScale={2.2}
              />
              <Bloom
                intensity={1.3 + intensity * 0.9}
                luminanceThreshold={0.22}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              {/* 冷调 + 略降饱和的电影感 */}
              <HueSaturation hue={0.03} saturation={0.08} />
              <BrightnessContrast brightness={-0.03} contrast={0.14} />
              <Noise
                opacity={0.03}
                blendFunction={BlendFunction.OVERLAY}
              />
              <Vignette eskil={false} offset={0.3} darkness={0.7} />
            </EffectComposer>
          </Suspense>
        </SceneSpringEntry>
      </Canvas>
    </ThreeVisualizerShell>
  );
}
