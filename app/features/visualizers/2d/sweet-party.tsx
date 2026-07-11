import { Filter, Graphics } from "pixi.js";
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

// 竖条固定顺序（不 hue 漂移，仅亮度呼吸）
const STRIPE_HUES = [
  ROSE_H,
  PEACH_H,
  ROSE_H,
  LAVENDER_H,
  PEACH_H,
  ROSE_H,
  PEACH_H,
  ROSE_H,
  PEACH_H,
];
const STRIPE_COUNT = STRIPE_HUES.length;

type ParticleKind = "heart" | "star";
type SpawnZone = "top" | "mid";

type Particle = {
  kind: ParticleKind;
  hue: number;
  size: number;
  body: Matter.Body;
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

function starOutlineVerts(outerR: number) {
  const innerR = outerR * 0.42;
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return verts;
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

function strokeStarOutline(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  color: string | number,
  alpha: number,
  width: number,
  angle: number,
) {
  const verts = starOutlineVerts(size * 0.5);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const first = verts[0]!;
  g.moveTo(
    x + first.x * cos - first.y * sin,
    y + first.x * sin + first.y * cos,
  );
  for (let i = 1; i < verts.length; i++) {
    const v = verts[i]!;
    g.lineTo(x + v.x * cos - v.y * sin, y + v.x * sin + v.y * cos);
  }
  g.closePath();
  g.stroke({ color, width, alpha, cap: "round", join: "round" });
}

function createParticleBody(kind: ParticleKind, x: number, y: number, size: number) {
  const opts: Matter.IBodyDefinition = {
    restitution: 0.2,
    friction: 0.42,
    frictionAir: 0.012,
    density: 0.00075,
    chamfer: { radius: 1 },
  };

  if (kind === "heart") {
    return Matter.Bodies.circle(x, y, size * 0.4, opts);
  }

  const verts = starOutlineVerts(size * 0.48);
  return Matter.Bodies.fromVertices(x, y, [verts], opts, true);
}

function pickSpawnZone(): SpawnZone {
  return Math.random() < 0.5 ? "top" : "mid";
}

function spawnParticle(
  width: number,
  height: number,
  kind: ParticleKind,
  zone = pickSpawnZone(),
): Particle {
  const size = 40 + Math.random() * 32; // 40~72，元素大而少
  // 从边缘偏心生成，保留中央留白
  const edgeBias = Math.random() < 0.5 ? Math.random() * 0.35 : 0.65 + Math.random() * 0.35;
  const x = size + edgeBias * Math.max(size, width - size * 2);
  const y =
    zone === "top"
      ? -size - Math.random() * 120
      : height * (0.05 + Math.random() * 0.45);

  const body = createParticleBody(kind, x, y, size);
  if (zone === "mid") {
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 0.8,
      y: 0.6 + Math.random() * 1.6,
    });
  }

  // 只从三档 candy hue 中挑
  const hue = CANDY_HUES[Math.floor(Math.random() * CANDY_HUES.length)]!;

  return { kind, size, hue, body };
}

function addParticle(
  particles: Particle[],
  world: Matter.World,
  width: number,
  height: number,
  zone?: SpawnZone,
) {
  const kind: ParticleKind = Math.random() < 0.4 ? "star" : "heart";
  const p = spawnParticle(width, height, kind, zone);
  particles.push(p);
  Matter.Composite.add(world, p.body);
  Matter.Body.setAngularVelocity(p.body, (Math.random() - 0.5) * 0.08);
}

/**
 * 沉静竖条：
 * - hue 锁死 STRIPE_HUES；不随 t 循环
 * - 仅亮度与轻微横向漂移随 rms/mid 呼吸
 * - 顶部略透明，底部加暗——舞台上下留呼吸
 */
function drawDynamicStripes(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  stripes: { phase: number; speed: number }[],
  mid: number,
  bass: number,
  rms: number,
  intensity: number,
) {
  const stripeW = width / STRIPE_COUNT;
  // 缓慢漂移，速度锁上限
  const drift = (t * (4 + mid * 6 * intensity)) % stripeW;

  for (let i = -1; i <= STRIPE_COUNT; i++) {
    const idx = ((i % STRIPE_COUNT) + STRIPE_COUNT) % STRIPE_COUNT;
    const stripe = stripes[idx]!;
    const hue = STRIPE_HUES[idx]!;

    // 极缓的横向波，几乎不觉察，避免"晃眼"
    const wave = Math.sin(t * 0.28 + stripe.phase) * 3 + Math.sin(t * 0.18 + i * 0.7) * 2;
    const x = i * stripeW - drift + wave;

    // 饱和度低（36-46），高级奶油质感；节拍只微推
    const sat = 40 + Math.sin(t * 0.32 + stripe.phase) * 4 + rms * 6 * intensity;
    // 亮度 82-90 —— 柔和粉彩，绝不打死白
    const light =
      84 +
      Math.sin(t * 0.24 + stripe.phase) * 3 +
      bass * 3 * intensity +
      (idx === 3 ? 2 : 0); // lavender 稍亮一点做焦点

    g.rect(x - 1, 0, stripeW + 3, height);
    g.fill({
      color: hslColor(hue, sat, light),
      alpha: 0.86,
    });
  }
}

/** 顶天立地的柔化层：顶部提亮 + 底部沉锚，给画面呼吸和站立感 */
function drawAmbientOverlay(
  g: Graphics,
  width: number,
  height: number,
  rms: number,
  intensity: number,
) {
  // 顶部奶油光晕（模拟顶光）
  const topBands = 6;
  for (let i = 0; i < topBands; i++) {
    const bandH = (height * 0.32) / topBands;
    const y = i * bandH;
    const a = (1 - i / topBands) * (0.14 + rms * 0.05 * intensity);
    g.rect(0, y, width, bandH + 1);
    g.fill({ color: 0xfff2f6, alpha: a });
  }

  // 底部暖粉阴影，形成舞台锚
  const botBands = 8;
  for (let i = 0; i < botBands; i++) {
    const bandH = (height * 0.28) / botBands;
    const y = height - (botBands - i) * bandH;
    const a = (i / botBands) * 0.28;
    g.rect(0, y, width, bandH + 1);
    g.fill({ color: hslNumber(ROSE_H, 45, 32), alpha: a });
  }

  // 左右轻微暗角，收拢焦点
  const vignW = width * 0.14;
  for (let i = 0; i < 6; i++) {
    const w = (vignW / 6) * (6 - i);
    const a = (0.06 + i * 0.008) * 0.9;
    g.rect(0, 0, w, height);
    g.fill({ color: hslNumber(ROSE_H, 40, 22), alpha: a });
    g.rect(width - w, 0, w, height);
    g.fill({ color: hslNumber(ROSE_H, 40, 22), alpha: a });
  }
}

export function SweetPartyScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#f8ecef"
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const ambient = new Graphics();
        const rays = new Graphics();
        const glowShapes = new Graphics();
        const shapes = new Graphics();
        app.stage.addChild(bg, ambient, rays, glowShapes, shapes);

        // Glow：锁定玫瑰色，不随 mid 变
        const glowFilter = new GlowFilter({
          distance: 22,
          outerStrength: 1.4,
          innerStrength: 0.12,
          color: hslNumber(ROSE_H, 78, 62),
          quality: 0.2,
          alpha: 0.75,
        });
        // 极柔和 godray，仅作为顶光扫过感
        const godrayFilter = new GodrayFilter({
          angle: 24,
          gain: 0.14,
          lacunarity: 2.2,
          alpha: 0.22,
        });
        // RGB split 收紧上限；只在真节拍时可见
        const rgbFilter = new RGBSplitFilter([-0.6, 0], [0, 0.4], [0.6, 0]);
        rays.filters = [godrayFilter as unknown as Filter];
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

        const stripes = Array.from({ length: STRIPE_COUNT }, () => ({
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.5,
        }));

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
        // 初始少量：约 22 个足够铺气氛，不拖开场性能
        for (let i = 0; i < 22; i++) {
          addParticle(
            particles,
            world,
            app.renderer.width,
            app.renderer.height,
            i % 3 === 0 ? "mid" : "top",
          );
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

          // 掉落节流：静默时几乎不掉，音乐时也控节奏，避免密集卡顿
          // 目标粒子数上限根据能量浮动，但不硬性 cap
          const musicOn = rms > 0.04;
          const baseRate = musicOn
            ? 0.09 + treble * 0.06 * intensity + rms * 0.05
            : 0.025; // 静默时慢速持续掉落

          if (Math.random() < baseRate) {
            addParticle(particles, world, width, height);
          }

          // 只有强节拍才 burst，且量小
          if (musicOn && (Boolean(beat) || audio.impact > 0.4)) {
            const burst = 1 + Math.floor(audio.impact * 2 * intensity);
            for (let b = 0; b < burst; b++) {
              addParticle(
                particles,
                world,
                width,
                height,
                Math.random() < 0.5 ? "mid" : "top",
              );
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

          // 中层柔风：mid 驱动（"跟着人声"），量极小，形成飘落感
          for (const p of particles) {
            if (p.body.isSleeping) continue;
            const side = p.body.position.x < width * 0.5 ? -1 : 1;
            Matter.Body.applyForce(p.body, p.body.position, {
              x:
                (Math.sin(t * 0.9 + p.body.position.x * 0.008) * mid * 0.000015 +
                  side * 0.0000155) *
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

          bg.clear();
          ambient.clear();
          rays.clear();
          glowShapes.clear();
          shapes.clear();

          // Godray 缓慢
          godrayFilter.time = t * 0.14;
          godrayFilter.gain = 0.12 + rms * 0.08 * intensity;

          // Glow 强度只在 treble 与 rms 上抬，颜色锁 ROSE
          glowFilter.outerStrength = 1.05 + treble * 1.0 * intensity + rms * 0.5;

          // RGB split 强阻尼；仅节拍瞬间可见
          splitTarget = musicOn
            ? 0.35 + audio.impact * 1.1 * intensity + treble * 0.35 * intensity
            : 0.2;
          splitCurrent += (splitTarget - splitCurrent) * 0.12;
          rgbFilter.red = [-splitCurrent, 0];
          rgbFilter.green = [0, splitCurrent * 0.4];
          rgbFilter.blue = [splitCurrent, 0];

          // Godray 作用于底层柔膜（一层近乎透明的暖片,让光斑有承载物）
          rays.rect(0, 0, width, height);
          rays.fill({
            color: hslNumber(PEACH_H, 55, 88),
            alpha: 0.1 + rms * 0.05 * intensity,
          });

          drawDynamicStripes(
            bg,
            width,
            height,
            t,
            stripes,
            mid,
            bass,
            rms,
            intensity,
          );

          drawAmbientOverlay(ambient, width, height, rms, intensity);

          // 直接按数组顺序绘制，避免每帧 [...particles].sort 的分配
          for (const p of particles) {
            const { x, y } = p.body.position;
            // 掉出画面上方前先不画（略）；轻微幅度可见
            const sat = 42 + treble * 12 * intensity;
            const light = 62 + rms * 10 * intensity;
            const color = hslColor(p.hue, sat, light);
            const alpha = 0.82;
            const lineW = Math.max(1.3, p.size * 0.085);

            // Glow 用同 hue，饱和度更强，制造"糖果发光"但不越界
            const glowColor = hslNumber(p.hue, 82, 60);
            const glowAlpha = 0.28 + treble * 0.14 * intensity + rms * 0.1;
            const glowW = lineW * 3.2;

            if (p.kind === "heart") {
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
            } else {
              strokeStarOutline(
                glowShapes,
                x,
                y,
                p.size,
                glowColor,
                glowAlpha,
                glowW,
                p.body.angle,
              );
              strokeStarOutline(
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
