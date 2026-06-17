import { BlurFilter, Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import { createAudioResponse } from "~/lib/audio/response";

const INK_CLOUDS = 36;
const RAIN_LINES = 90;
const MIST_LAYERS = 7;
const PAPER_GRAIN = 320;

/** 固定伪随机，宣纸噪点不闪烁 */
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 贝塞尔山峦 — 避免折线峰 */
function drawOrganicRidge(
  g: Graphics,
  width: number,
  height: number,
  baseY: number,
  amp: number,
  seed: number,
  bassLift: number,
) {
  const pts: { x: number; y: number }[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const nx = i / steps;
    const x = nx * width;
    const wave =
      Math.sin(nx * Math.PI * 1.6 + seed) * 0.38 +
      Math.sin(nx * Math.PI * 4.2 + seed * 1.7) * 0.18 +
      Math.sin(nx * Math.PI * 7 + seed * 0.5) * 0.08;
    const y = baseY - (amp * wave + bassLift) * height;
    pts.push({ x, y });
  }

  g.moveTo(0, height);
  g.lineTo(0, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const curr = pts[i]!;
    const cpx = (prev.x + curr.x) * 0.5;
    const cpy = (prev.y + curr.y) * 0.5;
    g.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
  }
  g.lineTo(width, pts[pts.length - 1]!.y);
  g.lineTo(width, height);
  g.closePath();
}

/** 一团水墨 = 多瓣柔椭圆，而非正圆 */
function drawInkWash(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  seed: number,
) {
  const lobes = 4 + Math.floor(hash01(seed) * 3);
  for (let l = 0; l < lobes; l++) {
    const a = (l / lobes) * Math.PI * 2 + seed;
    const ox = Math.cos(a) * radius * 0.22;
    const oy = Math.sin(a) * radius * 0.18;
    const rx = radius * (0.55 + hash01(seed + l) * 0.45);
    const ry = radius * (0.4 + hash01(seed + l + 7) * 0.35);
    g.ellipse(cx + ox, cy + oy, rx, ry);
    g.fill({
      color: `hsl(215, ${22 + l * 3}%, ${28 + l * 4}%)`,
      alpha: alpha * (0.35 + hash01(seed + l * 2) * 0.25),
    });
  }
}

export function InkMistScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#d8dce8"
      setup={(app, featuresRef, intensityRef) => {
        const paper = new Graphics();
        const sky = new Graphics();
        const ridges = new Graphics();
        const ink = new Graphics();
        const mist = new Graphics();
        const rain = new Graphics();
        app.stage.addChild(paper, sky, ridges, ink, mist, rain);

        const inkBlur = new BlurFilter({ strength: 14, quality: 3 });
        const mistBlur = new BlurFilter({ strength: 22, quality: 2 });
        ink.filters = [inkBlur];
        mist.filters = [mistBlur];

        const audio = createAudioResponse(featuresRef);
        const clouds = Array.from({ length: INK_CLOUDS }, (_, i) => ({
          x: 0.08 + hash01(i * 3.1) * 0.84,
          y: 0.28 + hash01(i * 5.7) * 0.42,
          r: 0.06 + hash01(i * 2.3) * 0.14,
          vx: (hash01(i * 11) - 0.5) * 0.0006,
          vy: (hash01(i * 17) - 0.5) * 0.0003,
          phase: hash01(i * 19) * Math.PI * 2,
          seed: i * 1.37,
        }));
        const rainDrops = Array.from({ length: RAIN_LINES }, (_, i) => ({
          x: hash01(i * 2.1),
          y: hash01(i * 4.3),
          len: 0.008 + hash01(i * 6.1) * 0.02,
          speed: 0.3 + hash01(i * 8.2) * 0.5,
          drift: (hash01(i * 9.3) - 0.5) * 0.0002,
        }));
        let t = 0;

        const tick = () => {
          t += 0.014;
          audio.update(0.016);
          const { width, height } = app.renderer;
          const intensity = intensityRef.current;
          const { bass, mid, treble, rms } = featuresRef.current;
          const breath = 0.5 + rms * 1.2;

          paper.clear();
          sky.clear();
          ridges.clear();
          ink.clear();
          mist.clear();
          rain.clear();

          // 宣纸底色 + 纤维噪点
          paper.rect(0, 0, width, height);
          paper.fill({ color: 0xeae6dc, alpha: 1 });
          for (let i = 0; i < PAPER_GRAIN; i++) {
            const gx = hash01(i * 1.1) * width;
            const gy = hash01(i * 2.3) * height;
            paper.circle(gx, gy, 0.4 + hash01(i) * 0.6);
            paper.fill({ color: 0x9a9080, alpha: 0.025 });
          }

          // 天光渐变（偏亮水墨昼景）
          for (let i = 0; i < 10; i++) {
            const y0 = (i / 10) * height;
            const y1 = ((i + 1) / 10) * height;
            const light = 72 - i * 3.5 + mid * 8 * intensity;
            sky.rect(0, y0, width, y1 - y0 + 1);
            sky.fill({
              color: `hsl(210, ${16 + i}%, ${light}%)`,
              alpha: 0.55 + breath * 0.15,
            });
          }

          // 远山 — 三层有机山脊
          const ridgeColors = [0x8a9aaa, 0x6a7a8a, 0x4a5a6a];
          const ridgeAlphas = [0.35, 0.45, 0.55];
          for (let layer = 0; layer < 3; layer++) {
            const baseY = height * (0.48 + layer * 0.07);
            const amp = 0.14 - layer * 0.025;
            drawOrganicRidge(
              ridges,
              width,
              height,
              baseY,
              amp,
              layer * 2.1 + t * 0.02,
              bass * 0.02 * intensity * (1 - layer * 0.25),
            );
            ridges.fill({
              color: ridgeColors[layer]!,
              alpha: ridgeAlphas[layer]! + rms * 0.1,
            });
          }

          // 月与朦胧光晕
          const moonX = width * 0.68;
          const moonY = height * 0.14 + Math.sin(t * 0.2) * 5;
          const moonR = 26 + treble * 12 * intensity;
          for (let ring = 5; ring >= 0; ring--) {
            sky.ellipse(
              moonX,
              moonY,
              moonR * (1.2 + ring * 0.7),
              moonR * (0.9 + ring * 0.55),
            );
            sky.fill({
              color: 0xf0f4ff,
              alpha: (0.12 + rms * 0.1) / (ring + 1.2),
            });
          }
          sky.circle(moonX, moonY, moonR);
          sky.fill({ color: 0xf8faff, alpha: 0.85 + treble * 0.1 });
          sky.circle(moonX - moonR * 0.22, moonY - moonR * 0.12, moonR * 0.1);
          sky.fill({ color: 0xd8e4f4, alpha: 0.2 });

          // 水墨晕染（多层柔瓣 + 模糊）
          for (const c of clouds) {
            c.x += c.vx * (1 + mid * 2.5);
            c.y += c.vy * (1 + bass * 0.6);
            if (c.x < 0.04 || c.x > 0.96) c.vx *= -1;
            if (c.y < 0.22 || c.y > 0.82) c.vy *= -1;
            const px = c.x * width;
            const py = c.y * height;
            const r =
              c.r *
              width *
              (1 + Math.sin(t + c.phase) * 0.1 + bass * 0.12 * intensity);
            drawInkWash(
              ink,
              px,
              py,
              r,
              0.22 + rms * 0.2 + mid * 0.08,
              c.seed + t * 0.1,
            );
          }

          // 雾带 — 宽椭圆叠加，非硬边几何
          for (let layer = 0; layer < MIST_LAYERS; layer++) {
            const bandY =
              height * (0.2 + layer * 0.1) + Math.sin(t * 0.18 + layer) * 10;
            const drift = Math.sin(t * 0.12 + layer * 1.4) * width * 0.08;
            for (let puff = 0; puff < 4; puff++) {
              mist.ellipse(
                width * (0.2 + puff * 0.22) + drift,
                bandY + puff * 6,
                width * (0.18 + layer * 0.02),
                22 + layer * 8 + rms * 18 * intensity,
              );
              mist.fill({
                color: 0xf0f4fa,
                alpha: 0.08 + mid * 0.05,
              });
            }
          }

          // 细雨 — 极细、低对比
          for (const d of rainDrops) {
            d.y += d.speed * (0.45 + bass * 1.5) * intensity * 0.016;
            d.x += d.drift * (1 + mid);
            if (d.y > 1.02) {
              d.y = -0.01;
              d.x = Math.random();
            }
            const x = d.x * width;
            const y = d.y * height;
            const len = d.len * height;
            rain.moveTo(x, y);
            rain.lineTo(x + 0.8 + mid * 0.5, y + len);
            rain.stroke({
              color: 0x8aa0b8,
              width: 0.45,
              alpha: 0.18 + treble * 0.15,
            });
          }

          // 水面 — 柔和水平墨韵，非矩形色块
          for (let i = 0; i < 12; i++) {
            const wx = (i / 11) * width + Math.sin(t * 0.35 + i * 0.8) * 40;
            const wy = height * (0.82 + Math.sin(i + t * 0.2) * 0.02);
            ink.ellipse(wx, wy, 55 + bass * 35, 8 + rms * 10);
            ink.fill({
              color: `hsl(210, 28%, ${38 + i % 3 * 4}%)`,
              alpha: 0.12 + bass * 0.08,
            });
          }
          ink.rect(0, height * 0.8, width, height * 0.2);
          ink.fill({
            color: 0x5a7088,
            alpha: 0.08 + bass * 0.06,
          });
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
