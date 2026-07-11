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

// ============ 中景剪影天际线(拉开纵深,软剪影,不是硬 box) ============
// 一层更近、更暗、更集中在两侧的剪影,让远景到近景之间有过渡
const midSkylineFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform vec3 uIndigo;
uniform vec3 uMagenta;
uniform vec3 uCyan;

varying vec2 vUv;

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float drift = uTime * 0.025 + uRms * 0.06;
  // 中频剪影:更陡峭高低起伏,像近郊楼群
  float h = fbm(vec2(uv.x * 6.5 + drift, 5.0));
  float h2 = fbm(vec2(uv.x * 14.0 - drift * 0.7, 12.0)) * 0.4;
  float skyline = 0.5 + h * 0.55 + h2;
  // 中心大幅压低给歌手
  float centerGap = 1.0 - smoothstep(0.0, 0.28, abs(uv.x - 0.5));
  skyline -= centerGap * 0.55;

  float horizon = 0.08 + skyline * 0.34;
  float building = 1.0 - smoothstep(horizon - 0.02, horizon + 0.035, uv.y);
  // 中景整体压暗
  building *= 0.75;

  // 稀疏窗灯:比远景大一点点,依然是噪波遮罩
  float wmask = fbm(vec2(uv.x * 90.0, uv.y * 130.0 - uTime * 0.03));
  wmask = smoothstep(0.32, 0.44, wmask) * building;
  float edgeFall = smoothstep(0.05, 0.42, abs(uv.x - 0.5));
  wmask *= edgeFall * (0.4 + uMid * 0.6);

  // 楼体颜色偏冷:靛蓝为主,底部染品红/青做rim反光
  vec3 buildingCol = uIndigo * 0.35;
  buildingCol = mix(buildingCol, uIndigo * 0.7, uv.y * 1.6);
  // 左偏品红 右偏青
  float sideTint = smoothstep(0.35, 0.65, uv.x);
  buildingCol += mix(uMagenta, uCyan, sideTint) * 0.055;
  // 窗灯
  buildingCol += vec3(1.0, 0.75, 0.42) * wmask * 1.5;

  float alpha = building;
  gl_FragColor = vec4(buildingCol, alpha);
}
`;

function MidSilhouette({
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
      uIndigo: { value: NIGHT_INDIGO.clone() },
      uMagenta: { value: NEON_MAGENTA.clone() },
      uCyan: { value: NEON_CYAN.clone() },
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
  });

  return (
    <mesh position={[0, 0.4, -14]}>
      <planeGeometry args={[60, 20]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={skylineVertex}
        fragmentShader={midSkylineFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ============ 雨夜氛围(斜向雨丝 shader,软层) ============
// 全屏 additive plane,fbm+条纹函数生成斜下雨丝,treble/rms 驱动强度
const rainFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uRms;
uniform float uTreble;
uniform vec3 uCyan;
uniform vec3 uMagenta;

varying vec2 vUv;

// 分层雨丝:每层不同速度/密度/角度轻微差异,营造深度
float rainLayer(vec2 uv, float scale, float speed, float slant, float density) {
  // 斜切坐标 -> 生成对角线条纹
  vec2 p = uv * scale;
  p.x += p.y * slant;
  p.y -= uTime * speed;
  // 高频窄条纹 fract 差 -> 亮短线
  float streak = fract(p.y * 0.5 + cnoise(vec2(floor(p.x) * 1.7, 0.0)) * 6.0);
  // 每条列一个 offset,不整齐
  float col = fract(p.x + cnoise(vec2(floor(p.x), 0.0)) * 3.0);
  // 只有极窄一段亮
  float line = smoothstep(0.0, 0.02, streak) * (1.0 - smoothstep(0.02, 0.35, streak));
  // 列稀疏遮罩
  float colMask = smoothstep(1.0 - density, 1.0, col);
  return line * colMask;
}

void main() {
  vec2 uv = vUv;
  float slant = -0.35;
  // 三层深度雨
  float r1 = rainLayer(uv, vec2(80.0, 40.0).x * 0.9, 1.4, slant, 0.055) * 0.9;
  float r2 = rainLayer(uv * 1.35 + vec2(0.13, 0.0), 120.0, 2.1, slant - 0.05, 0.04) * 0.7;
  float r3 = rainLayer(uv * 1.8 + vec2(0.31, 0.0), 180.0, 2.9, slant - 0.02, 0.028) * 0.5;
  float rain = r1 + r2 + r3;

  // 雨雾(极缓大尺度噪波,rms 呼吸)
  float mist = cnoise(vec2(uv.x * 1.3 + uTime * 0.02, uv.y * 1.7 - uTime * 0.012));
  mist = smoothstep(-0.2, 0.6, mist) * 0.18;

  // 中心压弱一点,给歌手负空间
  float centerFall = smoothstep(0.0, 0.35, abs(uv.x - 0.5));
  rain *= 0.35 + centerFall * 0.65;

  // 雨强度:rms 底 + treble 驱动前景高频
  float intensity = 0.32 + uRms * 0.55 + uTreble * 0.7;
  rain *= intensity;

  // 雨着色:偏冷青蓝,顶部略染品红反射
  vec3 rainTint = mix(uCyan * 0.55, uMagenta * 0.4, smoothstep(0.4, 1.0, uv.y));
  vec3 col = rainTint * rain + mix(vec3(0.02, 0.04, 0.08), uMagenta * 0.08, uv.y) * mist;

  float alpha = clamp(rain * 1.2 + mist * 0.6, 0.0, 0.85);
  gl_FragColor = vec4(col, alpha);
}
`;

function RainVeil({
  featuresRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRms: { value: 0 },
      uTreble: { value: 0 },
      uCyan: { value: NEON_CYAN.clone() },
      uMagenta: { value: NEON_MAGENTA.clone() },
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
    mat.uniforms.uTreble!.value = audio.treble;
  });

  return (
    <mesh position={[0, 0.5, -2.5]} renderOrder={5}>
      <planeGeometry args={[42, 24]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={skylineVertex}
        fragmentShader={rainFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

// ============ 体积光束/大气雾(中景与近景之间纵深) ============
// 顶部斜下的光锥 + 大气雾团,mid 缓呼吸,bass 微推
const beamFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform float uBass;
uniform vec3 uMagenta;
uniform vec3 uCyan;

varying vec2 vUv;

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.2;
    a *= 0.5;
  }
  return v;
}

// 一条从上向下、略斜的软光锥
float beam(vec2 uv, float cx, float cwTop, float cwBot, float slant) {
  // 沿 y 从 0(下)到 1(上) 变宽
  float y = uv.y;
  float halfW = mix(cwBot, cwTop, y);
  float centerX = cx + slant * (y - 0.5);
  float d = abs(uv.x - centerX);
  // 软边
  float core = 1.0 - smoothstep(0.0, halfW, d);
  // 上强下弱
  core *= smoothstep(-0.05, 0.95, y);
  return core;
}

void main() {
  vec2 uv = vUv;
  // 两束不对称光锥
  float b1 = beam(uv, 0.28, 0.02, 0.16, -0.06);
  float b2 = beam(uv, 0.72, 0.02, 0.14, 0.05);
  // 加进噪波,让光锥呈现空气尘埃感
  float dust = fbm(vec2(uv.x * 3.5 - uTime * 0.05, uv.y * 4.5 + uTime * 0.08));
  dust = smoothstep(-0.2, 0.9, dust);
  float beams = (b1 + b2) * (0.55 + dust * 0.75);
  // 底部大气雾团
  float haze = fbm(vec2(uv.x * 1.6 + uTime * 0.03, uv.y * 2.0 - uTime * 0.02));
  haze = smoothstep(0.1, 0.9, haze) * smoothstep(0.6, 0.0, uv.y) * 0.35;

  // 音频呼吸:mid 主体,bass 底噪
  float pulse = 0.35 + uMid * 0.7 + uBass * 0.25 + uRms * 0.2;
  beams *= pulse;

  // 光锥着色:左偏品红右偏青
  vec3 beamCol = mix(uMagenta * 0.9, uCyan * 0.85, smoothstep(0.35, 0.65, uv.x));
  vec3 hazeCol = mix(uMagenta * 0.28, uCyan * 0.22, smoothstep(0.4, 0.6, uv.x));

  vec3 col = beamCol * beams * 0.55 + hazeCol * haze;
  float alpha = clamp(beams * 0.42 + haze * 0.5, 0.0, 0.75);
  gl_FragColor = vec4(col, alpha);
}
`;

function LightBeams({
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
      uBass: { value: 0 },
      uMagenta: { value: NEON_MAGENTA.clone() },
      uCyan: { value: NEON_CYAN.clone() },
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
    mat.uniforms.uBass!.value = audio.bass;
  });

  return (
    <mesh position={[0, 0.5, -10]} renderOrder={2}>
      <planeGeometry args={[50, 18]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={skylineVertex}
        fragmentShader={beamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

// ============ 近景锚点楼(唯一硬几何族) ============
// ~14 栋楼作为构图锚点,分居画面左右两簇,中心留空给歌手,
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
  // 手工放置:左7右7,中心 |x|<3.8 留空;高度/宽度/深度差异大;不等距
  return [
    // 左簇 —— 前中后三层错开
    { x: -3.9, y: -2.2, z: -4.8, width: 0.9, height: 2.6, depth: 0.95, phase: 0.3, side: -1 },
    { x: -5.4, y: -2.2, z: -5.6, width: 1.15, height: 4.7, depth: 1.25, phase: 0.9, side: -1 },
    { x: -6.6, y: -2.2, z: -6.4, width: 1.55, height: 6.1, depth: 1.4, phase: 1.6, side: -1 },
    { x: -8.5, y: -2.2, z: -7.2, width: 1.2, height: 4.3, depth: 1.2, phase: 2.3, side: -1 },
    { x: -9.9, y: -2.2, z: -7.9, width: 1.35, height: 5.4, depth: 1.35, phase: 3.0, side: -1 },
    { x: -11.6, y: -2.2, z: -8.6, width: 1.5, height: 7.2, depth: 1.5, phase: 3.7, side: -1 },
    { x: -13.4, y: -2.2, z: -9.2, width: 1.1, height: 3.6, depth: 1.15, phase: 4.4, side: -1 },
    // 右簇
    { x: 3.7, y: -2.2, z: -4.6, width: 0.95, height: 2.4, depth: 1.0, phase: 5.1, side: 1 },
    { x: 5.2, y: -2.2, z: -5.5, width: 1.25, height: 5.1, depth: 1.25, phase: 5.8, side: 1 },
    { x: 6.9, y: -2.2, z: -6.3, width: 1.5, height: 6.6, depth: 1.45, phase: 6.4, side: 1 },
    { x: 8.6, y: -2.2, z: -7.0, width: 1.15, height: 4.4, depth: 1.2, phase: 7.1, side: 1 },
    { x: 10.4, y: -2.2, z: -7.7, width: 1.4, height: 5.9, depth: 1.35, phase: 7.8, side: 1 },
    { x: 12.3, y: -2.2, z: -8.5, width: 1.3, height: 7.4, depth: 1.4, phase: 8.5, side: 1 },
    { x: 14.2, y: -2.2, z: -9.3, width: 1.05, height: 3.4, depth: 1.1, phase: 9.2, side: 1 },
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
      // 点亮生活感律动:每盏窗有独立的"亮/暗"倾向,mid 会拉起熄灭的窗户
      lifePhase: number;
      lifeSpeed: number;
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
      const targetCount = Math.max(8, Math.floor(area * 4.0));
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
          lifePhase: rnd() * Math.PI * 2,
          lifeSpeed: 0.15 + rnd() * 0.5, // 极慢
        });
        placed++;
      }
    }
    return list;
  }, [anchors]);

  const total = windows.length;

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    audio.update(delta);
    const midVocal = audio.mid;
    const rms = audio.rms;
    const bass = audio.bass;
    const treble = audio.treble;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < total; i++) {
      const w = windows[i]!;
      // 生活感律动:每盏窗独立慢正弦决定"当前是不是点亮状态"
      // mid(人声)会把接近熄灭的窗户重新拉亮
      const life = 0.5 + Math.sin(t * w.lifeSpeed + w.lifePhase) * 0.5;
      const lit = Math.min(1, Math.max(0.15, life + midVocal * 0.55));
      // 人声(mid)驱动主呼吸
      const vocalRhythm = 0.5 + Math.sin(w.phase + midVocal * 3.2) * 0.32;
      // 频段错拍
      const bandDrive = w.band === 0 ? bass : w.band === 1 ? midVocal : treble;
      const brightness =
        (0.22 + vocalRhythm * 0.32 + bandDrive * 0.55 + rms * 0.22 + audio.impact * 0.28) *
        w.baseIntensity *
        lit *
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

// ============ 霓虹招牌(accent 层:数量适度增加,shader 扫描线) ============
// 招牌本身是软面片,shader 内做水平扫描亮带,treble 驱动
const signVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const signFragment = /* glsl */ `
uniform float uTime;
uniform float uBrightness;
uniform float uScan;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // 基底亮:中心比边缘亮(圆角发光带)
  float edgeFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  edgeFade *= smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.75, uv.y);
  float core = pow(edgeFade, 0.55);

  // 扫描线:水平细带,uTime*uScan 循环
  float scanY = fract(uv.x - uTime * uScan);
  float scanLine = exp(-pow((scanY - 0.5) * 6.0, 2.0)) * 0.6;
  // treble/scan 时叠加
  float shine = core + scanLine * uBrightness * 0.5;

  vec3 col = uColor * (0.7 + uBrightness * 0.9) * shine;
  float alpha = clamp(shine * (0.4 + uBrightness * 0.5), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

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
        { x: -7.6, y: 1.4, z: -5.6, w: 2.0, h: 0.5, color: NEON_MAGENTA, band: 0, scan: 0.55 },
        { x: -4.2, y: 3.1, z: -5.9, w: 1.4, h: 0.35, color: NEON_CYAN, band: 2, scan: 0.9 },
        { x: -9.9, y: 2.4, z: -7.4, w: 1.1, h: 0.3, color: NEON_MAGENTA, band: 2, scan: 1.3 },
        { x: 6.8, y: 1.1, z: -5.5, w: 1.9, h: 0.48, color: NEON_MAGENTA, band: 1, scan: 0.4 },
        { x: 9.4, y: 3.0, z: -6.4, w: 1.5, h: 0.38, color: NEON_CYAN, band: 2, scan: 0.75 },
        { x: 11.6, y: 1.8, z: -7.6, w: 1.2, h: 0.32, color: NEON_CYAN, band: 1, scan: 0.5 },
        { x: -5.6, y: 0.4, z: -4.9, w: 0.9, h: 0.24, color: NEON_MAGENTA, band: 2, scan: 1.6 },
      ] as const,
    [],
  );

  // 为每个招牌单独持有 uniforms 引用
  const uniformsList = useMemo(
    () =>
      signs.map((s) => ({
        uTime: { value: 0 },
        uBrightness: { value: 0.5 },
        uScan: { value: s.scan },
        uColor: { value: s.color.clone() },
      })),
    [signs],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;

    for (let i = 0; i < signs.length; i++) {
      const s = signs[i]!;
      const u = uniformsList[i]!;
      const drive = s.band === 0 ? audio.bass : s.band === 1 ? audio.mid : audio.treble;
      const flicker =
        s.band === 2
          ? 0.5 + Math.sin(t * 5.5 + i) * 0.15 + audio.treble * 0.35
          : 0.58 + Math.sin(t * 1.4 + i) * 0.1;
      const brightness = (flicker + drive * 0.7 + audio.impact * 0.55) * intensity;
      u.uTime.value = t;
      u.uBrightness.value = Math.min(1.4, brightness);
    }
  });

  return (
    <group ref={groupRef}>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <planeGeometry args={[s.w, s.h]} />
          <CustomShaderMaterial
            baseMaterial={THREE.MeshBasicMaterial}
            vertexShader={signVertex}
            fragmentShader={signFragment}
            uniforms={uniformsList[i]}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============ 车流光轨(accent 线,bass 加速,更长更有速度感) ============
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
    // 近道品红尾灯(长)
    for (let i = 0; i < 12; i++) {
      arr.push({
        x: (rnd() - 0.5) * 22,
        y: -1.86,
        z: -4.6,
        w: 1.6 + rnd() * 1.4, // 更长
        dir: -1,
        color: NEON_MAGENTA,
        baseSpeed: 4.5 + rnd() * 2.5,
      });
    }
    // 远道青头灯(略短)
    for (let i = 0; i < 12; i++) {
      arr.push({
        x: (rnd() - 0.5) * 22,
        y: -1.9,
        z: -5.6,
        w: 1.2 + rnd() * 1.1,
        dir: 1,
        color: NEON_CYAN,
        baseSpeed: 3.8 + rnd() * 2.2,
      });
    }
    // 更远一道稀疏光轨(纵深)
    for (let i = 0; i < 6; i++) {
      arr.push({
        x: (rnd() - 0.5) * 24,
        y: -1.92,
        z: -7.2,
        w: 0.9 + rnd() * 0.8,
        dir: rnd() > 0.5 ? 1 : -1,
        color: rnd() > 0.5 ? NEON_MAGENTA : NEON_CYAN,
        baseSpeed: 2.5 + rnd() * 1.4,
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    audio.update(delta);

    const speedMult = smoothSpeed.current.update(
      1 + audio.bass * 4.0 + audio.impact * 2.5,
      delta,
    );

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const lane = lanes[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      mesh.position.x += lane.dir * lane.baseSpeed * speedMult * delta * intensity;
      if (lane.dir < 0 && mesh.position.x < -14) mesh.position.x = 14 + Math.random() * 2;
      if (lane.dir > 0 && mesh.position.x > 14) mesh.position.x = -14 - Math.random() * 2;

      mat.opacity = Math.min(0.95, 0.55 + audio.bass * 0.35 + audio.rms * 0.14) * intensity;
    });
  });

  return (
    <group ref={groupRef}>
      {lanes.map((lane, i) => (
        <mesh key={i} position={[lane.x, lane.y, lane.z]}>
          <planeGeometry args={[lane.w, 0.05]} />
          <meshBasicMaterial
            color={`#${lane.color.getHexString()}`}
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============ 湿街反光地面 + 霓虹倒影/涟漪(shader 软叠层) ============
// 底层保持金属地面(反射环境),上叠一层 shader plane 画程序化倒影拖尾/涟漪
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

// 湿地霓虹倒影 shader: 品红/青长条竖向拖尾 + 缓涟漪
const reflectionFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform float uBass;
uniform vec3 uMagenta;
uniform vec3 uCyan;

varying vec2 vUv;

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  // 视觉上:地面 plane 已旋转,uv.y 是"离摄像机远近"(远处 uv.y~0, 近处 uv.y~1)
  // 让倒影竖向拖尾:沿 uv.y 变长,靠近摄像机(y 大)最亮最长

  // 涟漪扰动 uv.x -> 让倒影抖动像水面
  float ripple = cnoise(vec2(uv.x * 6.0, uv.y * 3.0 - uTime * 0.35)) * 0.05;
  ripple += cnoise(vec2(uv.x * 18.0, uv.y * 12.0 - uTime * 0.6)) * 0.02;
  float x = uv.x + ripple;

  // 竖条:多条不同位置的高斯,颜色左品红右青
  float smear = 0.0;
  vec3 smearCol = vec3(0.0);
  // 6 条固定位置的倒影带
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float cx = 0.15 + fi * 0.13 + sin(fi * 2.3) * 0.02;
    float w = 0.02 + mod(fi, 3.0) * 0.008;
    float d = abs(x - cx);
    float band = exp(-pow(d / w, 2.0));
    // 沿 y 拉长:远端弱近端强
    float lengthAlong = smoothstep(0.0, 1.0, uv.y);
    band *= lengthAlong * lengthAlong;
    // 音频呼吸
    float drive = mix(uBass, uMid, mod(fi, 2.0));
    band *= 0.4 + drive * 0.9 + uRms * 0.3;
    vec3 c = (fi < 3.0) ? uMagenta : uCyan;
    smear += band;
    smearCol += c * band;
  }

  // 靠近摄像机(uv.y 大)整体加一层微光,像湿地反光的整片亮
  float wetGlow = smoothstep(0.3, 1.0, uv.y) * 0.15;
  smearCol += mix(uMagenta, uCyan, 0.5) * wetGlow * (0.4 + uRms * 0.4);

  // 中心带压弱一点(歌手站位)
  float centerFall = smoothstep(0.0, 0.35, abs(uv.x - 0.5));
  smearCol *= 0.4 + centerFall * 0.9;
  smear *= 0.4 + centerFall * 0.9;

  float alpha = clamp(smear * 0.7 + wetGlow * 0.6, 0.0, 0.75);
  gl_FragColor = vec4(smearCol, alpha);
}
`;

function WetReflections({
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
      uBass: { value: 0 },
      uMagenta: { value: NEON_MAGENTA.clone() },
      uCyan: { value: NEON_CYAN.clone() },
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
    mat.uniforms.uBass!.value = audio.bass;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.14, -4]} renderOrder={3}>
      <planeGeometry args={[80, 40]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={skylineVertex}
        fragmentShader={reflectionFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
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
        {/* 远景 2: 程序化剪影天际线(fbm) */}
        <FarSilhouette featuresRef={featuresRef} />
        {/* 远景 3: 中景剪影(拉开纵深过渡,shader 软层) */}
        <MidSilhouette featuresRef={featuresRef} />

        {/* 舞台光:冷月光 + 侧向品红/青 rim */}
        <ambientLight intensity={0.14} color="#1a1a3a" />
        <directionalLight position={[-6, 8, 4]} intensity={0.35} color="#22d3ee" />
        <pointLight position={[8, 3, 2]} intensity={1.4} color="#ff2f8e" distance={26} />
        <pointLight position={[-8, 2, 2]} intensity={1.0} color="#22d3ee" distance={26} />

        {/* 近景锚点楼(唯一硬几何族,14栋,左右分簇,中心留空) */}
        <AnchorBuildings
          featuresRef={featuresRef}
          intensity={intensity}
          anchors={anchors}
        />
        {/* 稀疏窗灯(accent 点,径向衰减非网格,mid 驱动生活感律动) */}
        <AnchorWindows
          featuresRef={featuresRef}
          intensity={intensity}
          anchors={anchors}
        />

        {/* 体积光束/大气雾(中近之间纵深,mid 呼吸,软 shader 层) */}
        <LightBeams featuresRef={featuresRef} />

        {/* 招牌 & 车流(accent 层,不算硬几何) */}
        <NeonBillboards featuresRef={featuresRef} intensity={intensity} />
        <TrafficStreaks featuresRef={featuresRef} intensity={intensity} />

        {/* 湿街地面 + 霓虹倒影(shader 软叠层) */}
        <WetStreet featuresRef={featuresRef} intensity={intensity} />
        <WetReflections featuresRef={featuresRef} />

        {/* 雨夜氛围(最前的斜向雨丝 + 雨雾,软 shader 层) */}
        <RainVeil featuresRef={featuresRef} />

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
