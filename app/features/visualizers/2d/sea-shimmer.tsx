import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

export function SeaShimmerScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.ocean;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const sea = new Graphics();
        app.stage.addChild(bg, sea);
        const motes = Array.from({ length: 50 }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height * 0.5,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 2,
        }));
        let t = 0;

        const tick = () => {
          t += 0.014;
          const { width, height } = app.renderer;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { rms, mid, bass, treble } = features;
          const horizon = height * 0.42;
          bg.clear();
          sea.clear();

          // 天空渐变
          for (let i = 0; i < 6; i++) {
            const y0 = (horizon / 6) * i;
            bg.rect(0, y0, width, horizon / 6 + 1);
            bg.fill({
              color: i < 3 ? theme.blobs[1]! : theme.blobs[0]!,
              alpha: 0.25 + i * 0.05,
            });
          }
          drawAuroraBlobs(bg, width, horizon, t * 0.5, features, theme, intensity * 0.7);

          // 太阳
          const sunX = width * 0.5 + Math.sin(t * 0.1) * 20;
          const sunY = horizon * 0.35;
          bg.circle(sunX, sunY, 35 + rms * 25);
          bg.fill({ color: theme.blobs[1], alpha: 0.2 });
          bg.circle(sunX, sunY, 18 + rms * 10);
          bg.fill({ color: "#fde68a", alpha: 0.45 });

          // 海面多层波浪
          for (let layer = 0; layer < 8; layer++) {
            const yBase = horizon + layer * (height - horizon) / 8;
            sea.moveTo(0, height);
            for (let x = 0; x <= width; x += 5) {
              const wave =
                Math.sin(x * 0.004 + t * (0.6 + layer * 0.06)) *
                  (12 + mid * 25 + bass * 15) *
                  intensity +
                Math.sin(x * 0.009 - t * 0.4) * 6;
              sea.lineTo(x, yBase + wave);
            }
            sea.lineTo(width, height);
            sea.closePath();
            const hue = 200 + layer * 4 + treble * 15;
            sea.fill({
              color: `hsl(${hue}, 65%, ${18 + layer * 3}%)`,
              alpha: 0.35 + layer * 0.05,
            });
          }

          // 月光/日光水面反射
          sea.moveTo(sunX - 15, horizon);
          sea.lineTo(sunX, height);
          sea.lineTo(sunX + 15, horizon);
          sea.closePath();
          sea.fill({ color: theme.accent, alpha: 0.08 + rms * 0.15 });

          drawSoftMotes(sea, motes, width, height, t, features, theme.accent, intensity * 0.6);
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
