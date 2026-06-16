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

const SPARKLE_COUNT = 250;

export function SunDustScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.joyful;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const particles = Array.from({ length: SPARKLE_COUNT }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 4,
          orbit: 20 + Math.random() * 40,
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
          const { mid, treble, rms } = features;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[1]!, theme.blobs[0]!);
          drawAuroraBlobs(bg, width, height, t, features, theme, intensity);
          drawLightRays(bg, width, height, t, features, theme.accent, intensity);

          for (const p of particles) {
            const pulse = 0.5 + Math.sin(t * 2.5 + p.phase) * 0.5;
            const px =
              (p.x + Math.sin(t * 0.8 + p.phase) * p.orbit * intensity * (0.5 + mid)) %
              width;
            const py =
              (p.y + Math.cos(t * 0.5 + p.phase) * p.orbit * 0.5) % height;
            const alpha = (0.15 + pulse * 0.55) * (0.4 + rms * 2.5);
            fx.circle(px, py, p.size * (2 + pulse));
            fx.fill({ color: theme.blobs[1], alpha: alpha * 0.3 });
            fx.circle(px, py, p.size * (0.8 + pulse * 0.5));
            fx.fill({
              color: `hsl(${38 + treble * 25}, 95%, ${68 + mid * 12}%)`,
              alpha,
            });
          }

          drawSoftMotes(
            fx,
            particles.slice(0, 40).map((p) => ({ ...p, size: p.size * 2 })),
            width,
            height,
            t,
            features,
            theme.accent,
            intensity,
          );
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
