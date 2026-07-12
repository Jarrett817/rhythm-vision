import { Container, BlurFilter, Graphics, type Filter } from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import {
  drawAuroraBlobs,
  drawGradientWash,
  drawSoftMotes,
} from "~/features/visualizers/shared/pixi-atmosphere";
import { PIXI_THEMES } from "~/features/visualizers/shared/themes";
import { createAudioResponse } from "~/lib/audio/response";

// —— 锁定 3 色调色板：深夜海潮 · 月下水纹 ——
// 禁止运行时 hue 漂移；所有色相都从这里派生
const DEEP_NAVY = "#0a1428"; // 天幕/夜空基调
const TIDE_INDIGO = "#1e2a5c"; // 中层海面/水纹主色
const MOON_SILVER = "#c9d6f2"; // 月光/浪尖高光

// 静态噪点数量（预生成一次，不在每帧创建）
const STAR_COUNT = 90;

// 主题只用于调用 shared helper（保留统一 look）
const THEME = PIXI_THEMES.slow;

export function GentleTideScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg={DEEP_NAVY}
      setup={(app, featuresRef, intensityRef) => {
        // —— 分层容器：天幕 → 星点(静态) → 月光 → 海面反光 → 波浪 → 前景微粒 ——
        const sky = new Graphics();
        const stars = new Container();
        const starLayer = new Graphics();
        stars.addChild(starLayer);
        const moon = new Graphics();
        const reflection = new Graphics();
        const waves = new Graphics();
        const foam = new Graphics();
        const motesLayer = new Graphics();
        app.stage.addChild(sky, stars, moon, reflection, waves, foam, motesLayer);

        // 月光柔和 bloom：只作用在月亮和浪尖，避免全屏发光
        const moonGlow = new GlowFilter({
          distance: 30,
          outerStrength: 1.4,
          innerStrength: 0.25,
          color: 0xc9d6f2,
          quality: 0.25,
          alpha: 0.85,
        });
        const foamGlow = new GlowFilter({
          distance: 12,
          outerStrength: 0.8,
          innerStrength: 0,
          color: 0xc9d6f2,
          quality: 0.2,
          alpha: 0.55,
        });
        // 波浪层加轻微模糊，柔化硬边，去掉几何堆叠感
        const wavesBlur = new BlurFilter({ strength: 2, quality: 2 });
        moon.filters = [moonGlow as unknown as Filter];
        foam.filters = [foamGlow as unknown as Filter];
        waves.filters = [wavesBlur as unknown as Filter];

        const audio = createAudioResponse(featuresRef);

        // 预生成静态星点（噪点），随窗口尺寸变化时重绘一次
        const starSeeds = Array.from({ length: STAR_COUNT }, () => ({
          nx: Math.random(),
          ny: Math.random() * 0.42, // 只在画面上 42% 出现
          r: 0.4 + Math.random() * 1.1,
          a: 0.15 + Math.random() * 0.35,
        }));
        let lastW = 0;
        let lastH = 0;
        const redrawStars = (w: number, h: number) => {
          starLayer.clear();
          for (const s of starSeeds) {
            starLayer.circle(s.nx * w, s.ny * h, s.r);
            starLayer.fill({ color: MOON_SILVER, alpha: s.a });
          }
        };

        // 柔光微粒（复用 shared helper），密度降低 → 舞台不喧宾夺主
        const motes = Array.from({ length: 32 }, () => ({
          x: Math.random() * app.renderer.width,
          y: Math.random() * app.renderer.height * 0.45,
          phase: Math.random() * Math.PI * 2,
          size: 1.2 + Math.random() * 2,
        }));

        // 平滑状态 —— 大背景用极重阻尼，避免全屏 itch
        let smoothRms = 0;
        let smoothMid = 0;
        let smoothTreble = 0;
        let ripple = 0; // beat 触发的浪尖爆发（快速衰减）
        let breath = 0.5; // 呼吸感（静默时缓慢自持）

        let t = 0;

        const tick = () => {
          const delta = app.ticker.deltaMS / 1000;
          t += delta * 0.28; // 主时钟走得慢 → 沉静
          audio.update(delta);

          // 重平滑：background = 极慢，mid = 中等，treble = 略快
          smoothRms += (audio.rms - smoothRms) * Math.min(1, delta * 1.6);
          smoothMid += (audio.mid - smoothMid) * Math.min(1, delta * 4);
          smoothTreble += (audio.treble - smoothTreble) * Math.min(1, delta * 8);

          // 歌曲段落驱动
          const section = audio.section;
          const tension = audio.tension;
          const release = audio.release;

          // 段落映射为全局亮度系数：intro暗 → buildup渐亮 → drop亮 → breakdown渐暗
          let sectionBrightness = 0.7;
          let sectionSpeed = 1.0;
          if (section === "intro") { sectionBrightness = 0.5; sectionSpeed = 0.7; }
          else if (section === "verse") { sectionBrightness = 0.7; sectionSpeed = 0.9; }
          else if (section === "buildup") { sectionBrightness = 0.7 + tension * 0.2; sectionSpeed = 1.0 + tension * 0.3; }
          else if (section === "drop") { sectionBrightness = 0.9 + release * 0.1; sectionSpeed = 1.2; }
          else if (section === "breakdown") { sectionBrightness = 0.45; sectionSpeed = 0.6; }

          // 呼吸感：无音乐时靠时间正弦维持，有音乐时叠加 rms
          const idleBreath = 0.5 + Math.sin(t * 0.6) * 0.05;
          breath += (idleBreath + smoothRms * 0.35 - breath) * Math.min(1, delta * 2);

          // beat/impact 才允许触发浪尖爆发
          if (audio.isBeatDrop || audio.impact > 0.25) {
            ripple = Math.max(ripple, Math.min(1, audio.impact + 0.15));
          }
          ripple *= Math.max(0, 1 - delta * 2.2);

          const { width, height } = app.renderer;
          const intensity = intensityRef.current;

          // 尺寸变化时重画静态星点（不放循环 hot path 里）
          if (width !== lastW || height !== lastH) {
            redrawStars(width, height);
            lastW = width;
            lastH = height;
          }

          // ============ 背景天幕（rms 驱动，极慢）============
          sky.clear();
          drawGradientWash(sky, width, height, DEEP_NAVY, TIDE_INDIGO);
          drawAuroraBlobs(
            sky,
            width,
            height,
            t * 0.35, // 明显慢于原来的 mid 驱动速度
            { ...featuresRef.current, rms: smoothRms, mid: smoothMid * 0.4, bass: 0 },
            THEME,
            intensity * 0.75,
          );

          // ============ 月亮（mid 驱动微微呼吸，段落驱动亮度）============
          moon.clear();
          const moonX = width * 0.74;
          const moonY = height * 0.22 + Math.sin(t * 0.4) * 4;
          const moonBaseR = Math.min(width, height) * 0.045;
          const moonR = moonBaseR * (1 + smoothMid * 0.08 + breath * 0.04 + tension * 0.04);
          // 月晕外层（buildup时月晕扩大，drop时最亮）
          moon.circle(moonX, moonY, moonR * (2.6 + tension * 1.2));
          moon.fill({ color: MOON_SILVER, alpha: (0.04 + smoothRms * 0.06) * sectionBrightness });
          moon.circle(moonX, moonY, moonR * 1.6);
          moon.fill({ color: MOON_SILVER, alpha: (0.09 + smoothRms * 0.08) * sectionBrightness });
          // 月本体（drop时亮度提升）
          moon.circle(moonX, moonY, moonR);
          moon.fill({ color: MOON_SILVER, alpha: (0.45 + release * 0.2) * sectionBrightness });
          // Glow强度：drop时最亮
          moonGlow.outerStrength = 1.0 + release * 1.2;
          moonGlow.alpha = 0.6 + release * 0.4;

          // ============ 海平线锚点 + 月光倒影柱（跟人声轻微摇曳）============
          reflection.clear();
          const horizonY = height * 0.62;
          // 海平线一条极淡的水平光带
          reflection.rect(0, horizonY - 1, width, 2);
          reflection.fill({ color: MOON_SILVER, alpha: 0.18 });
          // 倒影柱：从月亮正下方到画面底
          const reflW = moonR * 1.8;
          const reflSway = Math.sin(t * 0.7) * 6 + smoothMid * 10;
          for (let i = 0; i < 14; i++) {
            const yy = horizonY + ((height - horizonY) / 14) * i;
            const w = reflW * (1 + i * 0.18) + Math.sin(t * 0.9 + i * 0.6) * 4;
            reflection.rect(moonX - w / 2 + reflSway * (i / 14), yy, w, 2);
            reflection.fill({
              color: MOON_SILVER,
              alpha: 0.14 * (1 - i / 14) + smoothTreble * 0.05,
            });
          }

          // ============ 波浪（4 层，锁色，慢速，仅 beat 时浪尖爆发）============
          waves.clear();
          foam.clear();
          const layers = 4;
          for (let layer = 0; layer < layers; layer++) {
            const depth = layer / (layers - 1); // 0 = 远, 1 = 近
            // 每层 y 位置：从海平线向下堆叠到画面底部前
            const yBase =
              horizonY + (height - horizonY) * (0.15 + depth * 0.78);
            // 波幅：远层小、近层大；rms 微调；beat 时通过 ripple 爆发
            const amp =
              (4 + depth * 18 + smoothRms * 10 + ripple * 16 * depth) *
              intensity *
              (0.8 + breath * 0.2);
            // 速度：主要是 t 驱动，mid 只加一点点点缀；段落驱动全局速度
            const speed = (0.14 + depth * 0.1 + smoothMid * 0.14) * sectionSpeed;
            waves.moveTo(0, height);
            for (let x = 0; x <= width; x += 3) {
              const wave =
                Math.sin(x * 0.003 + t * speed + layer * 0.8) * amp +
                Math.sin(x * 0.009 - t * 0.15 + layer * 1.3) *
                  (2 + smoothMid * 3) +
                Math.cos(x * 0.0018 + t * 0.05 + layer * 0.5) * 2;
              const y = yBase + wave;
              waves.lineTo(x, y);

              // 浪尖高光：只在近层、且 ripple 明显时，稀疏点缀
              if (
                layer >= 2 &&
                ripple > 0.15 &&
                x % 36 === 0
              ) {
                foam.circle(x, y - 1, 0.8 + ripple * 1.8);
                foam.fill({
                  color: MOON_SILVER,
                  alpha: 0.25 * ripple + smoothTreble * 0.15,
                });
              }
            }
            waves.lineTo(width, height);
            waves.closePath();

            // 锁色：从 TIDE_INDIGO 到 DEEP_NAVY 之间插值，靠 alpha 分层
            const color = depth < 0.5 ? TIDE_INDIGO : DEEP_NAVY;
            const alpha = (0.22 + depth * 0.22 + smoothRms * 0.04) * sectionBrightness;
            waves.fill({ color, alpha });
          }

          // 近岸最前一层薄的高光带（海平线之下窄条），treble 驱动 shimmer
          if (smoothTreble > 0.05) {
            foam.rect(0, horizonY + 2, width, 1);
            foam.fill({
              color: MOON_SILVER,
              alpha: 0.08 + smoothTreble * 0.18,
            });
          }

          // ============ 前景柔光微粒（treble/rms 微驱动，营造氛围）============
          motesLayer.clear();
          drawSoftMotes(
            motesLayer,
            motes,
            width,
            horizonY, // 只在天空区，不干扰海面
            t * 0.6,
            { ...featuresRef.current, rms: smoothRms, treble: smoothTreble },
            MOON_SILVER,
            intensity * (0.35 + smoothTreble * 0.5),
          );
        };

        app.ticker.add(tick);
        return () => {
          app.ticker.remove(tick);
        };
      }}
    />
  );
}
