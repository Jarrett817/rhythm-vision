import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
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

// ============ 远近双层天际线（真实剪影，网格窗灯） ============
// 每栋楼是一个 instance，几何用 boxGeometry；窗灯用单独的 instancedMesh 面片按网格贴合到楼面
const NEAR_ROW_COUNT = 22;
const FAR_ROW_COUNT = 30;
const TOTAL_BUILDINGS = NEAR_ROW_COUNT + FAR_ROW_COUNT;

type BuildingSpec = {
  x: number;
  y: number; // 底部固定
  z: number;
  width: number;
  height: number;
  depth: number;
  isNear: boolean;
  windowCols: number;
  windowRows: number;
  band: 0 | 1 | 2; // 0=bass 1=mid 2=treble 用于窗灯律动分组
  phase: number;
  hasSpire: boolean;
};

function buildSkyline(): BuildingSpec[] {
  const buildings: BuildingSpec[] = [];
  // 简单可复现的伪随机（避免每次 mount 变化过大）
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed & 0xffff) / 0xffff;
  };

  // 近层：更高更宽间距,压在画面下三分之一,中心留空让位歌手
  const nearWidth = 26;
  for (let i = 0; i < NEAR_ROW_COUNT; i++) {
    const t = i / (NEAR_ROW_COUNT - 1);
    const x = (t - 0.5) * nearWidth;
    // 中心区(|x|<2.5)压低楼高,让出中央负空间
    const centerCarve = Math.max(0, 1 - Math.abs(x) / 2.5);
    const heightMax = 6.5 - centerCarve * 3.2;
    const heightMin = 2.8;
    const height = heightMin + rnd() * (heightMax - heightMin);
    const width = 0.9 + rnd() * 0.6;
    buildings.push({
      x: x + (rnd() - 0.5) * 0.15,
      y: -2.2,
      z: -8.5 + (rnd() - 0.5) * 0.6,
      width,
      height,
      depth: 0.9 + rnd() * 0.35,
      isNear: true,
      windowCols: Math.max(3, Math.floor(width * 4)),
      windowRows: Math.max(4, Math.floor(height * 2.5)),
      band: (i % 3) as 0 | 1 | 2,
      phase: rnd() * Math.PI * 2,
      hasSpire: rnd() > 0.72 && height > 4.5,
    });
  }

  // 远层：更多楼、更矮更瘦、拉宽,做剪影地平线,中心也允许高楼
  const farWidth = 46;
  for (let i = 0; i < FAR_ROW_COUNT; i++) {
    const t = i / (FAR_ROW_COUNT - 1);
    const x = (t - 0.5) * farWidth;
    const height = 4 + rnd() * 8;
    const width = 0.8 + rnd() * 0.5;
    buildings.push({
      x: x + (rnd() - 0.5) * 0.25,
      y: -2.3,
      z: -14 + (rnd() - 0.5) * 1.2,
      width,
      height,
      depth: 0.9 + rnd() * 0.4,
      isNear: false,
      windowCols: Math.max(2, Math.floor(width * 3)),
      windowRows: Math.max(3, Math.floor(height * 1.6)),
      band: (i % 3) as 0 | 1 | 2,
      phase: rnd() * Math.PI * 2,
      hasSpire: rnd() > 0.78 && height > 8,
    });
  }
  return buildings;
}

function CityBuildings({
  featuresRef,
  intensity,
  buildings,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  buildings: BuildingSpec[];
}) {
  const nearRef = useRef<THREE.InstancedMesh>(null);
  const farRef = useRef<THREE.InstancedMesh>(null);
  const spireRef = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const spires = useMemo(() => buildings.filter((b) => b.hasSpire), [buildings]);
  const nearList = useMemo(() => buildings.filter((b) => b.isNear), [buildings]);
  const farList = useMemo(() => buildings.filter((b) => !b.isNear), [buildings]);

  useFrame((state, delta) => {
    audio.update(delta);
    const t = state.clock.elapsedTime;

    // 近层：结构随 bass 极轻微起伏（暗示鼓点), 楼体主色深靛蓝, rim 略带品红
    const nearMesh = nearRef.current;
    if (nearMesh) {
      nearList.forEach((b, i) => {
        const structuralSway = 1 + audio.bass * 0.012 * intensity;
        const h = b.height * structuralSway;
        dummy.position.set(b.x, b.y + h / 2, b.z);
        dummy.scale.set(b.width, h, b.depth);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        nearMesh.setMatrixAt(i, dummy.matrix);

        // 楼体颜色：深靛蓝底 + 微弱品红边光,rms 呼吸,不彩虹
        const rim = 0.05 + audio.rms * 0.08 + Math.sin(t * 0.35 + b.phase) * 0.015;
        tmpColor.copy(NIGHT_INDIGO).lerp(NEON_MAGENTA, rim);
        nearMesh.setColorAt(i, tmpColor);
      });
      nearMesh.instanceMatrix.needsUpdate = true;
      if (nearMesh.instanceColor) nearMesh.instanceColor.needsUpdate = true;
    }

    // 远层：几乎静止,只有 rms 极缓呼吸,颜色更冷更暗融入雾
    const farMesh = farRef.current;
    if (farMesh) {
      farList.forEach((b, i) => {
        dummy.position.set(b.x, b.y + b.height / 2, b.z);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        farMesh.setMatrixAt(i, dummy.matrix);

        const cool = 0.02 + audio.rms * 0.05;
        tmpColor.copy(NIGHT_INDIGO).lerp(NEON_CYAN, cool);
        farMesh.setColorAt(i, tmpColor);
      });
      farMesh.instanceMatrix.needsUpdate = true;
      if (farMesh.instanceColor) farMesh.instanceColor.needsUpdate = true;
    }

    // 尖顶天线：treble 驱动闪烁
    const spireMesh = spireRef.current;
    if (spireMesh) {
      spires.forEach((b, i) => {
        const glow = 0.4 + Math.sin(t * 3 + b.phase) * 0.3 + audio.treble * 0.6;
        dummy.position.set(b.x, b.y + b.height + 0.55, b.z);
        dummy.scale.set(0.05, 1.0 + audio.treble * 0.4, 0.05);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        spireMesh.setMatrixAt(i, dummy.matrix);

        tmpColor.copy(NEON_MAGENTA).multiplyScalar(glow);
        spireMesh.setColorAt(i, tmpColor);
      });
      spireMesh.instanceMatrix.needsUpdate = true;
      if (spireMesh.instanceColor) spireMesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      {/* 近层楼体 */}
      <instancedMesh ref={nearRef} args={[undefined, undefined, NEAR_ROW_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#0a0a1f"
          roughness={0.55}
          metalness={0.65}
        />
      </instancedMesh>
      {/* 远层楼体 */}
      <instancedMesh ref={farRef} args={[undefined, undefined, FAR_ROW_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#06061a"
          roughness={0.7}
          metalness={0.45}
        />
      </instancedMesh>
      {/* 天线尖顶 */}
      <instancedMesh ref={spireRef} args={[undefined, undefined, Math.max(1, spires.length)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#ff2f8e"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

// ============ 网格窗灯：instancedMesh 面片贴附在楼面上 ============
// 每栋楼按 windowCols × windowRows 网格生成小发光面片(相对楼中心 x/y 偏移)
// mid 驱动整体窗灯律动(人声),bass/treble 决定某些"层"是否亮起
function WindowLights({
  featuresRef,
  intensity,
  buildings,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
  buildings: BuildingSpec[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // 预生成每一个窗户的元数据
  const windows = useMemo(() => {
    const list: {
      x: number;
      y: number;
      z: number;
      band: 0 | 1 | 2;
      phase: number;
      isNear: boolean;
      colFraction: number;
      rowFraction: number;
    }[] = [];
    for (const b of buildings) {
      const cols = b.windowCols;
      const rows = b.windowRows;
      const halfW = b.width * 0.5;
      // 只贴楼正面(靠观众一侧,z + depth/2 + tiny),边缘留一点margin
      const faceZ = b.z + b.depth * 0.5 + 0.002;
      // 楼顶不到顶,楼底不到底
      const yStart = b.y + 0.35;
      const yEnd = b.y + b.height - 0.35;
      const usableH = yEnd - yStart;
      const xStart = -halfW + 0.14;
      const xEnd = halfW - 0.14;
      const usableW = xEnd - xStart;
      for (let cy = 0; cy < rows; cy++) {
        const rowFraction = rows === 1 ? 0.5 : cy / (rows - 1);
        const wy = yStart + rowFraction * usableH;
        for (let cx = 0; cx < cols; cx++) {
          const colFraction = cols === 1 ? 0.5 : cx / (cols - 1);
          const wx = b.x + xStart + colFraction * usableW;
          // ~35% 窗户默认关闭(相位极暗),让窗灯有稀疏感而非满格
          const on = ((cx * 3 + cy * 7 + Math.floor(b.phase * 100)) % 10) > 3;
          if (!on) continue;
          list.push({
            x: wx,
            y: wy,
            z: faceZ,
            band: b.band,
            phase: b.phase + cx * 0.31 + cy * 0.17,
            isNear: b.isNear,
            colFraction,
            rowFraction,
          });
        }
      }
    }
    return list;
  }, [buildings]);

  const totalWindows = windows.length;

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    audio.update(delta);
    const midVocal = audio.mid;
    const treble = audio.treble;
    const bass = audio.bass;
    const rms = audio.rms;

    for (let i = 0; i < totalWindows; i++) {
      const w = windows[i]!;
      // 人声(mid)驱动整体亮度波动,是主"呼吸"
      const vocalRhythm = 0.55 + Math.sin(w.phase + midVocal * 3.5) * 0.35;
      // 频段分组:少量窗户跟 bass/treble 抢拍
      const bandDrive = w.band === 0 ? bass : w.band === 1 ? midVocal : treble;
      // 远景整体压暗,加深空气感
      const depthDim = w.isNear ? 1.0 : 0.55;
      const brightness =
        (0.25 + vocalRhythm * 0.35 + bandDrive * 0.6 + rms * 0.25 + audio.impact * 0.3) *
        depthDim *
        intensity;

      // 窗灯颜色:暖金主,极少数(band==2 高频)偏品红,不彩虹
      if (w.band === 2 && treble > 0.15) {
        tmpColor.copy(NEON_MAGENTA).lerp(WINDOW_AMBER, 0.4);
      } else {
        tmpColor.copy(WINDOW_AMBER);
      }
      tmpColor.multiplyScalar(brightness);

      dummy.position.set(w.x, w.y, w.z);
      const size = w.isNear ? 0.14 : 0.09;
      dummy.scale.set(size, size, 1);
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
      args={[undefined, undefined, Math.max(1, totalWindows)]}
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

// ============ 霓虹招牌：几块粗面片,锁色品红/青交替,treble 闪烁 ============
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
        { x: -9.5, y: 1.4, z: -7.8, w: 2.4, h: 0.55, color: NEON_MAGENTA, band: 0 },
        { x: -3.8, y: 3.6, z: -8.4, w: 1.6, h: 0.4, color: NEON_CYAN, band: 2 },
        { x: 4.2, y: 1.0, z: -7.6, w: 2.0, h: 0.5, color: NEON_MAGENTA, band: 1 },
        { x: 8.8, y: 3.8, z: -8.2, w: 1.8, h: 0.45, color: NEON_CYAN, band: 2 },
        { x: -11.5, y: 4.5, z: -9.1, w: 1.4, h: 0.35, color: NEON_CYAN, band: 2 },
        { x: 11.2, y: 0.6, z: -8.0, w: 2.2, h: 0.5, color: NEON_MAGENTA, band: 0 },
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
      // treble 高时快速闪烁(冷色牌),bass 高时暖色牌爆闪
      const flicker =
        s.band === 2
          ? 0.5 + Math.sin(t * 6 + i) * 0.15 + audio.treble * 0.35
          : 0.6 + Math.sin(t * 1.6 + i) * 0.1;
      const brightness = (flicker + drive * 0.7 + audio.impact * 0.6) * intensity;
      mat.opacity = Math.min(1, 0.35 + brightness * 0.6);
      mat.color.copy(s.color).multiplyScalar(0.9 + brightness * 0.8);
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
            opacity={0.6}
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

// ============ 车流光轨:横向拉长的短线段,bass 加速,平稳持续存在 ============
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
    // 两条车道,近道品红(向左),远道青色(向右),各自若干光条
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
    // 近道:品红(尾灯),向左
    for (let i = 0; i < 14; i++) {
      arr.push({
        x: (rnd() - 0.5) * 22,
        y: -1.86,
        z: -5.2,
        w: 0.9 + rnd() * 0.7,
        dir: -1,
        color: NEON_MAGENTA,
        baseSpeed: 3.5 + rnd() * 2,
      });
    }
    // 远道:青(头灯),向右
    for (let i = 0; i < 14; i++) {
      arr.push({
        x: (rnd() - 0.5) * 22,
        y: -1.9,
        z: -6.4,
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

    // bass 主要驱动车流速度(鼓=心跳=城市脉搏)
    const speedMult = smoothSpeed.current.update(
      1 + audio.bass * 3.5 + audio.impact * 2,
      delta,
    );

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const lane = lanes[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      mesh.position.x += lane.dir * lane.baseSpeed * speedMult * delta * intensity;
      // 环绕
      if (lane.dir < 0 && mesh.position.x < -13) mesh.position.x = 13 + Math.random() * 2;
      if (lane.dir > 0 && mesh.position.x > 13) mesh.position.x = -13 - Math.random() * 2;

      mat.opacity = Math.min(0.95, 0.55 + audio.bass * 0.35 + audio.rms * 0.15) * intensity;
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

// ============ 湿街反光地面:低粗糙度金属反射,bass 打击时地面泛光 ============
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

    // 品红-青双色混合,bass 时更偏品红(暖),treble 时轻微偏青
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
  const buildings = useMemo(() => buildSkyline(), []);

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0.4, 9.5], fov: 60 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(CITY_SKY.fog, 0.038);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        {/* 极慢天幕:rms 呼吸,不跟拍 */}
        <AuroraSky featuresRef={featuresRef} theme={CITY_SKY} />

        {/* 舞台灯光:上方冷月光 + 侧向品红 rim,不做点光源满场旋转 */}
        <ambientLight intensity={0.14} color="#1a1a3a" />
        <directionalLight position={[-6, 8, 4]} intensity={0.35} color="#22d3ee" />
        <pointLight position={[8, 3, 2]} intensity={1.4} color="#ff2f8e" distance={26} />
        <pointLight position={[-8, 2, 2]} intensity={1.0} color="#22d3ee" distance={26} />

        {/* 天际线主体 */}
        <CityBuildings
          featuresRef={featuresRef}
          intensity={intensity}
          buildings={buildings}
        />
        <WindowLights
          featuresRef={featuresRef}
          intensity={intensity}
          buildings={buildings}
        />
        <NeonBillboards featuresRef={featuresRef} intensity={intensity} />
        <TrafficStreaks featuresRef={featuresRef} intensity={intensity} />
        <WetStreet featuresRef={featuresRef} intensity={intensity} />

        {/* 电影级后期:高阈值 bloom + 色彩分级 + 边缘暗角 + 微噪点 */}
        <EffectComposer multisampling={2}>
          <Bloom
            intensity={1.5 + intensity * 1.1}
            luminanceThreshold={0.32}
            luminanceSmoothing={0.88}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0005, 0.0005]}
            radialModulation
            modulationOffset={0.45}
          />
          {/* 偏冷夜色调,略压对比 */}
          <HueSaturation hue={-0.02} saturation={0.14} />
          <BrightnessContrast brightness={-0.04} contrast={0.16} />
          <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.26} darkness={0.78} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
