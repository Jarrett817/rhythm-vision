import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import CSM from "three-custom-shader-material/vanilla";
import type { AudioFeatures } from "~/lib/audio/types";
import type { SkyTheme } from "~/features/visualizers/shared/themes";
import { GLSL_CLASSIC_NOISE_2D } from "~/lib/glsl/noise-chunks";

const auroraVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
}
`;

const auroraFragment = /* glsl */ `
${GLSL_CLASSIC_NOISE_2D}

uniform float uTime;
uniform float uEnergy;
uniform float uMid;
uniform float uTreble;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float n1 = cnoise(uv * 3.5 + vec2(uTime * 0.08, -uTime * 0.05));
  float n2 = cnoise(uv * 5.0 + vec2(-uTime * 0.06, uTime * 0.09));
  float band1 = sin(uv.x * 5.0 + uTime * 0.35 + n1 * 1.2) * 0.5 + 0.5;
  float band2 = sin(uv.y * 4.0 - uTime * 0.22 + n2 * 1.4) * 0.5 + 0.5;
  float swirl = sin((uv.x * 2.0 + uv.y * 3.0) + uTime * 0.18 + n1 * 0.8) * 0.5 + 0.5;
  vec3 col = mix(uColor1, uColor2, band1);
  col = mix(col, uColor3, band2 * (0.35 + uEnergy * 0.65));
  col += swirl * uTreble * 0.18;
  col *= 0.85 + uMid * 0.3;
  csm_FragColor = vec4(col, 1.0);
}
`;

export function AuroraSky({
  featuresRef,
  theme,
}: {
  featuresRef: RefObject<AudioFeatures>;
  theme: SkyTheme;
}) {
  const matRef = useRef<CSM<typeof THREE.MeshBasicMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uColor1: { value: new THREE.Color(theme.color1) },
      uColor2: { value: new THREE.Color(theme.color2) },
      uColor3: { value: new THREE.Color(theme.color3) },
    }),
    [theme],
  );

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    const f = featuresRef.current;
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uEnergy!.value = f.rms;
    mat.uniforms.uMid!.value = f.mid;
    mat.uniforms.uTreble!.value = f.treble;
  });

  return (
    <mesh position={[0, 2, -35]} rotation={[0.1, 0, 0]}>
      <planeGeometry args={[120, 70]} />
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={THREE.MeshBasicMaterial}
        vertexShader={auroraVertex}
        fragmentShader={auroraFragment}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}
