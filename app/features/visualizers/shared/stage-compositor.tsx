import CustomShaderMaterial from "three-custom-shader-material";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import type { RefObject } from "react";
import type { AudioFeatures } from "~/lib/audio/types";
import { useAudioResponse } from "~/features/visualizers/shared/audio-response";

/**
 * 舞台中央避位遮罩 —— 顶流演唱会VJ硬性规范
 * 歌手站立的中央区域，垂直椭圆暗化遮罩，避免大屏高密度视觉遮挡艺人主体
 * 必须放在 EffectComposer/DreamyPostProcessing 之前、场景内容之后
 */
export function StageCenterMask() {
  return (
    <mesh position={[0, 0, -0.3]} renderOrder={998}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * 舞台边缘 vignette 暗角 —— 比DreamyPostProcessing更宽的边角色衰，
 * 强制观众视线收拢到舞台中心（歌手位置）
 */
export function StageVignette({
  featuresRef,
}: {
  featuresRef: RefObject<AudioFeatures>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const audio = useAudioResponse(featuresRef);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBrightness: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    audio.update(delta);
    if (!matRef.current) return;
    uniforms.uTime.value += delta;
    // drop时稍微提亮暗角（让画面更开阔），其他时间收紧
    const target = 0.55 - audio.release * 0.15 + audio.rms * 0.05;
    uniforms.uBrightness.value += (target - uniforms.uBrightness.value) * Math.min(1, delta * 2);
    matRef.current.uniforms.uTime.value = uniforms.uTime.value;
    matRef.current.uniforms.uBrightness.value = uniforms.uBrightness.value;
  });

  return (
    <mesh position={[0, 0, -0.2]} renderOrder={999}>
      <planeGeometry args={[200, 200]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthTest={false}
        depthWrite={false}
        uniforms={{
          uTime: uniforms.uTime,
          uBrightness: uniforms.uBrightness,
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uBrightness;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - 0.5;
            // 垂直椭圆 vignette：更宽的横向衰减（歌手站立区暗）
            float r = length(p * vec2(1.0, 1.6));
            float vig = smoothstep(0.25, 1.0, r);
            // 中央歌手区域暗化（垂直椭圆）
            float center = length(p * vec2(2.2, 1.2));
            float centerDark = smoothstep(0.12, 0.45, center);
            float alpha = vig * 0.85 * uBrightness + (1.0 - centerDark) * 0.25;
            gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * 0.6);
          }
        `}
      />
    </mesh>
  );
}

/**
 * 舞台地屏反射光 —— 模拟演唱会地屏向上打光的柔光
 * 在场景底部画一个暖/冷色渐变光带，从地面向中部渐变衰减
 */
export function StageFloorGlow({
  featuresRef,
  color = "#1a1030",
}: {
  featuresRef: RefObject<AudioFeatures>;
  color?: string;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const audio = useAudioResponse(featuresRef);
  const baseColor = useMemo(() => new THREE.Color(color), [color]);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: 0 },
  }), [color]);

  useFrame((_, delta) => {
    audio.update(delta);
    if (!matRef.current) return;
    const target = 0.3 + audio.release * 0.4 + audio.rms * 0.2;
    uniforms.uIntensity.value += (target - uniforms.uIntensity.value) * Math.min(1, delta * 2);
    matRef.current.uniforms.uColor.value.lerp(baseColor, 0.02);
    matRef.current.uniforms.uIntensity.value = uniforms.uIntensity.value;
  });

  return (
    <mesh position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
      <planeGeometry args={[60, 40]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        uniforms={{
          uColor: uniforms.uColor,
          uIntensity: uniforms.uIntensity,
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          void main() {
            // 从画面底部向上渐变衰减
            float grad = smoothstep(0.0, 0.7, vUv.y);
            float center = smoothstep(0.2, 0.5, abs(vUv.x - 0.5));
            float alpha = (1.0 - grad) * (1.0 - center * 0.6) * uIntensity * 0.25;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </mesh>
  );
}
