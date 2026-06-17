import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { FlowRibbons, SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { ThreeVisualizerShell } from "~/features/visualizers/shared/three-visualizer-shell";
import { SceneSpringEntry } from "~/features/visualizers/shared/scene-spring-entry";
import { SceneEnvironment } from "~/features/visualizers/shared/scene-environment";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";

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

    // 整体转速随 bass 加速
    const baseSpeed = (1.2 + audio.bass * 5 + audio.rms * 2) * intensity;

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

      // 颜色：不同环用不同色相，随 treble 偏移
      const hue = 0.5 + i * 0.025 + audio.treble * 0.15;
      const lightness = 0.5 + drive * 0.25;
      mat.color.setHSL(hue, 1, lightness);

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

    // Bass 强时速度爆发
    const baseSpeed = (2.5 + bass * 12 + rms * 3) * intensity * delta;
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

    // 旋转随 mid 加速
    points.rotation.y += delta * (0.4 + mid * 3);
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;

    const mat = points.material as THREE.PointsMaterial;
    // 大小随 rms 爆发
    mat.size = (0.05 + rms * 0.2 + audio.impact * 0.1) * intensity;

    // 颜色脉冲
    const hue = 0.52 + Math.sin(state.clock.elapsedTime * 0.5) * 0.08 + treble * 0.15;
    colorRef.current.setHSL(hue, 1, 0.6 + rms * 0.2);
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
  const waves = useRef<{ life: number; dir: THREE.Vector3; speed: number }[]>([]);
  const maxWaves = 10;

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

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

    // 同步 mesh
    while (group.children.length > waves.current.length) {
      group.remove(group.children[group.children.length - 1]!);
    }
    while (group.children.length < waves.current.length) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.02, 8, 64),
        new THREE.MeshBasicMaterial({
          color: "#00ffff",
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(ring);
    }

    waves.current.forEach((w, i) => {
      const mesh = group.children[i] as THREE.Mesh;
      const size = (1 - w.life) * 12 * intensity;
      mesh.scale.set(size, size, size);
      mesh.lookAt(w.dir);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = w.life * 0.5;
      mat.color.setHSL(0.5 + (1 - w.life) * 0.1, 1, 0.6);
    });
  });

  return <group ref={groupRef} />;
}

// ================= 中心能量核心 =================
function EnergyCore({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothScale = useRef(new SmoothValue(0.2));

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    audio.update(delta);

    // 核心大小随 RMS 呼吸，bass 时膨胀
    const targetScale = (1 + audio.rms * 1.2 + audio.bass * 0.8 + audio.impact * 0.5) *
      intensity;
    mesh.scale.setScalar(smoothScale.current.update(targetScale, delta));

    // 旋转
    mesh.rotation.x = state.clock.elapsedTime * 0.5;
    mesh.rotation.y = state.clock.elapsedTime * 0.8;

    const mat = mesh.material as THREE.MeshBasicMaterial;
    // 发光强度
    mat.opacity = 0.4 + audio.rms * 0.5;
    // 颜色偏移
    mat.color.setHSL(0.52 + audio.treble * 0.2, 1, 0.55 + audio.rms * 0.15);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.5, 2]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        wireframe
      />
    </mesh>
  );
}

// ================= 主场景 =================
export function PulseRushScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.fast;

  return (
    <ThreeVisualizerShell>
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 9], fov: 65 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.025);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <SceneSpringEntry>
      <Suspense fallback={null}>
        <SceneEnvironment variant="studio" intensity={0.38} />
        <AuroraSky featuresRef={featuresRef} theme={theme} />
        <ambientLight intensity={0.2} color="#0891b2" />
        <pointLight position={[0, 0, 3]} intensity={2.5} color="#22d3ee" distance={25} />

        <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={500} />
        <FlowRibbons featuresRef={featuresRef} intensity={intensity} baseHue={190} />
        <RhythmWarpTunnel featuresRef={featuresRef} intensity={intensity} />
        <RhythmPulseRings featuresRef={featuresRef} intensity={intensity} />
        <BassShockwaves featuresRef={featuresRef} intensity={intensity} />
        <EnergyCore featuresRef={featuresRef} intensity={intensity} />

        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
      </SceneSpringEntry>
    </Canvas>
    </ThreeVisualizerShell>
  );
}
