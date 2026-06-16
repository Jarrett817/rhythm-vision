import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";

export function CyberStreetScene(props: VisualizerProps) {
  const theme = PIXI_THEMES.city;
  return (
    <PixiVisualizer
      {...props}
      bg={theme.bg}
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const fx = new Graphics();
        app.stage.addChild(bg, fx);
        const buildings = Array.from({ length: 28 }, (_, i) => ({
          x: (i / 28) * app.renderer.width,
          w: 20 + Math.random() * 35,
          h: 80 + Math.random() * 220,
          hue: 260 + Math.random() * 60,
          windows: Math.floor(3 + Math.random() * 8),
        }));
        let t = 0;

        const tick = () => {
          t += 0.016;
          const { width, height } = app.renderer;
          const features = featuresRef.current;
          const intensity = intensityRef.current;
          const { bass, mid, rms, treble } = features;
          const ground = height * 0.72;
          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[0]!, theme.bg);
          drawAuroraBlobs(bg, width, ground, t, features, theme, intensity * 0.5);

          // 建筑群
          for (const b of buildings) {
            const bx = (b.x + t * 8 * intensity) % (width + b.w) - b.w;
            bg.rect(bx, ground - b.h, b.w, b.h);
            bg.fill({ color: 0x0a0a14, alpha: 0.95 });
            bg.rect(bx, ground - b.h, b.w, 2);
            bg.fill({ color: theme.blobs[1], alpha: 0.3 + rms * 0.3 });

            for (let row = 0; row < b.windows; row++) {
              for (let col = 0; col < 3; col++) {
                const lit =
                  Math.sin(t * 3 + row + col + b.h) * 0.5 + 0.5 + mid * 0.5;
                if (lit > 0.55) {
                  const wx = bx + 4 + col * (b.w / 3.5);
                  const wy = ground - b.h + 10 + row * 18;
                  fx.rect(wx, wy, 5, 8);
                  fx.fill({
                    color: `hsl(${b.hue + treble * 30}, 90%, 65%)`,
                    alpha: lit * 0.6 * (0.5 + rms),
                  });
                }
              }
            }
          }

          // 湿地面反射
          fx.rect(0, ground, width, height - ground);
          fx.fill({ color: theme.blobs[0], alpha: 0.35 });
          for (let i = 0; i < 8; i++) {
            const lx = (width / 8) * i + Math.sin(t + i) * 20;
            fx.moveTo(lx, ground);
            fx.lineTo(lx + width * 0.08, height);
            fx.stroke({
              color: theme.accent,
              width: 2 + bass * 6,
              alpha: 0.04 + rms * 0.08,
            });
          }

          // 霓虹招牌
          const signs = [0.2, 0.45, 0.7].map((p, i) => ({
            x: width * p,
            hue: [300, 190, 330][i]!,
          }));
          for (const s of signs) {
            const pulse = 0.5 + Math.sin(t * 2 + s.x) * 0.5;
            fx.roundRect(s.x - 40, ground - 120, 80, 12, 4);
            fx.fill({
              color: `hsl(${s.hue}, 95%, 60%)`,
              alpha: (0.25 + pulse * 0.35) * (0.5 + rms * 2),
            });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
