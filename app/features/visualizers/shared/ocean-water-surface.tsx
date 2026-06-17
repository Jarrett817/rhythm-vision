import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import type { AudioFeatures } from "~/lib/audio/types";
import { GLSL_CLASSIC_NOISE_3D } from "~/lib/glsl/noise-chunks";

const oceanVertex = /* glsl */ `
${GLSL_CLASSIC_NOISE_3D}

uniform float uTime;
uniform float uBass;
uniform float uIntensity;

varying float vWave;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float n = cnoise(vec3(pos.x * 0.18 + uTime * 0.2, pos.z * 0.16, uTime * 0.14));
  float wave =
    n * 0.75 +
    sin(pos.x * 0.32 + uTime * 1.1) * 0.22 +
    sin(pos.z * 0.26 - uTime * 0.85) * 0.18;
  wave *= 1.0 + uBass * 2.2 * uIntensity;
  csm_Position = pos + vec3(0.0, wave, 0.0);
  vWave = wave;
}
`;

const oceanFragment = /* glsl */ `
uniform float uMid;
uniform float uTreble;

varying float vWave;
varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  vec3 deep = vec3(0.02, 0.14, 0.34);
  vec3 shallow = vec3(0.07, 0.46, 0.66);
  vec3 foam = vec3(0.62, 0.86, 0.96);
  vec3 col = mix(deep, shallow, depth * 0.74 + vWave * 0.18);
  col = mix(col, foam, smoothstep(0.32, 0.72, vWave + uTreble * 0.18) * 0.18);
  col += vec3(0.015, 0.035, 0.045) * uMid;
  csm_DiffuseColor = vec4(col, 0.94);
}
`;

export function OceanWaterSurface({
  featuresRef,
  intensity,
}: {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshPhysicalMaterial>>(null);
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
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshPhysicalMaterial}
        vertexShader={oceanVertex}
        fragmentShader={oceanFragment}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        roughness={0.22}
        metalness={0}
        clearcoat={0.65}
        clearcoatRoughness={0.2}
        ior={1.333}
        transmission={0.08}
        color="#0c4a6e"
      />
    </mesh>
  );
}
