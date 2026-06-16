import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

export function GentleTideScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.slow;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const fx = new Graphics();
        app.stage.addChild(bg, fx);
        const motes = Array.from({ length: 60 }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height,
          phase: Math.random() * Math.PI * 2,
          size: 1.5 + Math.random() * 2,
        }));
        let t = 0;

        const tick = () => {
          t += 0.012;
          const { width, height } = app.renderer;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { rms, mid, treble } = features;
          const breath = 0.5 + rms * 0.9;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[2]!, theme.blobs[0]!);
          drawAuroraBlobs(bg, width, height, t * 0.6, features, theme, intensity);
          drawSoftMotes(fx, motes, width, height, t, features, theme.accent, intensity * 0.8);

          for (let layer = 0; layer < 7; layer++) {
            const yBase = height * (0.28 + layer * 0.09);
            fx.moveTo(0, height);
            for (let x = 0; x <= width; x += 6) {
              const wave =
                Math.sin(x * 0.003 + t * (0.35 + layer * 0.08)) *
                  (35 + mid * 50) *
                  intensity *
                  breath +
                Math.sin(x * 0.007 - t * 0.25 + layer) * 12 +
                Math.cos(x * 0.002 + t * 0.1) * 8;
              fx.lineTo(x, yBase + wave);
            }
            fx.lineTo(width, height);
            fx.closePath();
            const hue = 215 + layer * 10 + treble * 25;
            fx.fill({
              color: `hsl(${hue}, 55%, ${22 + layer * 5}%)`,
              alpha: 0.18 + layer * 0.06,
            });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
