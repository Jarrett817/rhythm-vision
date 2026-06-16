import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawLightRays,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

const DROP_COUNT = 200;
const MOTE_COUNT = 80;

export function InkMistScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.sad;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const drops = Array.from({ length: DROP_COUNT }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height,
          vy: 0.2 + Math.random() * 0.8,
          size: 3 + Math.random() * 12,
          alpha: 0.04 + Math.random() * 0.12,
        }));
        const motes = Array.from({ length: MOTE_COUNT }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 2.5,
        }));
        const bg = new Graphics();
        const fx = new Graphics();
        app.stage.addChild(bg, fx);
        let t = 0;

        const tick = () => {
          t += 0.016;
          const { width, height } = app.renderer;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { bass, treble, rms } = features;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[0]!, theme.blobs[2]!);
          drawAuroraBlobs(bg, width, height, t, features, theme, intensity);
          drawLightRays(bg, width, height, t, features, theme.accent, intensity * 0.6);

          for (const d of drops) {
            d.y += d.vy * (0.4 + bass * 2.5) * intensity;
            d.x += Math.sin(d.y * 0.008 + t) * 0.8;
            if (d.y > height + 30) {
              d.y = -20;
              d.x = Math.random() * width;
            }
            const hue = 210 + treble * 40;
            fx.circle(d.x, d.y, d.size * (1 + rms * 1.5));
            fx.fill({ color: `hsl(${hue}, 45%, ${40 + treble * 25}%)`, alpha: d.alpha });
            fx.circle(d.x, d.y, d.size * 0.4);
            fx.fill({ color: theme.accent, alpha: d.alpha * 0.5 });
          }

          drawSoftMotes(fx, motes, width, height, t, features, theme.accent, intensity);

          fx.rect(0, height * 0.75, width, height * 0.25);
          fx.fill({ color: theme.blobs[2], alpha: 0.25 + bass * 0.15 });
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
