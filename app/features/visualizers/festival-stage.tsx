import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import { Sparkles } from "@react-three/drei";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { StageVignette, StageFloorGlow } from "~/features/visualizers/shared/stage-compositor";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { GLSL_CLASSIC_NOISE_2D, GLSL_CLASSIC_NOISE_3D } from "~/lib/glsl/noise-chunks";

// ============ 配色：华语演唱会意境色（低饱和、柔雅） ============
const FOG_COLOR = new THREE.Color("#080818");
const WARM_GOLD = new THREE.Color("#e8c98a");
const SOFT_WHITE = new THREE.Color("#f4ecd8");
const MOON_WHITE = new THREE.Color("#e6e6f5");
const DEEP_INDIGO = new THREE.Color("#1a1040");
const VEIL_PURPLE = new THREE.Color("#5a4a8a");
const VEIL_BLUE = new THREE.Color("#3a4a7a");
const PETAL_PINK = new THREE.Color("#f0c6d4");
const PETAL_WHITE = new THREE.Color("#faf0e6");
const PETAL_LILAC = new THREE.Color("#c9b5d9");
const CORE_GOLD = new THREE.Color("#ffe8b8");
const GLOW_PINK = new THREE.Color("#ffd4e0");
const FLOOR_DARK = new THREE.Color("#050510");

// ============ GLSL：平面通⽤顶点着色器 ============
const planeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ============ 1. 纱幕层 shader：fBm 噪声做薄纱/烟霞飘动 ============
const veilFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_3D}

uniform float uTime;
uniform float uMid;
uniform float uRms;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uSeed;

varying vec2 vUv;

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  // 水平羽化：避免硬边
  float edgeX = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  // 纵向柔和分布：中心亮、上下淡
  float vert = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.6, uv.y);

  // 极慢飘动：time * 0.08
  float slow = uTime * 0.08 + uSeed;
  vec3 p = vec3(uv.x * 1.6 + slow * 0.3, uv.y * 1.2 - slow * 0.15, slow * 0.25 + uSeed);
  float n = fbm(p);
  n = smoothstep(-0.3, 0.6, n);

  // 第二层细节
  vec3 p2 = vec3(uv.x * 3.0 - slow * 0.4, uv.y * 2.2 + slow * 0.2, slow * 0.4 + uSeed * 1.7);
  float n2 = fbm(p2) * 0.4;

  float veil = (n + n2) * edgeX * vert;
  // 音频微幅推动：mid 让纱幕更显，rms 整体呼吸
  veil *= 0.75 + uMid * 0.35 + uRms * 0.2;

  float alpha = clamp(veil * uAlpha, 0.0, 0.35);
  if (alpha < 0.002) discard;
  csm_FragColor = vec4(uColor, alpha);
}
`;

function VeilLayer({
  featuresRef,
  position,
  size,
  color,
  baseAlpha,
  seed,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  position: [number, number, number];
  size: [number, number];
  color: THREE.Color;
  baseAlpha: number;
  seed: number;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMid: { value: 0 },
      uRms: { value: 0 },
      uColor: { value: color.clone() },
      uAlpha: { value: baseAlpha },
      uSeed: { value: seed },
    }),
    [],
  );
  const audio = useAudioResponse(featuresRef);
  const smoothMid = useRef(new SmoothValue(0.05));
  const smoothRms = useRef(new SmoothValue(0.03));

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    audio.update(delta);
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uMid!.value = smoothMid.current.update(audio.mid, delta);
    mat.uniforms.uRms!.value = smoothRms.current.update(audio.rms, delta);
  });

  return (
    <mesh position={position} renderOrder={2}>
      <planeGeometry args={size} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={planeVertex}
        fragmentShader={veilFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============ 2. 柔和体积光柱 shader：垂直平面上画⾼斯模糊光锥 ============
// 每束光使⽤ billboard 平⾯，⽚元着⾊器画⼀个上窄下宽的柔和锥形光。
const beamVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // 使⽤ instanceMatrix（虽然这⾥单 mesh，billboard ⻛格）
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const beamFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uMid;
uniform float uRms;
uniform float uSection; // 段落亮度
uniform vec3 uColor;
uniform float uWidth; // 底部半宽
uniform float uTopRatio; // 顶部宽度 / 底部宽度
uniform float uSway; // 左右摇摆量（-1~1 外部已传）
uniform float uSeed;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // y: 0=底部, 1=顶部（顶点源处）
  float y = uv.y;

  // 光锥宽度：从底部宽到顶部窄（顶点在顶部）
  float halfW = mix(uWidth, uWidth * uTopRatio, y);
  // 左右摇摆：顶部更稳定，中下部随 uSway 微微偏移（像柔软的追光）
  float swayOffset = uSway * (1.0 - smoothstep(0.0, 0.5, y)) * 0.35;

  float dx = abs(uv.x - 0.5 - swayOffset);
  // ⾼斯衰减：横向
  float gx = exp(-(dx * dx) / (halfW * halfW * 0.35));
  // 纵向衰减：顶部最亮、向下逐渐扩散变淡（雾感）
  float gy = smoothstep(1.02, 0.2, y) * 0.55 + smoothstep(0.0, 0.8, y) * 0.45;
  // 加噪声柔化边缘，让光柱更有体积感
  float n = cnoise(vec2(uv.x * 4.0 + uTime * 0.1 + uSeed, uv.y * 3.0 - uTime * 0.08));
  float shape = gx * gy;
  shape *= 0.85 + n * 0.25;

  // 音频响应：rms 整体呼吸，mid 让光柱更有存在感
  float intensity = shape * (0.5 + uRms * 0.6 + uMid * 0.3) * uSection;

  float alpha = clamp(intensity * 0.11, 0.0, 0.14);
  if (alpha < 0.002) discard;

  // 颜色：核⼼偏⽩，边缘染⾊
  vec3 col = mix(uColor * 0.6, vec3(1.0, 0.96, 0.88), gx * 0.4);
  csm_FragColor = vec4(col, alpha);
}
`;

function SoftBeam({
  featuresRef,
  position,
  height,
  width,
  color,
  phase,
  sectionRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  position: [number, number, number];
  height: number;
  width: number;
  color: THREE.Color;
  phase: number;
  sectionRef: React.RefObject<number>;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMid: { value: 0 },
      uRms: { value: 0 },
      uSection: { value: 0.3 },
      uColor: { value: color.clone() },
      uWidth: { value: 0.5 },
      uTopRatio: { value: 0.25 },
      uSway: { value: 0 },
      uSeed: { value: phase },
    }),
    [],
  );
  const audio = useAudioResponse(featuresRef);
  const smoothMid = useRef(new SmoothValue(0.05));
  const smoothRms = useRef(new SmoothValue(0.03));

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime!.value = t;
    mat.uniforms.uMid!.value = smoothMid.current.update(audio.mid, delta);
    mat.uniforms.uRms!.value = smoothRms.current.update(audio.rms, delta);
    mat.uniforms.uSection!.value = sectionRef.current;
    // 缓慢左右摆动，由 mid 微推，速度极慢 0.3~0.5
    const sway = Math.sin(t * 0.35 + phase) * (0.6 + audio.mid * 0.5);
    mat.uniforms.uSway!.value = sway;
    // 底部宽度随段落呼吸
    mat.uniforms.uWidth!.value = width * (0.85 + sectionRef.current * 0.3 + audio.rms * 0.15);
  });

  return (
    <mesh position={position} renderOrder={3}>
      {/* 平⾯竖直，y轴从下到上；光柱顶部在 mesh 上沿 */}
      <planeGeometry args={[width * 2, height]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={beamVertex}
        fragmentShader={beamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============ 3. 花瓣：InstancedMesh + 柔和椭圆着色 ============
const PETAL_COUNT = 65;

type Petal = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number; // 下落速度（负向）
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
  swayPhase: number;
  swayAmp: number;
  size: number;
  color: THREE.Color;
};

const PETAL_COLORS = [PETAL_PINK, PETAL_WHITE, PETAL_LILAC, new THREE.Color("#ffd9e2")];

function Petals({
  featuresRef,
  intensity,
  densityRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  densityRef: React.RefObject<number>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const petalsRef = useRef<Petal[]>([]);

  // 花瓣着⾊：shader 画柔和椭圆花瓣形状（使⽤原⽣ ShaderMaterial → gl_FragColor）
  const petalMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {},
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - 0.5;
          // 花瓣：纵向稍长椭圆，顶端略尖
          float ax = uv.x * 2.4;
          float ay = uv.y * 2.0;
          // 顶端收尖：y 负向（顶端）稍收
          float taper = 1.0 - smoothstep(0.2, 0.5, -ay) * 0.35;
          ax /= taper;
          float d = ax * ax + ay * ay * 1.2;
          float shape = exp(-d * 2.5);
          // 中央中脉微亮
          float vein = exp(-abs(ax) * 6.0) * 0.25;
          float a = shape;
          if (a < 0.02) discard;
          // 颜色由 instanceColor 提供，alpha 随 shape 衰减
          gl_FragColor = vec4(vec3(1.0) + vein * 0.35, a * 0.75);
        }
      `,
    });
    // 关闭 tone mapping 以避免发暗（AdditiveBlending 发光材质）
    (mat as unknown as { toneMapped: boolean }).toneMapped = false;
    return mat;
  }, []);

  // 初始化花瓣对象池
  if (petalsRef.current.length === 0) {
    for (let i = 0; i < PETAL_COUNT; i++) {
      petalsRef.current.push(spawnPetal(Math.random()));
    }
  }

  function spawnPetal(initialY: number): Petal {
    const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]!;
    return {
      x: (Math.random() - 0.5) * 18,
      y: 4 + initialY * 10,
      z: -2 - Math.random() * 12,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(0.25 + Math.random() * 0.25),
      vz: (Math.random() - 0.5) * 0.1,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      rvx: (Math.random() - 0.5) * 0.4,
      rvy: (Math.random() - 0.5) * 0.5,
      rvz: (Math.random() - 0.5) * 0.3,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.4 + Math.random() * 0.5,
      size: 0.25 + Math.random() * 0.2,
      color: color.clone(),
    };
  }

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;
    // bass 让下落速度微微加快（优雅，不剧烈）
    const fallSpeedMul = 1 + audio.bass * 0.35;
    // 段落密度控制
    const density = densityRef.current;
    const activeCap = Math.floor(PETAL_COUNT * (0.4 + density * 0.6));

    let activeCount = 0;
    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = petalsRef.current[i]!;
      if (activeCount >= activeCap) {
        // 超出激活数上限的花瓣藏起
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tmpColor.set(0, 0, 0);
        mesh.setColorAt(i, tmpColor);
        continue;
      }

      // 下落 + 左右摆动
      p.y += p.vy * fallSpeedMul * delta * 1.2;
      p.x += p.vx * delta + Math.sin(t * 0.6 + p.swayPhase) * p.swayAmp * delta;
      p.z += p.vz * delta;
      p.rx += p.rvx * delta;
      p.ry += p.rvy * delta;
      p.rz += p.rvz * delta;

      // 掉出画面重生（从顶部）
      if (p.y < -2.5) {
        const fresh = spawnPetal(0);
        Object.assign(p, fresh);
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(p.size, p.size * 1.15, p.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(p.color).multiplyScalar(0.8 + audio.rms * 0.3);
      mesh.setColorAt(i, tmpColor);
      activeCount++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 材质整体透明度（受 intensity + rms 影响）
    petalMaterial.opacity = (0.55 + audio.rms * 0.3) * intensity;
    petalMaterial.transparent = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PETAL_COUNT]}
      material={petalMaterial}
      frustumCulled={false}
      renderOrder={8}
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}

// ============ 4. 舞台地⾯：深⾊反光 ============
const floorVertex = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const floorFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_3D}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform vec3 uCoreColor;
uniform vec3 uFloorColor;

varying vec3 vWorldPos;

void main() {
  // 离中⼼越远越暗
  float r = length(vWorldPos.xz);

  // 极微弱的反光：中⼼处有⼀圈柔亮（反射光核/光柱）
  float reflectGlow = exp(-r * r * 0.04) * (0.15 + uRms * 0.25 + uMid * 0.1);

  // 噪声纹理让地⾯不发死
  float n = cnoise(vec3(vWorldPos.xz * 0.15, uTime * 0.05));
  float subtle = 0.92 + n * 0.08;

  vec3 col = uFloorColor * subtle;
  // 中⼼反射染⼀点暖⾦
  col += uCoreColor * reflectGlow * 0.6;

  // 远处雾化：避免硬边
  float edge = smoothstep(22.0, 8.0, r);

  float alpha = edge;
  csm_FragColor = vec4(col, alpha);
}
`;

function StageFloor({
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
      uCoreColor: { value: CORE_GOLD.clone() },
      uFloorColor: { value: FLOOR_DARK.clone() },
    }),
    [],
  );
  const audio = useAudioResponse(featuresRef);
  const smoothRms = useRef(new SmoothValue(0.03));
  const smoothMid = useRef(new SmoothValue(0.04));

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    audio.update(delta);
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uRms!.value = smoothRms.current.update(audio.rms, delta);
    mat.uniforms.uMid!.value = smoothMid.current.update(audio.mid, delta);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, -6]} renderOrder={1}>
      <planeGeometry args={[50, 40]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={floorVertex}
        fragmentShader={floorFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============ 5. ⽔晶光核（多层柔光壳 + 外层光晕） ============
function CrystalCore({
  featuresRef,
  intensity,
  brightnessRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  brightnessRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothScale = useRef(new SmoothValue(0.04));
  const smoothBright = useRef(new SmoothValue(0.05));
  const innerShellOpacities = useMemo(() => [0.35, 0.22, 0.12, 0.06], []);

  useFrame((state, delta) => {
    const g = groupRef.current;
    const halo = haloRef.current;
    if (!g) return;
    audio.update(delta);
    const t = state.clock.elapsedTime;

    // rms 呼吸缩放 + treble 微闪高光
    const breath = 1 + audio.rms * 0.2 + audio.impact * 0.15;
    const targetScale = 3.5 * breath * intensity * brightnessRef.current;
    g.scale.setScalar(smoothScale.current.update(targetScale, delta));
    g.rotation.y = t * 0.08;

    const energy = 0.55 + audio.rms * 0.6 + audio.treble * 0.3;
    const bright = smoothBright.current.update(energy * brightnessRef.current, delta);

    g.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      // 内层偏暖⽩⾦，外层略染粉
      const base = innerShellOpacities[i] ?? 0.04;
      mat.opacity = base * bright;
      // treble 时闪高光：内层稍微变亮偏白
      if (i === 0) {
        mat.color.copy(CORE_GOLD).lerp(SOFT_WHITE, 0.2 + audio.treble * 0.5);
      } else {
        mat.color.copy(WARM_GOLD).lerp(GLOW_PINK, i * 0.15);
      }
    });

    if (halo) {
      const hMat = halo.material as THREE.MeshBasicMaterial;
      hMat.opacity = 0.08 * bright * intensity;
      halo.scale.setScalar(1.8 + audio.rms * 0.2);
    }
  });

  return (
    <group position={[0, 1.0, -4]}>
      <group ref={groupRef}>
        {innerShellOpacities.map((_, i) => (
          <mesh key={i} scale={0.7 + i * 0.5}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial
              color={CORE_GOLD}
              transparent
              opacity={innerShellOpacities[i]}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* 外层薄光晕 */}
      <mesh ref={haloRef} scale={2.5}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={GLOW_PINK}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ============ 6. ⽔晶碎微光粒（围绕光核） ============
function ShardSparkles({
  intensity,
  brightnessRef,
}: {
  intensity: number;
  brightnessRef: React.RefObject<number>;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += delta * 0.03;
    g.rotation.x += delta * 0.01;
  });
  const opacity = 0.5 * intensity;
  return (
    <group ref={ref} position={[0, 1.0, -4]}>
      <Sparkles
        count={60}
        scale={[8, 6, 8]}
        size={1.8}
        speed={0.2}
        opacity={opacity * brightnessRef.current}
        color={SOFT_WHITE}
        noise={0.8}
      />
      <Sparkles
        count={40}
        scale={[5, 4, 5]}
        size={1.2}
        speed={0.3}
        opacity={opacity * 0.7 * brightnessRef.current}
        color={WARM_GOLD}
        noise={0.9}
      />
    </group>
  );
}

// ============ 7. 场景演化器：段落驱动相机/雾/光柱/花瓣/光核亮度 ============
// 不做相机震动！华语演唱会优雅推镜。
function SceneEvolver({
  featuresRef,
  beamBrightnessRef,
  petalDensityRef,
  coreBrightnessRef,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  beamBrightnessRef: React.RefObject<number>;
  petalDensityRef: React.RefObject<number>;
  coreBrightnessRef: React.RefObject<number>;
}) {
  const { camera, scene } = useThree();
  const audio = useAudioResponse(featuresRef);
  const baseCamZ = 14;
  const baseCamY = 1.5;
  const baseFov = 52;
  const baseFogDensity = 0.025;

  const smoothBeam = useRef(new SmoothValue(0.03));
  const smoothPetal = useRef(new SmoothValue(0.03));
  const smoothCore = useRef(new SmoothValue(0.04));

  useFrame((_, delta) => {
    audio.update(delta);
    const section = audio.section;
    const tension = audio.tension;

    let targetZ = baseCamZ;
    let targetY = baseCamY;
    let targetFov = baseFov;
    let fogTarget = baseFogDensity;
    let beamTarget = 0.35;
    let petalTarget = 0.5;
    let coreTarget = 0.7;

    switch (section) {
      case "intro":
        targetZ = 16;
        targetY = 1.8;
        targetFov = 50;
        fogTarget = 0.038;
        beamTarget = 0.3;
        petalTarget = 0.4;
        coreTarget = 0.55;
        break;
      case "verse":
        targetZ = 14;
        targetY = 1.6;
        targetFov = 52;
        fogTarget = 0.03;
        beamTarget = 0.5;
        petalTarget = 0.6;
        coreTarget = 0.75;
        break;
      case "buildup":
        // 缓慢推近
        targetZ = 10 - tension * 1.5;
        targetY = 1.3;
        targetFov = 52 + tension * 3;
        fogTarget = 0.028 - tension * 0.006;
        beamTarget = 0.6 + tension * 0.3;
        petalTarget = 0.7 + tension * 0.2;
        coreTarget = 0.85 + tension * 0.15;
        break;
      case "drop":
        // 微微拉远，FOV 轻微增大；不震动
        targetZ = 13;
        targetY = 1.5;
        targetFov = 60;
        fogTarget = 0.02;
        beamTarget = 1.0;
        petalTarget = 0.95;
        coreTarget = 1.0;
        break;
      case "breakdown":
        targetZ = 16;
        targetY = 1.8;
        targetFov = 51;
        fogTarget = 0.036;
        beamTarget = 0.35;
        petalTarget = 0.45;
        coreTarget = 0.6;
        break;
    }

    const lerpSpeed = Math.min(1, delta * 1.5);
    camera.position.z += (targetZ - camera.position.z) * lerpSpeed;
    camera.position.y += (targetY - camera.position.y) * lerpSpeed;
    camera.position.x += (0 - camera.position.x) * Math.min(1, delta * 1.2);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 1.5);
      camera.updateProjectionMatrix();
    }

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density += (fogTarget - scene.fog.density) * Math.min(1, delta * 1.0);
    }

    // 写入各层参考值（共享给光束/花瓣/光核）
    beamBrightnessRef.current = smoothBeam.current.update(beamTarget, delta);
    petalDensityRef.current = smoothPetal.current.update(petalTarget, delta);
    coreBrightnessRef.current = smoothCore.current.update(coreTarget, delta);
  });

  return null;
}

// ============ 主场景 ============
export function FestivalStageScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  // 段落演化共享状态（跨子组件通过 ref 通信，避免 re-render）
  const beamBrightnessRef = useRef(0.35);
  const petalDensityRef = useRef(0.5);
  const coreBrightnessRef = useRef(0.7);

  // 光柱配置：5 束柔光，位置/宽/色/相位各不同
  const beams = useMemo(
    () => [
      { position: [-3.5, 3.5, -12] as [number, number, number], height: 13, width: 1.8, color: SOFT_WHITE, phase: 0.0 },
      { position: [3.0, 3.5, -11] as [number, number, number], height: 12, width: 1.6, color: WARM_GOLD, phase: 1.7 },
      { position: [0, 4.2, -14] as [number, number, number], height: 14, width: 2.2, color: GLOW_PINK, phase: 0.8 },
      { position: [-6.5, 3.2, -10] as [number, number, number], height: 11, width: 1.4, color: MOON_WHITE, phase: 2.6 },
      { position: [6.0, 3.2, -10] as [number, number, number], height: 11, width: 1.5, color: WARM_GOLD, phase: 3.9 },
    ],
    [],
  );

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 1.5, 14], fov: 52 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(FOG_COLOR.clone(), 0.025);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        {/* 深色渐变背景 */}
        <color attach="background" args={["#080818"]} />

        {/* 基础微光环境：深蓝紫，不会有强定向光 */}
        <ambientLight intensity={0.15} color="#2a1f55" />

        {/* ============ 远景：星尘 ============ */}
        <Sparkles
          count={200}
          scale={[40, 22, 30]}
          position={[0, 4, -22]}
          size={1.5}
          speed={0.12}
          opacity={0.7 * intensity}
          color={SOFT_WHITE}
          noise={0.8}
        />
        <Sparkles
          count={120}
          scale={[36, 18, 28]}
          position={[0, 3, -20]}
          size={1.0}
          speed={0.18}
          opacity={0.55 * intensity}
          color={WARM_GOLD}
          noise={0.85}
        />

        {/* ============ 纱幕三层（z=-5/-12/-20） ============ */}
        <VeilLayer
          featuresRef={featuresRef}
          position={[0, 2, -5]}
          size={[28, 14]}
          color={VEIL_PURPLE}
          baseAlpha={0.15}
          seed={0.3}
        />
        <VeilLayer
          featuresRef={featuresRef}
          position={[0, 2.5, -12]}
          size={[34, 16]}
          color={VEIL_BLUE}
          baseAlpha={0.12}
          seed={1.7}
        />
        <VeilLayer
          featuresRef={featuresRef}
          position={[0, 3, -20]}
          size={[44, 20]}
          color={DEEP_INDIGO}
          baseAlpha={0.1}
          seed={2.9}
        />

        {/* ============ 柔和体积光柱（5 束追光） ============ */}
        {beams.map((b, i) => (
          <SoftBeam
            key={i}
            featuresRef={featuresRef}
            position={b.position}
            height={b.height}
            width={b.width}
            color={b.color}
            phase={b.phase}
            sectionRef={beamBrightnessRef}
          />
        ))}

        {/* ============ 舞台地⾯ ============ */}
        <StageFloor featuresRef={featuresRef} />

        {/* ============ ⽔晶光核 ============ */}
        <CrystalCore
          featuresRef={featuresRef}
          intensity={intensity}
          brightnessRef={coreBrightnessRef}
        />

        {/* ============ 光核周围碎微光粒 ============ */}
        <ShardSparkles
          intensity={intensity}
          brightnessRef={coreBrightnessRef}
        />

        {/* ============ 花瓣飘落 ============ */}
        <Petals
          featuresRef={featuresRef}
          intensity={intensity}
          densityRef={petalDensityRef}
        />

        {/* 舞台地屏反射光（暖金色，匹配星光舞台色调） */}
        <StageFloorGlow featuresRef={featuresRef} color="#2a1508" />

        {/* ============ 段落演化器：相机/雾/亮度 ============ */}
        <SceneEvolver
          featuresRef={featuresRef}
          beamBrightnessRef={beamBrightnessRef}
          petalDensityRef={petalDensityRef}
          coreBrightnessRef={coreBrightnessRef}
        />

        {/* 舞台边缘暗角+中央避位（保护歌手区域不被遮挡） */}
        <StageVignette featuresRef={featuresRef} />

        {/* ============ 电影感柔和后处理 ============ */}
        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
    </Canvas>
  );
}
