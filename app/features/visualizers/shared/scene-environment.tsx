import { Environment } from "@react-three/drei";
import { Suspense } from "react";

/** Poly Haven CC0 HDR — 1k 体积适中，用于环境光与反射 */
const HDRI = {
  night: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/moonless_golf_1k.hdr",
  dawn: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr",
  sunset:
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr",
  city: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dam_bridge_1k.hdr",
  studio:
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
} as const;

export type SceneHdri = keyof typeof HDRI;

export function SceneEnvironment({
  variant,
  intensity = 0.55,
}: {
  variant: SceneHdri;
  intensity?: number;
}) {
  return (
    <Suspense fallback={null}>
      <Environment
        files={HDRI[variant]}
        background={false}
        environmentIntensity={intensity}
      />
    </Suspense>
  );
}
