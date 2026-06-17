import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";
import { useAudioResponse, SmoothValue } from "~/features/visualizers/shared/audio-response";

const BUILDING_COUNT = 64;
const ROOF_COUNT = 28;

function RealisticSkyline({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const buildingRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const audio = useAudioResponse(featuresRef);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const buildings = useMemo(() => {
    const rows = [
      { count: 34, z: -10.5, widthStep: 1.25, heightMin: 2.5, heightMax: 8.5, depth: 0.9, scale: 0.92 },
      { count: 30, z: -13.2, widthStep: 1.45, heightMin: 4.0, heightMax: 12.5, depth: 1.25, scale: 1.05 },
    ];

    return rows.flatMap((row, rowIndex) =>
      Array.from({ length: row.count }, (_, i) => {
        const centered = i - row.count / 2;
        const baseHeight = row.heightMin + Math.random() * (row.heightMax - row.heightMin);
        const width = (0.75 + Math.random() * 0.75) * row.scale;
        return {
          x: centered * row.widthStep + (Math.random() - 0.5) * 0.25,
          z: row.z + (Math.random() - 0.5) * 0.35,
          baseHeight,
          width,
          depth: row.depth + Math.random() * 0.45,
          hue: 252 + Math.random() * 46,
          band: (i + rowIndex) % 3,
          windowPhase: Math.random() * Math.PI * 2,
          rowIndex,
          roof: Math.random() > 0.55,
        };
      }),
    );
  }, []);

  const roofs = useMemo(
    () => buildings.filter((b) => b.roof).slice(0, ROOF_COUNT),
    [buildings],
  );

  useFrame((state, delta) => {
    const buildingMesh = buildingRef.current;
    const roofMesh = roofRef.current;
    if (!buildingMesh || !roofMesh) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    buildings.forEach((b, i) => {
      const bandDrive = b.band === 0 ? audio.bass : b.band === 1 ? audio.mid : audio.treble;
      const heightMult = 1 + bandDrive * 0.035 * intensity;
      const actualHeight = b.baseHeight * heightMult;
      const rowYOffset = b.rowIndex === 0 ? -2.05 : -2.25;

      dummy.position.set(b.x, rowYOffset + actualHeight / 2, b.z);
      dummy.scale.set(b.width, actualHeight, b.depth);
      dummy.updateMatrix();
      buildingMesh.setMatrixAt(i, dummy.matrix);

      const windowRhythm = 0.5 + Math.sin(t * 1.1 + b.windowPhase + audio.mid * 1.5) * 0.25;
      const depthDim = b.rowIndex === 0 ? 1 : 0.72;
      const lightness = (0.07 + windowRhythm * 0.08 + bandDrive * 0.11 + audio.rms * 0.06) * depthDim;
      color.setHSL(b.hue / 360, 0.55, lightness);
      buildingMesh.setColorAt(i, color);
    });

    roofs.forEach((b, i) => {
      const actualHeight = b.baseHeight * (1 + audio.rms * 0.02 * intensity);
      const rowYOffset = b.rowIndex === 0 ? -2.05 : -2.25;
      const isSpire = i % 3 === 0;
      dummy.position.set(b.x, rowYOffset + actualHeight + (isSpire ? 0.6 : 0.16), b.z);
      dummy.scale.set(
        isSpire ? 0.06 : b.width * 0.8,
        isSpire ? 1.2 + audio.treble * 0.4 : 0.22,
        isSpire ? 0.06 : b.depth * 0.75,
      );
      dummy.updateMatrix();
      roofMesh.setMatrixAt(i, dummy.matrix);
      color.setHSL((292 + audio.treble * 18) / 360, 0.75, 0.22 + audio.rms * 0.18);
      roofMesh.setColorAt(i, color);
    });

    buildingMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={buildingRef} args={[undefined, undefined, BUILDING_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#101124"
          emissive="#5b21b6"
          emissiveIntensity={0.42}
          roughness={0.38}
          metalness={0.58}
        />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, ROOF_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#18112f"
          emissive="#c026d3"
          emissiveIntensity={0.55}
          roughness={0.32}
          metalness={0.65}
        />
      </instancedMesh>
    </>
  );
}

function WindowGrid({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const count = 1200;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(Math.random() * 18);
      const col = Math.floor(Math.random() * 72);
      arr[i * 3] = (col - 36) * 0.58 + (Math.random() - 0.5) * 0.08;
      arr[i * 3 + 1] = -1.1 + row * 0.45 + (Math.random() - 0.5) * 0.04;
      arr[i * 3 + 2] = -9.75 - Math.random() * 4.2;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const mat = points.material as THREE.PointsMaterial;
    mat.size = (0.045 + audio.treble * 0.06) * intensity;
    mat.opacity = 0.28 + audio.mid * 0.26 + audio.rms * 0.22;
    mat.color.setHSL(0.78 + audio.treble * 0.08, 0.9, 0.66);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function MusicalWetStreet({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const audio = useAudioResponse(featuresRef);
  const smoothGlow = useRef(new SmoothValue(0.1));

  useFrame((_, delta) => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh) return;

    audio.update(delta);
    mesh.position.y = -2 + (audio.isBeatDrop ? audio.impact * 0.025 : 0);
    mat.emissiveIntensity = smoothGlow.current.update(0.18 + audio.bass * 0.45, delta);
    mat.roughness = 0.06 + audio.mid * 0.1;
    mat.emissive.setHSL(0.75 + audio.mid * 0.08, 0.78, 0.14);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -4]}>
      <planeGeometry args={[70, 35]} />
      <meshStandardMaterial
        ref={matRef}
        color="#070812"
        metalness={0.98}
        roughness={0.06}
        emissive="#3b0764"
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}

function MusicalNeonSigns({
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
      [-15, -8, -1, 7, 14].map((x, i) => ({
        x,
        y: 1.6 + Math.random() * 4.2,
        z: -8.8 - Math.random() * 1.4,
        hue: [310, 340, 195, 280, 32][i]!,
        band: i % 3,
        w: 1.6 + Math.random() * 1.5,
      })),
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    audio.update(delta);
    const t = state.clock.elapsedTime;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const sign = signs[i]!;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const drive = sign.band === 0 ? audio.bass : sign.band === 1 ? audio.mid : audio.treble;
      mat.opacity = Math.min(1, 0.32 + audio.rms * 0.32 + Math.sin(t * 1.4 + i) * 0.08 + drive * 0.28) * intensity;
      mat.color.setHSL(sign.hue / 360, 0.95, 0.5 + audio.rms * 0.12);
    });
  });

  return (
    <group ref={groupRef}>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <planeGeometry args={[s.w, 0.45]} />
          <meshBasicMaterial
            color={`hsl(${s.hue}, 95%, 55%)`}
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function TrafficTrails({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const audio = useAudioResponse(featuresRef);
  const trailCount = 220;

  const data = useMemo(() => {
    const positions = new Float32Array(trailCount * 3);
    const speeds = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = -1.82;
      positions[i * 3 + 2] = -5.8 + (i / trailCount) * 8.5;
      speeds[i] = 0.5 + Math.random() * 1.3;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;

    audio.update(delta);
    const pos = points.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const speedMult = (2.6 + audio.bass * 6 + audio.rms * 3) * intensity;

    for (let i = 0; i < trailCount; i++) {
      arr[i * 3] -= data.speeds[i]! * delta * speedMult;
      if (arr[i * 3] < -16) arr[i * 3] = 16 + Math.random() * 4;
    }
    pos.needsUpdate = true;

    const mat = points.material as THREE.PointsMaterial;
    mat.color.setHSL(Math.sin(state.clock.elapsedTime * 1.2) * 0.04, 0.85, 0.7);
    mat.size = 0.08 + audio.rms * 0.08;
    mat.opacity = 0.55 + audio.bass * 0.25;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function NeonMetropolisScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.city;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 1, 10], fov: 58 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.028);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        <AuroraSky featuresRef={featuresRef} theme={theme} />
        <ambientLight intensity={0.08} color="#a78bfa" />
        <pointLight position={[0, 5, 0]} intensity={1.5} color="#e879f9" distance={30} />
        <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={400} />
        <RealisticSkyline featuresRef={featuresRef} intensity={intensity} />
        <WindowGrid featuresRef={featuresRef} intensity={intensity} />
        <MusicalNeonSigns featuresRef={featuresRef} intensity={intensity} />
        <TrafficTrails featuresRef={featuresRef} intensity={intensity} />
        <MusicalWetStreet featuresRef={featuresRef} intensity={intensity} />
        <DreamyPostProcessing intensity={intensity} />
      </Suspense>
    </Canvas>
  );
}
