import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";
import { GLSL_CLASSIC_NOISE_2D } from "~/lib/glsl/noise-chunks";

// ============ 锁色霓虹夜色调色板 ============
// 深靛蓝夜空底 + 品红/青双主霓虹 + 暖金窗灯高光
const NIGHT_INDIGO = new THREE.Color("#0a0a1f");
const NEON_MAGENTA = new THREE.Color("#ff2f8e");
const NEON_CYAN = new THREE.Color("#22d3ee");
const WINDOW_AMBER = new THREE.Color("#f5b06a");
const WET_MAGENTA = new THREE.Color("#3a0d2c");

// 都市天幕：靛蓝底 → 深紫中 → 品红上光
const CITY_SKY = {
  color1: "#050614",
  color2: "#1a0a35",
  color3: "#c81f6e",
  fog: "#08081a",
  sparkle: "#f5b06a",
} as const;

// ============ 远景 shader 剪影天际线 ============
// 用 fbm 噪波程序化生成远处城市剪影 + 雾,替代几十个box阵列,
// 承载"70%程序化软纹理"氛围底,不抢焦点
const skylineVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
}
`;

const skylineFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform float uTreble;
uniform vec3 uIndigo;
uniform vec3 uMagenta;
uniform vec3 uCyan;
uniform vec3 uAmber;

varying vec2 vUv;

// fbm 分层噪波:多个尺度叠加,像城市的天际线切片
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  // 极慢横向漂移(rms 决定,4拍以上级别)
  float drift = uTime * 0.015 + uRms * 0.05;

  // 天际线高度:x 方向 fbm 生成起伏,y 用平滑阶跃切出剪影
  // scale 变化让不同区段密度不同 -> 破均匀阵列
  float h1 = fbm(vec2(uv.x * 4.5 + drift, 0.7)) * 0.5 + 0.5;
  float h2 = fbm(vec2(uv.x * 9.0 - drift * 0.4, 2.3)) * 0.5 + 0.5;
  // 组合:大山剪影 + 中细节
  float skyline = h1 * 0.65 + h2 * 0.35;
  // 中心略压低,给歌手负空间;边缘允许更高
  float centerCarve = smoothstep(0.35, 0.5, abs(uv.x - 0.5));
  skyline = mix(skyline * 0.55, skyline * 0.92, centerCarve);

  // 剪影阈值:v < skyline*0.42 ~ 楼体, 上面 ~ 天空
  float horizon = 0.14 + skyline * 0.36;
  // 软边(不锐利,让远景像雾中剪影)
  float building = 1.0 - smoothstep(horizon - 0.035, horizon + 0.045, uv.y);

  // 楼体颜色:深靛蓝为主,底部偏品红(街面反光),顶部偏冷
  vec3 buildingCol = mix(uIndigo * 0.55, uIndigo * 1.05, uv.y * 2.0);
  // 稀疏窗灯:极稀,大尺度噪波做遮罩(而不是网格),暖金
  float windowMask = fbm(vec2(uv.x * 60.0, uv.y * 90.0 - uTime * 0.02));
  windowMask = smoothstep(0.28, 0.42, windowMask) * building;
  // 边缘衰减(左右两端窗灯变稀)
  float edgeFall = 1.0 - smoothstep(0.15, 0.5, abs(uv.x - 0.5));
  windowMask *= edgeFall * 0.55;
  // mid 呼吸(人声)
  windowMask *= 0.55 + uMid * 0.55;
  buildingCol += uAmber * windowMask * 1.6;

  // 天空颜色:深靛蓝底 + 上方极缓品红气辉(雾+云), rms 极慢呼吸
  float skyGlow = fbm(vec2(uv.x * 1.8 + drift * 0.3, uv.y * 2.5 - drift * 0.2));
  vec3 skyCol = mix(uIndigo * 0.35, uMagenta * 0.28, smoothstep(0.1, 0.8, uv.y));
  skyCol = mix(skyCol, uCyan * 0.18, smoothstep(0.55, 0.98, uv.y) * (0.35 + skyGlow * 0.4));
  skyCol *= 0.85 + uRms * 0.25;

  // 混合:剪影权重
  vec3 col = mix(skyCol, buildingCol, building);

  // 极轻雾/大气:上方更亮下方压暗
  col *= mix(0.7, 1.05, uv.y);

  // 底部雾气(靠近地平线偏暖,像光污染)
  float horizonHaze = smoothstep(horizon + 0.08, horizon - 0.05, uv.y);
  col += uMagenta * horizonHaze * 0.08 * (0.5 + uRms * 0.5);

  // 高频微光(treble 时远处窗户略闪)
  float twinkle = fbm(vec2(uv.x * 220.0, uv.y * 220.0 + uTime * 0.4));
  twinkle = smoothstep(0.55, 0.62, twinkle) * building * edgeFall;
  col += uAmber * twinkle * uTreble * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
`;

function FarSilhouette({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRms: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uIndigo: { value: NIGHT_INDIGO.clone() },
      uMagenta: { value: NEON_MAGENTA.clone() },
      uCyan: { value: NEON_CYAN.clone() },
      uAmber: { value: WINDOW_AMBER.clone() },
    }),
    [],
  );

  const audio = useAudioResponse(featuresRef);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    audio.update(delta);
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uRms!.value = audio.rms;
    mat.uniforms.uMid!.value = audio.mid;
    mat.uniforms.uTreble!.value = audio.treble;
  });

  return (
    <mesh position={[0, 1.2, -22]} rotation={[0, 0, 0]}>
      <planeGeometry args={[95, 32]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={skylineVertex}
        fragmentShader={skylineFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ============ 近景锚点楼(唯一硬几何族) ============
// 只有 ~8 栋楼作为构图锚点,分居画面左右两簇,中心全空给歌手,
// 楼体不自发光,材质金属/低粗糙,吸霓虹光反射
type AnchorSpec = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  phase: number;
  side: -1 | 1; // 左簇 / 右簇
};

function buildAnchors(): AnchorSpec[] {
  // 明确手工放置:左3右3+两栋更远的边界楼,断绝阵列感;高度/宽度差异大;不等距
  return [
    { x: -6.4, y: -2.2, z: -6.2, width: 1.6, height: 5.8, depth: 1.4, phase: 0.7, side: -1 },
    { x: -8.6, y: -2.2, z: -7.0, width: 1.2, height: 4.2, depth: 1.2, phase: 1.9, side: -1 },
    { x: -4.9, y: -2.2, z: -5.4, width: 1.0, height: 3.2, depth: 1.1, phase: 2.7, side: -1 },
    { x: -11.2, y: -2.2, z: -8.1, width: 1.4, height: 7.1, depth: 1.5, phase: 3.4, side: -1 },
    { x: 5.7, y: -2.2, z: -6.0, width: 1.5, height: 5.2, depth: 1.35, phase: 4.1, side: 1 },
    { x: 8.3, y: -2.2, z: -6.9, width: 1.25, height: 4.6, depth: 1.25, phase: 5.0, side: 1 },
    { x: 4.4, y: -2.2, z: -5.2, width: 0.95, height: 2.9, depth: 1.05, phase: 5.8, side: 1 },
    { x: 10.8, y: -2.2, z: -8.4, width: 1.35, height: 6.5, depth: 1.45, phase: 6.4, side: 1 },
  ];
}

function AnchorBuildings({
  featuresRef,
  intensity,
  anchors,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  anchors: AnchorSpec[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;

    for (let i = 0; i < anchors.length; i++) {
      const b = anchors[i]!;
      // 每栋楼独立时间相位,不同步(防复制感)
      const sway = 1 + audio.bass * 0.008 * intensity;
      const h = b.height * sway;
      dummy.position.set(b.x, b.y + h / 2, b.z);
      dummy.scale.set(b.width, h, b.depth);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // 楼体颜色:深靛蓝底 + 极微 rim(不是自发光,只是靠近光源反射感)
      const rim = 0.04 + audio.rms * 0.06 + Math.sin(t * 0.32 + b.phase) * 0.012;
      tmpColor.copy(NIGHT_INDIGO).lerp(b.side < 0 ? NEON_MAGENTA : NEON_CYAN, rim);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, anchors.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#0a0a1f"
        roughness={0.42}
        metalness={0.78}
      />
    </instancedMesh>
  );
}

// ============ 近景楼窗灯(accent 稀疏点,径向衰减遮罩) ============
// 不是 cols×rows 网格!每栋楼上按泊松式伪随机放少量发光点,
// 且概率沿高度/宽度带 radial 衰减(靠边缘更暗更稀),破规则复制
function AnchorWindows({
  featuresRef,
  intensity,
  anchors,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  anchors: AnchorSpec[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const windows = useMemo(() => {
    const list: {
      x: number;
      y: number;
      z: number;
      phase: number;
      band: 0 | 1 | 2;
      size: number;
      baseIntensity: number;
    }[] = [];
    // 每栋楼独立 seed
    for (const b of anchors) {
      let seed = Math.floor(b.phase * 9973) ^ 0x1a2b;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0xffff;
      };
      // 目标点数 = 楼面面积 * 密度, 但用泊松式抽样
      const area = b.width * b.height;
      const targetCount = Math.max(6, Math.floor(area * 3.2));
      const halfW = b.width * 0.5;
      const faceZ = b.z + b.depth * 0.5 + 0.005;
      const yStart = b.y + 0.35;
      const yEnd = b.y + b.height - 0.4;
      const usableH = yEnd - yStart;

      let attempts = 0;
      let placed = 0;
      while (placed < targetCount && attempts < targetCount * 6) {
        attempts++;
        const rx = rnd(); // 0..1 沿宽
        const ry = rnd(); // 0..1 沿高
        // 径向衰减遮罩:靠中心保留概率高,靠上下/左右边界降低
        const dx = Math.abs(rx - 0.5) * 2; // 0..1
        const dy = Math.abs(ry - 0.55) * 2; // 顶部略衰减更快
        const fall = 1 - Math.min(1, Math.sqrt(dx * dx * 0.75 + dy * dy * 0.55));
        // 只有 rnd < fall^1.3 才通过 -> 中心稠密边缘稀疏
        if (rnd() > Math.pow(Math.max(0, fall), 1.3)) continue;
        const wx = b.x + (rx - 0.5) * (b.width - 0.28);
        const wy = yStart + ry * usableH;
        list.push({
          x: wx,
          y: wy,
          z: faceZ,
          phase: b.phase + placed * 0.37 + rx * 2.1 + ry * 1.7,
          band: (placed % 3) as 0 | 1 | 2,
          size: 0.11 + rnd() * 0.06,
          baseIntensity: 0.6 + rnd() * 0.55,
        });
        placed++;
      }
    }
    return list;
  }, [anchors]);

  const total = windows.length;

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    audio.update(delta);
    const midVocal = audio.mid;
    const rms = audio.rms;
    const bass = audio.bass;
    const treble = audio.treble;

    for (let i = 0; i < total; i++) {
      const w = windows[i]!;
      // 人声(mid)驱动主呼吸
      const vocalRhythm = 0.5 + Math.sin(w.phase + midVocal * 3.2) * 0.32;
      // 频段错拍
      const bandDrive = w.band === 0 ? bass : w.band === 1 ? midVocal : treble;
      const brightness =
        (0.22 + vocalRhythm * 0.32 + bandDrive * 0.55 + rms * 0.22 + audio.impact * 0.28) *
        w.baseIntensity *
        intensity;

      // 窗灯基本暖金,极少数(band==2)在高频时略偏品红
      if (w.band === 2 && treble > 0.2) {
        tmpColor.copy(NEON_MAGENTA).lerp(WINDOW_AMBER, 0.5);
      } else {
        tmpColor.copy(WINDOW_AMBER);
      }
      tmpColor.multiplyScalar(brightness);

      dummy.position.set(w.x, w.y, w.z);
      dummy.scale.set(w.size, w.size, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, total)]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#f5b06a"
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ============ 霓虹招牌(accent 层:少量,treble 闪) ============
function NeonBillboards({
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
      [
        { x: -7.6, y: 1.4, z: -5.6, w: 2.0, h: 0.5, color: NEON_MAGENTA, band: 0 },
        { x: -4.2, y: 3.1, z: -5.9, w: 1.4, h: 0.35, color: NEON_CYAN, band: 2 },
        { x: 6.8, y: 1.1, z: -5.5, w: 1.9, h: 0.48, color: NEON_MAGENTA, band: 1 },
        { x: 9.4, y: 3.0, z: -6.4, w: 1.5, h: 0.38, color: NEON_CYAN, band: 2 },
      ] as const,
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const s = signs[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      const drive = s.band === 0 ? audio.bass : s.band === 1 ? audio.mid : audio.treble;
      const flicker =
        s.band === 2
          ? 0.5 + Math.sin(t * 5.5 + i) * 0.15 + audio.treble * 0.35
          : 0.58 + Math.sin(t * 1.4 + i) * 0.1;
      const brightness = (flicker + drive * 0.7 + audio.impact * 0.55) * intensity;
      mat.opacity = Math.min(1, 0.32 + brightness * 0.6);
      mat.color.copy(s.color).multiplyScalar(0.85 + brightness * 0.8);
    });
  });

  return (
    <group ref={groupRef}>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <planeGeometry args={[s.w, s.h]} />
          <meshBasicMaterial
            color={`#${s.color.getHexString()}`}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============ 车流光轨(accent 线,bass 加速) ============
function TrafficStreaks({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothSpeed = useRef(new SmoothValue(0.15));

  const lanes = useMemo(() => {
    const arr: {
      x: number;
      y: number;
      z: number;
      w: number;
      dir: 1 | -1;
      color: THREE.Color;
      baseSpeed: number;
    }[] = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return (seed & 0xffff) / 0xffff;
    };
    // 单条近道品红(尾灯)+ 单条远道青(头灯),数量减半破均匀
    for (let i = 0; i < 10; i++) {
      arr.push({
        x: (rnd() - 0.5) * 20,
        y: -1.86,
        z: -4.6,
        w: 0.9 + rnd() * 0.7,
        dir: -1,
        color: NEON_MAGENTA,
        baseSpeed: 3.5 + rnd() * 2,
      });
    }
    for (let i = 0; i < 10; i++) {
      arr.push({
        x: (rnd() - 0.5) * 20,
        y: -1.9,
        z: -5.6,
        w: 0.75 + rnd() * 0.6,
        dir: 1,
        color: NEON_CYAN,
        baseSpeed: 3.0 + rnd() * 1.8,
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);

    const speedMult = smoothSpeed.current.update(
      1 + audio.bass * 3.2 + audio.impact * 2,
      delta,
    );

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const lane = lanes[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      mesh.position.x += lane.dir * lane.baseSpeed * speedMult * delta * intensity;
      if (lane.dir < 0 && mesh.position.x < -12) mesh.position.x = 12 + Math.random() * 2;
      if (lane.dir > 0 && mesh.position.x > 12) mesh.position.x = -12 - Math.random() * 2;

      mat.opacity = Math.min(0.9, 0.5 + audio.bass * 0.32 + audio.rms * 0.14) * intensity;
    });
  });

  return (
    <group ref={groupRef}>
      {lanes.map((lane, i) => (
        <mesh key={i} position={[lane.x, lane.y, lane.z]}>
          <planeGeometry args={[lane.w, 0.045]} />
          <meshBasicMaterial
            color={`#${lane.color.getHexString()}`}
            transparent
            opacity={0.72}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============ 湿街反光地面(锚定下沿) ============
function WetStreet({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothGlow = useRef(new SmoothValue(0.12));
  const emissiveTarget = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    audio.update(delta);

    const warm = audio.bass * 0.6 + audio.impact * 0.4;
    const cool = audio.treble * 0.35;
    emissiveTarget.copy(WET_MAGENTA).lerp(NEON_MAGENTA, warm * 0.6);
    emissiveTarget.lerp(NEON_CYAN, cool * 0.25);
    mat.emissive.lerp(emissiveTarget, 0.15);

    mat.emissiveIntensity = smoothGlow.current.update(
      (0.22 + audio.bass * 0.6 + audio.impact * 0.5 + audio.rms * 0.25) * intensity,
      delta,
    );
    mat.roughness = 0.06 + audio.mid * 0.08;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.15, -4]}>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial
        ref={matRef}
        color="#040412"
        metalness={0.98}
        roughness={0.08}
        emissive={"#3a0d2c"}
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}

// ============ 主场景 ============
export function NeonMetropolisScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const anchors = useMemo(() => buildAnchors(), []);

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0.4, 9.5], fov: 60 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(CITY_SKY.fog, 0.042);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        {/* 远景 1: 极缓天幕(rms 呼吸) */}
        <AuroraSky featuresRef={featuresRef} theme={CITY_SKY} />
        {/* 远景 2: 程序化剪影天际线(fbm,替代 box 阵列) */}
        <FarSilhouette featuresRef={featuresRef} />

        {/* 舞台光:冷月光 + 侧向品红/青 rim */}
        <ambientLight intensity={0.14} color="#1a1a3a" />
        <directionalLight position={[-6, 8, 4]} intensity={0.35} color="#22d3ee" />
        <pointLight position={[8, 3, 2]} intensity={1.4} color="#ff2f8e" distance={26} />
        <pointLight position={[-8, 2, 2]} intensity={1.0} color="#22d3ee" distance={26} />

        {/* 近景锚点楼(唯一硬几何族) */}
        <AnchorBuildings
          featuresRef={featuresRef}
          intensity={intensity}
          anchors={anchors}
        />
        {/* 稀疏窗灯(accent 点,径向衰减非网格) */}
        <AnchorWindows
          featuresRef={featuresRef}
          intensity={intensity}
          anchors={anchors}
        />
        {/* 招牌 & 车流 & 湿街(accent 层,不算硬几何) */}
        <NeonBillboards featuresRef={featuresRef} intensity={intensity} />
        <TrafficStreaks featuresRef={featuresRef} intensity={intensity} />
        <WetStreet featuresRef={featuresRef} intensity={intensity} />

        {/* 电影级后期 */}
        <EffectComposer multisampling={2}>
          <Bloom
            intensity={1.5 + intensity * 1.1}
            luminanceThreshold={0.34}
            luminanceSmoothing={0.88}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0005, 0.0005]}
            radialModulation
            modulationOffset={0.45}
          />
          <HueSaturation hue={-0.02} saturation={0.14} />
          <BrightnessContrast brightness={-0.04} contrast={0.16} />
          <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.26} darkness={0.78} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
