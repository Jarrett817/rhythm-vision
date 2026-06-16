import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

export function EmberCrackScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.angry;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const fx = new Graphics();
        app.stage.addChild(bg, fx);
        let t = 0;
        const shards = Array.from({ length: 32 }, (_, i) => ({
          angle: (i / 32) * Math.PI * 2,
          len: 60 + Math.random() * 160,
          wobble: Math.random() * 3,
        }));

        const tick = () => {
          t += 0.018;
          const { width, height } = app.renderer;
          const cx = width / 2;
          const cy = height / 2;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { bass, mid, rms } = features;
          const rage = (bass + mid + rms) * intensity;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[0]!, theme.bg);
          drawAuroraBlobs(bg, width, height, t, features, theme, intensity);

          fx.circle(cx, cy, 80 + rage * 120);
          fx.fill({ color: theme.blobs[1], alpha: 0.06 + rage * 0.12 });
          fx.circle(cx, cy, 40 + rage * 60);
          fx.fill({ color: theme.blobs[2], alpha: 0.08 + rage * 0.15 });

          for (const s of shards) {
            const len = s.len * (0.7 + rage * 2);
            const wobble = Math.sin(t * 7 + s.angle * s.wobble) * 20 * rage;
            const x1 = cx + Math.cos(s.angle) * 15;
            const y1 = cy + Math.sin(s.angle) * 15;
            const x2 = cx + Math.cos(s.angle + wobble * 0.012) * len;
            const y2 = cy + Math.sin(s.angle + wobble * 0.012) * len;
            fx.moveTo(x1, y1);
            fx.lineTo(x2, y2);
            fx.stroke({
              color: `hsl(${5 + rage * 12}, 90%, ${50 + rage * 22}%)`,
              width: 1 + rage * 4,
              alpha: 0.3 + rage * 0.55,
            });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
