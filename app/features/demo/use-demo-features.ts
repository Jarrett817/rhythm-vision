import { useEffect, useRef } from "react";
import type { AudioFeatures } from "~/lib/audio/types";
import { synthesizeDemoFeatures } from "~/lib/audio/demo-features";

/** 首页展示用：无音频时驱动可视化预览 */
export function useDemoFeatures(active = true) {
  const featuresRef = useRef<AudioFeatures>(synthesizeDemoFeatures(0));

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let t = 0;
    const tick = () => {
      t += 0.016;
      featuresRef.current = synthesizeDemoFeatures(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return featuresRef;
}
