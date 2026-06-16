import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { AuroraSky } from "~/features/visualizers/shared/aurora-sky";
import { SceneSparkles } from "~/features/visualizers/shared/flow-ribbons";
import { DreamyPostProcessing } from "~/features/visualizers/shared/dreamy-postprocessing";
import { SKY_THEMES } from "~/features/visualizers/shared/themes";

const waveVertex = /* glsl */ `
uniform float uTime;
uniform float uBass;
uniform float uIntensity;
varying float vWave;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float wave =
    sin(pos.x * 0.35 + uTime * 1.2) * 0.35 +
    sin(pos.z * 0.28 - uTime * 0.9) * 0.28 +
    sin((pos.x + pos.z) * 0.18 + uTime * 0.6) * 0.2;
  wave *= 1.0 + uBass * 2.5 * uIntensity;
  pos.y += wave;
  vWave = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const waveFragment = /* glsl */ `
uniform float uMid;
uniform float uTreble;
varying float vWave;
varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  vec3 deep = vec3(0.02, 0.15, 0.35);
  vec3 shallow = vec3(0.08, 0.45, 0.65);
  vec3 foam = vec3(0.7, 0.9, 1.0);
  vec3 col = mix(deep, shallow, depth * 0.85 + vWave * 0.3);
  col = mix(col, foam, smoothstep(0.25, 0.55, vWave + uTreble * 0.3) * 0.35);
  col += vec3(0.02, 0.04, 0.06) * uMid;
  gl_FragColor = vec4(col, 0.92);
}`;

function OceanSurface({
  featuresRef,
  intensity,
}: {
  featuresRef: React.RefObject<AudioFeatures>;
  intensity: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uIntensity: { value: intensity },
    }),
    [intensity],
  );

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    const f = featuresRef.current;
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uBass!.value = f.bass;
    mat.uniforms.uMid!.value = f.mid;
    mat.uniforms.uTreble!.value = f.treble;
    mat.uniforms.uIntensity!.value = intensity;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={waveVertex}
        fragmentShader={waveFragment}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SeaMist({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const arr = points.geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < 800; i++) {
      arr[i * 3]! += delta * (0.2 + featuresRef.current.mid);
      if (arr[i * 3]! > 20) arr[i * 3] = -20;
    }
    points.geometry.attributes.position!.needsUpdate = true;
    points.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#bae6fd" size={0.15} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function SunDisk({ featuresRef }: { featuresRef: React.RefObject<AudioFeatures> }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { rms } = featuresRef.current;
    mesh.scale.setScalar(2.5 + rms * 1.5);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + rms * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, 6, -25]}>
      <circleGeometry args={[2, 32]} />
      <meshBasicMaterial color="#fdba74" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export function OceanHorizonScene({
  featuresRef,
  intensity,
  onCanvasReady,
}: VisualizerProps) {
  const theme = SKY_THEMES.ocean;

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 2, 12], fov: 55 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.FogExp2(theme.fog, 0.015);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <AuroraSky featuresRef={featuresRef} theme={theme} />
      <ambientLight intensity={0.25} color="#7dd3fc" />
      <directionalLight position={[10, 8, -5]} intensity={1.2} color="#fdba74" />
      <SunDisk featuresRef={featuresRef} />
      <SceneSparkles featuresRef={featuresRef} color={theme.sparkle} count={300} />
      <OceanSurface featuresRef={featuresRef} intensity={intensity} />
      <SeaMist featuresRef={featuresRef} />
      <DreamyPostProcessing intensity={intensity} />
    </Canvas>
  );
}
