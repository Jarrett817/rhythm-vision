import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export function DreamyPostProcessing({ intensity }: { intensity: number }) {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={2 + intensity * 1.8}
        luminanceThreshold={0.02}
        luminanceSmoothing={0.92}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0008 * intensity, 0.0008 * intensity]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={0.018} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette eskil={false} offset={0.18} darkness={0.55} />
    </EffectComposer>
  );
}
