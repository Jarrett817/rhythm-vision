import { BlurFilter, Graphics } from "pixi.js";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import { createAudioResponse } from "~/lib/audio/response";

// ============================================================
// 锁定的水墨调色板 —— 禁止 HSL 转色
//   宣纸暖白 / 淡冷灰蓝雾 / 深墨 / 月光冷白
// ============================================================
const PAPER_WARM = 0xece5d6;      // 宣纸底
const PAPER_FIBER = 0x8a7f68;     // 宣纸纤维暗点
const MIST_COOL = 0xd6dde5;       // 冷雾灰蓝
const INK_DEEP = 0x2a3540;        // 深墨
const INK_MID = 0x4a5867;         // 中墨
const INK_FAR = 0x8a95a3;         // 远山淡墨
const MOON_CORE = 0xf6f2e6;       // 月芯（暖白）
const MOON_HALO = 0xe4e8ee;       // 月晕（冷白）
const WATER_INK = 0x3c4a5a;       // 水墨韵

const INK_WASHES = 9;             // 中景墨晕 —— 少而大
const MIST_BANDS = 5;             // 雾带层数
const MIST_PUFFS = 6;             // 每层雾中的柔团
const RIDGE_LAYERS = 4;           // 远山层数
const PAPER_GRAIN = 220;          // 宣纸静态纤维点
const DRIZZLE = 40;               // 极淡的斜雨（treble 驱动）
const WATER_STROKES = 10;         // 水面横向墨韵

/** 固定伪随机 */
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 有机远山：贝塞尔起伏 + 柔和填充；不含硬边折线 */
function drawOrganicRidge(
  g: Graphics,
  width: number,
  height: number,
  baseY: number,
  amp: number,
  seed: number,
  breathLift: number,
) {
  const steps = 18;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const nx = i / steps;
    const wave =
      Math.sin(nx * Math.PI * 1.4 + seed) * 0.42 +
      Math.sin(nx * Math.PI * 3.7 + seed * 1.9) * 0.22 +
      Math.sin(nx * Math.PI * 8.1 + seed * 0.4) * 0.08;
    const y = baseY - (amp * wave + breathLift) * height;
    pts.push({ x: nx * width, y });
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

/** 一团水墨 = 多瓣柔椭圆叠加，交由 BlurFilter 完成晕染 */
function drawInkWash(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  seed: number,
  color: number,
) {
  const lobes = 5;
  for (let l = 0; l < lobes; l++) {
    const a = (l / lobes) * Math.PI * 2 + seed;
    const ox = Math.cos(a) * radius * 0.28;
    const oy = Math.sin(a) * radius * 0.20;
    const rx = radius * (0.55 + hash01(seed + l) * 0.4);
    const ry = radius * (0.42 + hash01(seed + l + 7) * 0.3);
    g.ellipse(cx + ox, cy + oy, rx, ry);
    g.fill({
      color,
      alpha: alpha * (0.35 + hash01(seed + l * 2) * 0.35),
    });
  }
}

export function InkMistScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#ece5d6"
      setup={(app, featuresRef, intensityRef) => {
        // ---- 图层顺序：宣纸 → 天光 → 远山 → 雾带 → 水墨晕 → 月 → 细雨 → 水面 ----
        const paper = new Graphics();
        const sky = new Graphics();
        const ridges = new Graphics();
        const mist = new Graphics();
        const ink = new Graphics();
        const moon = new Graphics();
        const drizzle = new Graphics();
        const water = new Graphics();
        app.stage.addChild(paper, sky, ridges, mist, ink, moon, drizzle, water);

        // 分层模糊 —— 墨晕/雾更柔，远山与水面留一点边缘感
        ink.filters = [new BlurFilter({ strength: 22, quality: 3 })];
        mist.filters = [new BlurFilter({ strength: 28, quality: 2 })];
        moon.filters = [new BlurFilter({ strength: 8, quality: 2 })];
        water.filters = [new BlurFilter({ strength: 6, quality: 2 })];

        const audio = createAudioResponse(featuresRef);

        // ---- 静态预生成 —— 每帧不再重算伪随机形状 ----
        // 墨晕：分布在中景，避开正中央（留给歌手），偏中下与两侧
        const washes = Array.from({ length: INK_WASHES }, (_, i) => {
          const bias = i / (INK_WASHES - 1);
          // 沿水平方向分布，中央 (0.4~0.6) 概率低
          let nx = hash01(i * 3.11);
          if (nx > 0.4 && nx < 0.6) nx = nx < 0.5 ? nx - 0.15 : nx + 0.15;
          return {
            baseX: 0.08 + nx * 0.84,
            baseY: 0.42 + hash01(i * 5.71) * 0.36,
            r: 0.09 + hash01(i * 2.31) * 0.14,
            phase: hash01(i * 19) * Math.PI * 2,
            seed: i * 1.37 + 0.7,
            depth: bias,
          };
        });

        const mistPuffs = Array.from(
          { length: MIST_BANDS * MIST_PUFFS },
          (_, i) => ({
            band: Math.floor(i / MIST_PUFFS),
            slot: i % MIST_PUFFS,
            phase: hash01(i * 7.13) * Math.PI * 2,
            xJitter: (hash01(i * 3.19) - 0.5) * 0.12,
            yJitter: (hash01(i * 9.27) - 0.5) * 0.03,
          }),
        );

        const drops = Array.from({ length: DRIZZLE }, (_, i) => ({
          x: hash01(i * 2.11),
          y: hash01(i * 4.31),
          len: 0.014 + hash01(i * 6.11) * 0.022,
          speed: 0.35 + hash01(i * 8.21) * 0.4,
          slant: 0.4 + hash01(i * 5.9) * 0.5,
        }));

        // 宣纸底 + 纤维为静态层
        let paperW = 0;
        let paperH = 0;
        const drawPaper = (width: number, height: number) => {
          paper.clear();
          paper.rect(0, 0, width, height);
          paper.fill({ color: PAPER_WARM, alpha: 1 });
          // 顶部一层极淡冷灰 —— 制造"天空"的呼吸感,而不是纯平底色
          for (let i = 0; i < 12; i++) {
            const y0 = (i / 12) * height * 0.6;
            const y1 = ((i + 1) / 12) * height * 0.6;
            paper.rect(0, y0, width, y1 - y0 + 1);
            paper.fill({
              color: MIST_COOL,
              alpha: 0.18 * (1 - i / 12),
            });
          }
          // 底部往深墨方向压色 —— 锚定画面
          for (let i = 0; i < 8; i++) {
            const y0 = height * (0.75 + i * 0.03);
            paper.rect(0, y0, width, height - y0 + 1);
            paper.fill({
              color: WATER_INK,
              alpha: 0.04 + i * 0.012,
            });
          }
          // 宣纸纤维（静态）
          for (let i = 0; i < PAPER_GRAIN; i++) {
            const gx = hash01(i * 1.13) * width;
            const gy = hash01(i * 2.31) * height;
            paper.circle(gx, gy, 0.4 + hash01(i) * 0.7);
            paper.fill({ color: PAPER_FIBER, alpha: 0.03 });
          }
          paperW = width;
          paperH = height;
        };

        let t = 0;

        const tick = (ticker: { deltaMS: number }) => {
          const dt = Math.min(ticker.deltaMS, 40) / 1000;
          audio.update(dt);
          const { width, height } = app.renderer;
          const intensity = intensityRef.current;
          const bass = audio.bass;
          const mid = audio.mid;
          const treble = audio.treble;
          const rms = audio.rms;

          // 时间步：静默时接近恒定慢流；只在有能量时才略加速
          t += dt * (0.12 + rms * 0.45);

          if (width !== paperW || height !== paperH) drawPaper(width, height);
          sky.clear();
          ridges.clear();
          mist.clear();
          ink.clear();
          moon.clear();
          drizzle.clear();
          water.clear();

          // 呼吸系数 —— 全场慢呼吸,静默时也有极小起伏
          const breath = 0.5 + Math.sin(t * 0.5) * 0.08 + rms * 0.25;

          // ==================================================
          // 天光 —— 顶部一层极淡冷雾光带（rms 控制呼吸,不闪）
          // ==================================================
          for (let i = 0; i < 5; i++) {
            const y0 = (i / 5) * height * 0.55;
            const y1 = ((i + 1) / 5) * height * 0.55;
            sky.rect(0, y0, width, y1 - y0 + 1);
            sky.fill({
              color: MIST_COOL,
              alpha: (0.10 - i * 0.015) * breath,
            });
          }

          // ==================================================
          // 远山 —— 四层剪影，远淡近深；只随 rms 微微起伏，不跟拍
          // ==================================================
          const ridgeColors = [INK_FAR, INK_FAR, INK_MID, INK_DEEP];
          const ridgeAlphas = [0.28, 0.38, 0.55, 0.75];
          const ridgeBaseYs = [0.50, 0.55, 0.62, 0.70];
          const ridgeAmps = [0.14, 0.10, 0.075, 0.055];
          for (let layer = 0; layer < RIDGE_LAYERS; layer++) {
            const bassLift = rms * 0.008 * (1 - layer / RIDGE_LAYERS);
            drawOrganicRidge(
              ridges,
              width,
              height,
              height * ridgeBaseYs[layer]!,
              ridgeAmps[layer]!,
              layer * 2.7 + 1.3,
              bassLift,
            );
            ridges.fill({
              color: ridgeColors[layer]!,
              alpha: ridgeAlphas[layer]!,
            });
          }

          // ==================================================
          // 雾带 —— mid（人声）驱动缓慢横向漂移
          // ==================================================
          for (const p of mistPuffs) {
            const layer = p.band;
            const bandY = height * (0.32 + layer * 0.09) + p.yJitter * height;
            // 漂移: 时间基础 + mid 微弱增速
            const drift =
              Math.sin(t * 0.15 + p.phase) * width * (0.06 + mid * 0.05);
            const px =
              width * ((p.slot / (MIST_PUFFS - 1)) * 0.9 + 0.05) +
              drift +
              p.xJitter * width;
            const rx = width * (0.16 + layer * 0.025);
            const ry =
              20 + layer * 10 + rms * 14 + Math.sin(t * 0.4 + p.phase) * 4;
            mist.ellipse(px, bandY, rx, ry);
            mist.fill({
              color: layer < 2 ? MIST_COOL : PAPER_WARM,
              alpha: 0.08 + mid * 0.06 + breath * 0.02,
            });
          }

          // ==================================================
          // 中景水墨晕 —— mid 驱动缓慢流动 + 呼吸;不跟拍
          // ==================================================
          for (const w of washes) {
            const flowX =
              Math.sin(t * 0.22 + w.phase) * (0.02 + mid * 0.02);
            const flowY =
              Math.cos(t * 0.17 + w.phase * 1.3) * (0.012 + mid * 0.01);
            const px = (w.baseX + flowX) * width;
            const py = (w.baseY + flowY) * height;
            const r =
              w.r *
              width *
              (0.9 + Math.sin(t * 0.35 + w.phase) * 0.08 + rms * 0.15);
            // 越深的墨用越深的色 —— depth 越大越靠近深墨
            const c = w.depth > 0.6 ? INK_DEEP : w.depth > 0.3 ? INK_MID : INK_FAR;
            drawInkWash(
              ink,
              px,
              py,
              r,
              0.14 + rms * 0.12 + mid * 0.06,
              w.seed,
              c,
            );
          }

          // ==================================================
          // 月 —— 静态构图,只随 treble 微微闪耀（克制）
          // ==================================================
          const moonX = width * 0.72;
          const moonY = height * 0.16;
          const moonR = Math.min(width, height) * 0.045;
          // 大晕
          for (let ring = 5; ring >= 1; ring--) {
            const rr = moonR * (1.4 + ring * 0.9);
            moon.circle(moonX, moonY, rr);
            moon.fill({
              color: MOON_HALO,
              alpha: (0.09 + treble * 0.05) / (ring + 0.5),
            });
          }
          // 月芯
          moon.circle(moonX, moonY, moonR);
          moon.fill({ color: MOON_CORE, alpha: 0.85 + treble * 0.10 });
          // 月晕内圈
          moon.circle(moonX, moonY, moonR * 1.35);
          moon.fill({ color: MOON_HALO, alpha: 0.20 });

          // ==================================================
          // 细雨 —— treble 驱动;静默时几乎不动
          // ==================================================
          const drizzleAlpha = 0.06 + treble * 0.22 * intensity;
          if (drizzleAlpha > 0.07) {
            for (const d of drops) {
              d.y += d.speed * dt * (0.18 + treble * 0.9) * intensity;
              if (d.y > 1.05) {
                d.y = -0.02;
                d.x = hash01((d.x + t) * 0.53);
              }
              const x = d.x * width;
              const y = d.y * height;
              const len = d.len * height * (0.6 + treble * 0.8);
              drizzle.moveTo(x, y);
              drizzle.lineTo(x + d.slant * 3.5, y + len);
              drizzle.stroke({
                color: INK_MID,
                width: 0.6,
                alpha: drizzleAlpha,
              });
            }
          }

          // ==================================================
          // 水面 —— 底部横向墨韵,bass 驱动波动
          //   （bass 是鼓/结构 —— 水的重心与冲击）
          // ==================================================
          const waterTop = height * 0.80;
          water.rect(0, waterTop, width, height - waterTop);
          water.fill({ color: WATER_INK, alpha: 0.12 });

          for (let i = 0; i < WATER_STROKES; i++) {
            const yy =
              waterTop +
              (i / (WATER_STROKES - 1)) * (height - waterTop) * 0.95 +
              Math.sin(t * 0.5 + i * 0.7) * 3;
            const stretch = width * (0.35 + Math.sin(t * 0.3 + i) * 0.1);
            const wx = width * 0.5 + Math.sin(t * 0.25 + i * 1.1) * width * 0.25;
            water.ellipse(
              wx,
              yy,
              stretch,
              3 + bass * 8 + Math.sin(t + i) * 1.2,
            );
            water.fill({
              color: i > WATER_STROKES * 0.55 ? INK_DEEP : INK_MID,
              alpha: 0.10 + bass * 0.10,
            });
          }
          // 月在水中的倒影（低对比）—— 只在有 rms 时若隐若现
          const reflAlpha = 0.10 + rms * 0.18;
          for (let i = 0; i < 4; i++) {
            const rry = waterTop + 8 + i * 12 + Math.sin(t * 0.6 + i) * 3;
            water.ellipse(
              moonX + Math.sin(t * 0.4 + i) * 6,
              rry,
              moonR * (2.4 - i * 0.4),
              1.6 + Math.sin(t + i * 2) * 0.5,
            );
            water.fill({
              color: MOON_HALO,
              alpha: reflAlpha * (1 - i * 0.22),
            });
          }
        };

        app.ticker.add(tick);
        return () => app.ticker.remove(tick);
      }}
    />
  );
}
