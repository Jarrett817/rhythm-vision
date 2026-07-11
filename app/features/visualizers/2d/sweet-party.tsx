import { BlurFilter, Filter, Graphics } from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";
import { GodrayFilter } from "@pixi/filter-godray";
import { RGBSplitFilter } from "@pixi/filter-rgb-split";
import Matter from "matter-js";
import decomp from "poly-decomp";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import { createAudioResponse } from "~/lib/audio/response";

Matter.Common.setDecomp(decomp);

// ============================================================
// LOCKED CANDY PALETTE — 2 主色 + 1 高光。禁止 hue 自由循环。
// ============================================================
// Rose：主色，构图暖底
const ROSE_H = 340;
// Peach：次主色，与 Rose 交替提供节奏
const PEACH_H = 22;
// Cream Lavender：稀有高光，只在 treble/beat 亮
const LAVENDER_H = 285;

// 三档 candy hue 池，掉落元素只从中随机
const CANDY_HUES = [ROSE_H, PEACH_H, LAVENDER_H];

// 稀疏光柱：只有 5 根，宽窄不一、位置错开、速度错拍
// 这不是"平铺色块"，而是舞台上的 5 束柔光——中央亮两边隐
const PILLARS = [
  { center: 0.14, width: 0.11, hue: ROSE_H, speed: 0.19, phase: 0.7 },
  { center: 0.30, width: 0.07, hue: PEACH_H, speed: 0.27, phase: 2.1 },
  { center: 0.52, width: 0.14, hue: LAVENDER_H, speed: 0.15, phase: 3.4 },
  { center: 0.72, width: 0.08, hue: PEACH_H, speed: 0.24, phase: 4.8 },
  { center: 0.88, width: 0.10, hue: ROSE_H, speed: 0.21, phase: 5.6 },
];

// 粒子软上限：静默时更少，音乐时向上扩容，硬顶防卡顿
const PARTICLE_SOFT_CAP = 150;
const PARTICLE_IDLE_CAP = 40;

type Particle = {
  hue: number;
  size: number;
  body: Matter.Body;
  seed: number;
};

function hslColor(h: number, s: number, l: number) {
  const hue = Math.round(((h % 360) + 360) % 360);
  const sat = Math.round(Math.max(0, Math.min(100, s)));
  const light = Math.round(Math.max(0, Math.min(100, l)));
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function hslNumber(h: number, s: number, l: number) {
  const hue = (((h % 360) + 360) % 360) / 60;
  const sat = Math.max(0, Math.min(1, s / 100));
  const light = Math.max(0, Math.min(1, l / 100));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const m = light - c / 2;
  const [r1, g1, b1] =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return (r << 16) + (g << 8) + b;
}

function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function strokeHeartOutline(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  color: string | number,
  alpha: number,
  width: number,
  angle: number,
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = (px: number, py: number) => ({
    x: x + px * cos - py * sin,
    y: y + px * sin + py * cos,
  });
  const top = -size * 0.5;
  const p0 = tx(0, top + size * 0.32);
  const c1 = tx(0, top);
  const c2 = tx(-size * 0.52, top);
  const p1 = tx(-size * 0.52, top + size * 0.28);
  const c3 = tx(-size * 0.52, top + size * 0.58);
  const p2 = tx(0, top + size * 0.78);
  const p3 = tx(0, top + size);
  const c4 = tx(0, top + size * 0.78);
  const c5 = tx(size * 0.52, top + size * 0.58);
  const p4 = tx(size * 0.52, top + size * 0.28);
  const c6 = tx(size * 0.52, top);
  const c7 = tx(0, top);

  g.moveTo(p0.x, p0.y);
  g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
  g.bezierCurveTo(c3.x, c3.y, p2.x, p2.y, p3.x, p3.y);
  g.bezierCurveTo(c4.x, c4.y, c5.x, c5.y, p4.x, p4.y);
  g.bezierCurveTo(c6.x, c6.y, c7.x, c7.y, p0.x, p0.y);
  g.stroke({ color, width, alpha, cap: "round", join: "round" });
}

function createHeartBody(x: number, y: number, size: number) {
  return Matter.Bodies.circle(x, y, size * 0.4, {
    restitution: 0.2,
    friction: 0.42,
    frictionAir: 0.012,
    density: 0.00075,
    chamfer: { radius: 1 },
  });
}

function spawnHeart(width: number, height: number): Particle {
  const size = 42 + Math.random() * 30; // 42~72，元素大而少
  // 两侧偏心生成，中央 30~70% 留白
  const side = Math.random() < 0.5 ? 0 : 1;
  const nx = side === 0 ? 0.02 + Math.random() * 0.32 : 0.66 + Math.random() * 0.32;
  const x = size + nx * Math.max(size, width - size * 2);
  const y = -size - Math.random() * 160;

  const body = createHeartBody(x, y, size);
  // 初速带一点朝外侧的横向分量，堆积自然偏两边
  const outward = side === 0 ? -1 : 1;
  Matter.Body.setVelocity(body, {
    x: outward * (0.2 + Math.random() * 0.5),
    y: 0.3 + Math.random() * 0.8,
  });
  Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);

  const hue = CANDY_HUES[Math.floor(Math.random() * CANDY_HUES.length)]!;
  return { size, hue, body, seed: Math.random() * 1000 };
}

function addHeart(particles: Particle[], world: Matter.World, width: number, height: number) {
  const p = spawnHeart(width, height);
  particles.push(p);
  Matter.Composite.add(world, p.body);
}

/**
 * 稀疏光柱（取代"9条等宽平铺"）
 * - 只有 5 根，宽窄各异
 * - 每根中心亮、两边指数衰减 → 天然羽化，没有"竖条"硬边
 * - 速度错拍：每根有自己的漂移速度和相位
 * - 底色靠后面 aurora blobs / gradient wash 填,这里只是柔光带
 */
function drawSoftPillars(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  mid: number,
  rms: number,
  intensity: number,
) {
  // 每根柱子沿画面竖向切成 24 段，逐段用衰减 alpha 画柔光
  const segs = 20;
  for (const pil of PILLARS) {
    // 呼吸：中心位置轻微左右漂移（不同速度）
    const drift =
      Math.sin(t * pil.speed + pil.phase) * 0.015 +
      Math.sin(t * pil.speed * 1.7 + pil.phase * 1.3) * 0.008;
    const cx = (pil.center + drift * mid * 0.8) * width;
    const halfW = pil.width * width * 0.5;
    // 光柱纵向羽化：顶部亮、底部弱（顶光感）
    for (let s = 0; s < segs; s++) {
      const ny = s / (segs - 1);
      const y = ny * height;
      // 顶部 0.9 → 底部 0.35 的纵向衰减
      const vertFalloff = 0.9 - Math.pow(ny, 1.4) * 0.55;
      // 呼吸亮度：mid + 缓慢正弦
      const breath =
        0.55 + Math.sin(t * pil.speed * 0.9 + pil.phase + ny * 1.2) * 0.12 + mid * 0.18;
      // 画三层同心矩形，宽度递减、alpha 递增 → 中心亮两边隐（径向衰减模拟）
      for (let layer = 0; layer < 3; layer++) {
        const w = halfW * (1 - layer * 0.32);
        const alpha = (0.05 + layer * 0.06) * vertFalloff * breath * (0.7 + rms * 0.4) * intensity;
        const sat = 32 + layer * 6;
        const light = 82 + layer * 3 + (pil.hue === LAVENDER_H ? 2 : 0);
        g.rect(cx - w, y, w * 2, height / segs + 1);
        g.fill({
          color: hslColor(pil.hue, sat, light),
          alpha,
        });
      }
    }
  }
}

/**
 * 奶油雾底：仿 pixi-atmosphere drawAuroraBlobs 手法
 * 大柔团彼此叠加，走 rms 缓慢流动；这是画面 60%+ 面积的"程序化软纹理"
 */
function drawCreamMist(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  rms: number,
  mid: number,
  bass: number,
  intensity: number,
) {
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    // 每个团有独立相位与速度，避免同步
    const px =
      0.5 +
      Math.sin(t * (0.06 + i * 0.014) + i * 1.3) * (0.34 + mid * 0.06);
    const py =
      0.55 +
      Math.cos(t * (0.05 + i * 0.012) + i * 2.1) * (0.30 + bass * 0.05);
    const cx = px * width;
    const cy = py * height;
    const r =
      Math.min(width, height) *
      (0.28 + rms * 0.10 + Math.sin(t * 0.4 + i) * 0.03) *
      (0.9 + intensity * 0.15);
    // 三色循环：ROSE / PEACH / LAVENDER
    const hue = CANDY_HUES[i % 3]!;
    // 三瓣叠加 —— 靠 BlurFilter 完成晕染
    for (let l = 0; l < 3; l++) {
      const a = (l / 3) * Math.PI * 2 + i;
      const ox = Math.cos(a) * r * 0.22;
      const oy = Math.sin(a) * r * 0.18;
      g.ellipse(cx + ox, cy + oy, r * (0.7 + l * 0.12), r * (0.55 + l * 0.1));
      g.fill({
        color: hslNumber(hue, 42, 82),
        alpha: 0.12 + mid * 0.05 + rms * 0.05,
      });
    }
  }
}

/** 纵向渐变奶油底（gradient wash） —— 顶部提亮，底部沉锚 */
function drawGradientBackdrop(g: Graphics, width: number, height: number, rms: number) {
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const y0 = (height / steps) * i;
    const y1 = (height / steps) * (i + 1);
    const nt = i / (steps - 1);
    // 顶部：奶油白偏冷；底部：暖玫瑰阴影
    const topColor = hslNumber(LAVENDER_H, 28, 92);
    const midColor = hslNumber(PEACH_H, 40, 88);
    const botColor = hslNumber(ROSE_H, 38, 62);
    const color = nt < 0.4 ? topColor : nt < 0.75 ? midColor : botColor;
    const alpha = nt < 0.4 ? 0.5 - nt * 0.4 : 0.35 + (nt - 0.4) * 0.5;
    g.rect(0, y0, width, y1 - y0 + 1);
    g.fill({ color, alpha });
  }
  // 顶部一层柔光，随 rms 轻呼吸
  g.rect(0, 0, width, height * 0.28);
  g.fill({ color: 0xfff2f6, alpha: 0.08 + rms * 0.05 });
}

/** 底部堆积区暗角，锚定舞台 */
function drawBottomAnchor(g: Graphics, width: number, height: number) {
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const bandH = (height * 0.22) / bands;
    const y = height - (bands - i) * bandH;
    const a = (i / bands) * 0.22;
    g.rect(0, y, width, bandH + 1);
    g.fill({ color: hslNumber(ROSE_H, 42, 28), alpha: a });
  }
  // 左右轻微暗角
  const vignW = width * 0.10;
  for (let i = 0; i < 5; i++) {
    const w = (vignW / 5) * (5 - i);
    const a = (0.05 + i * 0.006) * 0.8;
    g.rect(0, 0, w, height);
    g.fill({ color: hslNumber(ROSE_H, 40, 24), alpha: a });
    g.rect(width - w, 0, w, height);
    g.fill({ color: hslNumber(ROSE_H, 40, 24), alpha: a });
  }
}

export function SweetPartyScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#f6e8ec"
      setup={(app, featuresRef, intensityRef) => {
        // ---- 图层顺序：奶油渐变底 → 奶油雾团 → 稀疏光柱 → 底部锚 → 心之glow → 心 ----
        const backdrop = new Graphics();
        const mist = new Graphics();
        const pillars = new Graphics();
        const anchor = new Graphics();
        const glowShapes = new Graphics();
        const shapes = new Graphics();
        app.stage.addChild(backdrop, mist, pillars, anchor, glowShapes, shapes);

        // 奶油雾团高斯柔化 —— 转成程序化软纹理主体
        mist.filters = [new BlurFilter({ strength: 30, quality: 3 })];
        // 光柱轻柔化 —— 边缘再羽化一层
        pillars.filters = [new BlurFilter({ strength: 10, quality: 2 })];

        // Glow：锁定玫瑰色
        const glowFilter = new GlowFilter({
          distance: 22,
          outerStrength: 1.4,
          innerStrength: 0.12,
          color: hslNumber(ROSE_H, 78, 62),
          quality: 0.2,
          alpha: 0.75,
        });
        // 极柔和 godray 挂在稀疏光柱层上 —— 顶光扫过感
        const godrayFilter = new GodrayFilter({
          angle: 24,
          gain: 0.12,
          lacunarity: 2.2,
          alpha: 0.18,
        });
        const rgbFilter = new RGBSplitFilter([-0.6, 0], [0, 0.4], [0.6, 0]);
        pillars.filters = [
          new BlurFilter({ strength: 10, quality: 2 }) as unknown as Filter,
          godrayFilter as unknown as Filter,
        ];
        glowShapes.filters = [glowFilter as unknown as Filter];
        shapes.filters = [rgbFilter as unknown as Filter];

        const audio = createAudioResponse(featuresRef);
        const engine = Matter.Engine.create({
          gravity: { x: 0, y: 1.15, scale: 0.001 },
        });
        const world = engine.world;
        const particles: Particle[] = [];
        let bounds = { width: 0, height: 0, floorY: 0 };
        let walls: Matter.Body[] = [];

        let t = 0;
        let shake = 0;
        let splitTarget = 0;
        let splitCurrent = 0;

        const rebuildWalls = (width: number, height: number) => {
          if (walls.length) Matter.Composite.remove(world, walls);
          const floorY = height;
          bounds = { width, height, floorY };
          walls = [
            Matter.Bodies.rectangle(width * 0.5, floorY + 22, width * 1.12, 44, {
              isStatic: true,
              friction: 0.28,
              restitution: 0.22,
              label: "floor",
            }),
          ];
          Matter.Composite.add(world, walls);
        };

        rebuildWalls(app.renderer.width, app.renderer.height);
        // 开场少量，避免初始拥挤
        for (let i = 0; i < 14; i++) {
          addHeart(particles, world, app.renderer.width, app.renderer.height);
        }

        const tick = () => {
          t += 0.016;
          audio.update(0.016);
          const { width, height } = app.renderer;
          const intensity = intensityRef.current;
          const { bass, mid, treble, rms, beat } = featuresRef.current;

          if (width !== bounds.width || height !== bounds.height) {
            rebuildWalls(width, height);
          }

          // 只在真节拍/冲击时给震动
          if ((audio.impact > 0.25 || beat) && rms > 0.05) {
            shake = Math.max(shake, audio.impact * 12 * intensity);
          }
          shake *= 0.86;

          // 动态目标粒子数：静默向 IDLE 收敛，音乐向 SOFT 扩容
          const musicOn = rms > 0.04;
          const targetCap = musicOn
            ? Math.min(
                PARTICLE_SOFT_CAP,
                60 + Math.floor(rms * 60 + treble * 30 * intensity),
              )
            : PARTICLE_IDLE_CAP;

          // 掉落节流：静默慢速持续掉落；有音乐才加速
          // 只有当当前 < targetCap 时才允许生成，形成动态稀疏化
          const under = particles.length < targetCap;
          const baseRate = musicOn
            ? 0.09 + treble * 0.05 * intensity + rms * 0.04
            : 0.028;

          if (under && Math.random() < baseRate) {
            addHeart(particles, world, width, height);
          }

          // 只有强节拍才 burst，且量小 + 也受 cap 限制
          if (musicOn && (Boolean(beat) || audio.impact > 0.4)) {
            const burstMax = 1 + Math.floor(audio.impact * 2 * intensity);
            for (let b = 0; b < burstMax; b++) {
              if (particles.length >= PARTICLE_SOFT_CAP) break;
              addHeart(particles, world, width, height);
            }
          }

          // 震动只对底部堆积区施力，两侧扩散
          if (shake > 0.4) {
            const floorY = bounds.floorY;
            for (const p of particles) {
              if (p.body.position.y < floorY - 60) continue;
              const depth = Math.min(1, (p.body.position.y - (floorY - 140)) / 140);
              const side = p.body.position.x < width * 0.5 ? -1 : 1;
              const force = shake * (0.32 + depth) * 0.00012 * intensity;
              Matter.Body.applyForce(p.body, p.body.position, {
                x: force * side * (1 + bass * 1.8),
                y: -force * 0.28,
              });
            }
          }

          // 中层柔风：mid 驱动（"跟着人声"）,horizontal 微推、向两侧堆
          for (const p of particles) {
            if (p.body.isSleeping) continue;
            const side = p.body.position.x < width * 0.5 ? -1 : 1;
            Matter.Body.applyForce(p.body, p.body.position, {
              x:
                (Math.sin(t * 0.9 + p.seed) * mid * 0.000015 +
                  side * 0.0000175) *
                intensity,
              y: 0,
            });
          }

          Matter.Engine.update(engine, 1000 / 60);

          // 出屏清理
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]!;
            const { x, y } = p.body.position;
            if (y > height + 140 || x < -100 || x > width + 100) {
              Matter.Composite.remove(world, p.body);
              particles.splice(i, 1);
            }
          }

          // 硬顶保险：极端情况下移除最老的心（堆底可能会挤爆）
          while (particles.length > PARTICLE_SOFT_CAP) {
            const oldest = particles.shift();
            if (oldest) Matter.Composite.remove(world, oldest.body);
          }

          backdrop.clear();
          mist.clear();
          pillars.clear();
          anchor.clear();
          glowShapes.clear();
          shapes.clear();

          // ============================================================
          // 【远景层 · 慢】 奶油底 + 奶油雾团 —— rms 缓慢驱动
          // ============================================================
          drawGradientBackdrop(backdrop, width, height, rms);
          drawCreamMist(mist, width, height, t, rms, mid, bass, intensity);

          // ============================================================
          // 【中景层 · 稀疏光柱】 —— mid 呼吸，速度错拍
          // ============================================================
          drawSoftPillars(pillars, width, height, t, mid, rms, intensity);
          godrayFilter.time = t * 0.12;
          godrayFilter.gain = 0.10 + rms * 0.06 * intensity;

          drawBottomAnchor(anchor, width, height);

          // ============================================================
          // 【近景 · 焦点】 掉落心 + treble/beat glow
          // ============================================================
          glowFilter.outerStrength = 1.05 + treble * 1.0 * intensity + rms * 0.5;

          splitTarget = musicOn
            ? 0.35 + audio.impact * 1.1 * intensity + treble * 0.35 * intensity
            : 0.2;
          splitCurrent += (splitTarget - splitCurrent) * 0.12;
          rgbFilter.red = [-splitCurrent, 0];
          rgbFilter.green = [0, splitCurrent * 0.4];
          rgbFilter.blue = [splitCurrent, 0];

          for (const p of particles) {
            const { x, y } = p.body.position;
            const sat = 42 + treble * 12 * intensity;
            const light = 62 + rms * 10 * intensity;
            const color = hslColor(p.hue, sat, light);
            const alpha = 0.82;
            const lineW = Math.max(1.3, p.size * 0.085);

            const glowColor = hslNumber(p.hue, 82, 60);
            const glowAlpha = 0.28 + treble * 0.14 * intensity + rms * 0.1;
            const glowW = lineW * 3.2;

            strokeHeartOutline(
              glowShapes,
              x,
              y,
              p.size,
              glowColor,
              glowAlpha,
              glowW,
              p.body.angle,
            );
            strokeHeartOutline(
              shapes,
              x,
              y,
              p.size,
              color,
              alpha,
              lineW,
              p.body.angle,
            );
          }
        };

        app.ticker.add(tick);
        return () => {
          app.ticker.remove(tick);
          Matter.Composite.clear(world, false, true);
          Matter.Engine.clear(engine);
        };
      }}
    />
  );
}
// 保留 hash01 作为可扩展的随机源（未来加纸屑/花瓣等程序化纹理时可用）
void hash01;
