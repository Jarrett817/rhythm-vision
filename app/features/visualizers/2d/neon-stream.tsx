import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

const STREAK_COUNT = 90;

export function NeonStreamScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.fast;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const streaks = Array.from({ length: STREAK_COUNT }, () => ({
          y: Math.random() * app.renderer.height,
          speed: 5 + Math.random() * 12,
          len: 50 + Math.random() * 140,
          hue: 170 + Math.random() * 140,
          xOff: Math.random() * Math.PI * 2,
        }));
        const motes = Array.from({ length: 50 }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 2,
        }));
        const bg = new Graphics();
        const fx = new Graphics();
        app.stage.addChild(bg, fx);

        const tick = () => {
          const t = performance.now() * 0.001;
          const { width, height } = app.renderer;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { bass, mid, treble, rms } = features;
          const boost = (1 + bass * 2.5 + rms) * intensity;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[1]!, theme.blobs[0]!);
          drawAuroraBlobs(bg, width, height, t, features, theme, intensity);
          drawSoftMotes(fx, motes, width, height, t, features, theme.accent, intensity);

          for (const s of streaks) {
            s.y += s.speed * boost * 0.35;
            if (s.y > height + 30) {
              s.y = -30;
              s.hue = 170 + Math.random() * 140;
            }
            const x =
              width * (0.15 + mid * 0.7) +
              Math.sin(s.y * 0.015 + s.xOff + t) * (60 + treble * 40);
            fx.moveTo(x, s.y);
            fx.lineTo(x + s.len * boost, s.y);
            fx.stroke({
              color: `hsl(${s.hue + treble * 50}, 95%, 62%)`,
              width: 1.2 + bass * 4,
              alpha: 0.35 + rms * 0.65,
            });
            fx.circle(x + s.len * boost, s.y, 2 + bass * 3);
            fx.fill({ color: theme.accent, alpha: 0.3 + rms * 0.5 });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
