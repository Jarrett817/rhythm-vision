import { Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";
import { createAudioResponse } from "~/lib/audio/response";

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
        const audio = createAudioResponse(featuresRef);
        const motes = Array.from({ length: 72 }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height * 0.55,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 2.5,
        }));
        let t = 0;
        let ripple = 0;

        const tick = () => {
          t += 0.012;
          audio.update(0.016);
          const { width, height } = app.renderer;
          const intensity = intensityRef.current;
          const breath = 0.45 + audio.rms * 1.1;
          if (audio.impact > 0.2 || featuresRef.current.beat) {
            ripple = Math.max(ripple, audio.impact);
          }
          ripple *= 0.94;

          bg.clear();
          fx.clear();

          drawGradientWash(bg, width, height, theme.blobs[2]!, theme.blobs[0]!);
          drawAuroraBlobs(
            bg,
            width,
            height,
            t * (0.4 + audio.mid * 0.3),
            featuresRef.current,
            theme,
            intensity,
          );

          // 月影
          const moonX = width * 0.78;
          const moonY = height * 0.14 + Math.sin(t * 0.3) * 6;
          const moonR = 28 + audio.treble * 18 * intensity;
          bg.circle(moonX, moonY, moonR);
          bg.fill({ color: 0xe8f0ff, alpha: 0.12 + audio.treble * 0.25 });
          bg.circle(moonX, moonY, moonR * 1.8);
          bg.fill({ color: 0x8ab4ff, alpha: 0.04 + audio.rms * 0.08 });

          drawSoftMotes(
            fx,
            motes,
            width,
            height,
            t,
            featuresRef.current,
            theme.accent,
            intensity * (0.6 + audio.treble * 0.8),
          );

          for (let layer = 0; layer < 7; layer++) {
            const yBase = height * (0.28 + layer * 0.09);
            const amp =
              (28 + audio.bass * 65 + ripple * 40 * (1 - layer * 0.12)) *
              intensity *
              breath;
            const speed = 0.28 + layer * 0.07 + audio.mid * 0.55;
            fx.moveTo(0, height);
            for (let x = 0; x <= width; x += 6) {
              const wave =
                Math.sin(x * 0.003 + t * speed) * amp +
                Math.sin(x * 0.007 - t * 0.22 + layer) * (10 + audio.mid * 8) +
                Math.cos(x * 0.002 + t * 0.08 + audio.bass) * 6;
              fx.lineTo(x, yBase + wave);
            }
            fx.lineTo(width, height);
            fx.closePath();
            const hue = 210 + layer * 8 + audio.treble * 35 + audio.mid * 12;
            fx.fill({
              color: `hsl(${hue}, ${48 + audio.treble * 20}%, ${20 + layer * 5}%)`,
              alpha: 0.16 + layer * 0.06 + audio.rms * 0.08,
            });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
