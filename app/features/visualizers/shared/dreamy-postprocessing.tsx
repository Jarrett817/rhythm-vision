import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export function DreamyPostProcessing({ intensity }: { intensity: number }) {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.6 + intensity * 1.2}
        luminanceThreshold={0.04}
        luminanceSmoothing={0.95}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0006 * intensity, 0.0006 * intensity]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette eskil={false} offset={0.25} darkness={0.65} />
    </EffectComposer>
  );
}
