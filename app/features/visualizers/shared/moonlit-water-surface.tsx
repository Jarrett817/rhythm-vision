import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import type { AudioFeatures } from "~/lib/audio/types";
import { GLSL_CLASSIC_NOISE_3D } from "~/lib/glsl/noise-chunks";

const vertex = /* glsl */ `
${GLSL_CLASSIC_NOISE_3D}

uniform float uTime;
uniform float uBass;
uniform float uIntensity;

varying float vWave;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float n = cnoise(vec3(pos.x * 0.12 + uTime * 0.15, pos.z * 0.1, uTime * 0.1));
  float wave =
    n * 0.35 +
    sin(pos.x * 0.25 + uTime * 0.9) * 0.12 +
    sin(pos.z * 0.2 - uTime * 0.7) * 0.1;
  wave *= 1.0 + uBass * 1.4 * uIntensity;
  csm_Position = pos + vec3(0.0, wave, 0.0);
  vWave = wave;
  vWorldPos = (modelMatrix * vec4(csm_Position, 1.0)).xyz;
}
`;

const fragment = /* glsl */ `
uniform float uMid;
uniform float uTreble;
uniform vec3 uMoonDir;

varying float vWave;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vec3 deep = vec3(0.01, 0.04, 0.12);
  vec3 mid = vec3(0.03, 0.1, 0.22);
  vec3 shallow = vec3(0.06, 0.16, 0.28);
  float depth = smoothstep(0.0, 1.0, 1.0 - vUv.y);
  vec3 col = mix(deep, mid, depth * 0.7);
  col = mix(col, shallow, smoothstep(0.15, 0.85, vWave + 0.35) * 0.45);

  vec3 N = normalize(vec3(-dFdx(vWave), 1.0, -dFdz(vWave)));
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uMoonDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 120.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.55, 0.65, 0.85) * spec * (0.35 + uTreble * 0.5);
  col += vec3(0.08, 0.12, 0.2) * fresnel * 0.4;
  col += vec3(0.02, 0.04, 0.08) * uMid;

  csm_DiffuseColor = vec4(col, 0.97);
}
`;

export function MoonlitWaterSurface({
  featuresRef,
  intensity,
  moonDir = new THREE.Vector3(0.45, 0.75, -0.35),
}: {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
  moonDir?: THREE.Vector3;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshPhysicalMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uIntensity: { value: intensity },
      uMoonDir: { value: moonDir.clone() },
    }),
    [intensity, moonDir],
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[120, 120, 160, 160]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshPhysicalMaterial}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        roughness={0.04}
        metalness={0.65}
        color="#061018"
      />
    </mesh>
  );
}
