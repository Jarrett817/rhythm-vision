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
// LOCKED CANDY PALETTE — 2 主色 + 1 高光
// ============================================================
const ROSE_H = 340;
const PEACH_H = 22;
const LAVENDER_H = 285;
const CANDY_HUES = [ROSE_H, PEACH_H, LAVENDER_H];

// 稀疏光柱
const PILLARS = [
  { center: 0.14, width: 0.11, hue: ROSE_H, speed: 0.19, phase: 0.7 },
  { center: 0.30, width: 0.07, hue: PEACH_H, speed: 0.27, phase: 2.1 },
  { center: 0.52, width: 0.14, hue: LAVENDER_H, speed: 0.15, phase: 3.4 },
  { center: 0.72, width: 0.08, hue: PEACH_H, speed: 0.24, phase: 4.8 },
  { center: 0.88, width: 0.10, hue: ROSE_H, speed: 0.21, phase: 5.6 },
];

// 粒子上限：调高一些，但滚出即销毁
const PARTICLE_SOFT_CAP = 220;
const PARTICLE_IDLE_CAP = 30;

type Particle = {
  hue: number;
  size: number;
  body: Matter.Body;
  seed: number;
  landed: boolean;
  landTime: number;
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
    hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
  return (Math.round((r1 + m) * 255) << 16) + (Math.round((g1 + m) * 255) << 8) + Math.round((b1 + m) * 255);
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
  const tx = (px: number, py: number) => ({ x: x + px * cos - py * sin, y: y + px * sin + py * cos });
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

function fillHeartShape(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha: number,
  angle: number,
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = (px: number, py: number) => ({ x: x + px * cos - py * sin, y: y + px * sin + py * cos });
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
  g.fill({ color, alpha });
}

function createHeartBody(x: number, y: number, size: number) {
  return Matter.Bodies.circle(x, y, size * 0.35, {
    restitution: 0.15,
    friction: 0.08,       // 低摩擦 → 斜坡上自然滚
    frictionAir: 0.015,   // 加大空气阻力让下落更飘
    density: 0.0008,
    chamfer: { radius: 1 },
  });
}

function spawnHeart(width: number, height: number, speedMul = 1): Particle {
  const size = 22 + Math.random() * 22; // 稍微小一点
  // 全屏幕宽度随机生成（不再刻意留白）
  const nx = 0.04 + Math.random() * 0.92;
  const x = size + nx * (width - size * 2);
  const y = -size - Math.random() * 160;
  const body = createHeartBody(x, y, size);
  Matter.Body.setVelocity(body, {
    x: (Math.random() - 0.5) * 0.3,
    y: (0.15 + Math.random() * 0.25) * speedMul, // 下落速度变慢
  });
  Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.03);
  const hue = CANDY_HUES[Math.floor(Math.random() * CANDY_HUES.length)]!;
  return { size, hue, body, seed: Math.random() * 1000, landed: false, landTime: 0 };
}

function addHeart(particles: Particle[], world: Matter.World, width: number, height: number, speedMul = 1) {
  const p = spawnHeart(width, height, speedMul);
  particles.push(p);
  Matter.Composite.add(world, p.body);
}

// ============================================================
// V形地面：中间水平台 + 两侧斜坡 → 爱心落地后自动滚向两侧出屏
// ============================================================
function buildSlopedFloor(width: number, height: number) {
  const floorY = height + 4;
  const flatWidth = width * 0.28; // 中间平坦区宽度
  const flatLeft = (width - flatWidth) / 2;
  const flatRight = flatLeft + flatWidth;
  const slopeDepth = 180; // 斜坡向下延伸距离（滚出屏幕底部）
  const sideWallH = 40;

  const cx = width / 2;
  const cy = floorY;
  const slopeAngle = 0.42; // ~24度

  return [
    // 中间平台
    Matter.Bodies.rectangle(cx, floorY, flatWidth, 30, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.1,
      label: "floor-flat",
    }),
    // 左斜坡
    Matter.Bodies.rectangle(
      flatLeft / 2,
      floorY + slopeDepth / 2 + 20,
      Math.sqrt(flatLeft * flatLeft + slopeDepth * slopeDepth),
      20,
      {
        isStatic: true,
        angle: slopeAngle,
        friction: 0.08,
        restitution: 0.1,
        label: "floor-left-slope",
      },
    ),
    // 右斜坡
    Matter.Bodies.rectangle(
      flatRight + (width - flatRight) / 2,
      floorY + slopeDepth / 2 + 20,
      Math.sqrt((width - flatRight) * (width - flatRight) + slopeDepth * slopeDepth),
      20,
      {
        isStatic: true,
        angle: -slopeAngle,
        friction: 0.08,
        restitution: 0.1,
        label: "floor-right-slope",
      },
    ),
    // 左右侧墙（防止爱心直接从侧面飞出去太突兀）
    Matter.Bodies.rectangle(-20, height * 0.4, 40, height, { isStatic: true, label: "wall-l" }),
    Matter.Bodies.rectangle(width + 20, height * 0.4, 40, height, { isStatic: true, label: "wall-r" }),
  ];
}

// ============================================================
// 固定装饰：左右大棒棒糖 + 顶部糖果链（舞台装饰）
// ============================================================
type Lollipop = {
  x: number; // 0-1
  baseY: number; // 0-1
  size: number;
  hue: number;
  stickLean: number;
  phase: number;
};

const LOLLIPOPS: Lollipop[] = [
  { x: 0.07, baseY: 0.82, size: 90, hue: ROSE_H, stickLean: 0.12, phase: 0 },
  { x: 0.93, baseY: 0.80, size: 80, hue: PEACH_H, stickLean: -0.08, phase: 1.8 },
  { x: 0.18, baseY: 0.92, size: 55, hue: LAVENDER_H, stickLean: -0.06, phase: 3.2 },
  { x: 0.82, baseY: 0.91, size: 60, hue: ROSE_H, stickLean: 0.09, phase: 4.7 },
];

function drawLollipop(g: Graphics, cx: number, cy: number, size: number, hue: number, lean: number, swirlT: number, glow: number) {
  // 棒子
  const stickTop = { x: cx, y: cy - size * 0.15 };
  const stickBot = { x: cx + lean * size * 1.2, y: cy + size * 0.9 };
  g.moveTo(stickTop.x, stickTop.y);
  g.lineTo(stickBot.x, stickBot.y);
  g.stroke({ color: hslNumber(ROSE_H, 20, 75), width: size * 0.07, alpha: 0.7, cap: "round" });

  // 糖（圆盘带旋涡）
  const r = size * 0.5;
  const numSwirls = 3;
  for (let i = 0; i < numSwirls; i++) {
    const sr = r * (1 - i * 0.18);
    const hueSwirl = (hue + i * 20) % 360;
    g.circle(cx, cy, sr * 2);
    g.fill({ color: hslNumber(hueSwirl, 70, 68 + i * 4), alpha: 0.75 });
  }
  // 旋涡高光条纹
  for (let i = 0; i < 5; i++) {
    const a = swirlT + i * 1.25;
    g.arc(cx, cy, r * 0.9, a - 0.25, a + 0.25);
    g.stroke({ color: hslNumber(hue, 30, 92), width: r * 0.15, alpha: 0.35 + glow * 0.2, cap: "round" });
  }
  // 高光点
  g.circle(cx - r * 0.25, cy - r * 0.3, r * 0.25);
  g.fill({ color: 0xffffff, alpha: 0.35 + glow * 0.15 });
}

function drawCandyGarland(g: Graphics, width: number, height: number, t: number, rms: number, mid: number, treble: number, intensity: number) {
  // 顶部糖果链：挂在画面上方，随音乐晃动
  const garlandY = height * 0.08;
  const segments = 14;
  for (let i = 0; i <= segments; i++) {
    const nx = i / segments;
    const sag = Math.sin(nx * Math.PI) * height * 0.09 * (1 + mid * 0.2);
    const x = nx * width;
    const y = garlandY + sag + Math.sin(t * 0.8 + i * 0.5) * 4;
    const hue = CANDY_HUES[i % 3]!;
    const sz = 10 + Math.sin(i * 1.7 + t * 0.3) * 3 + treble * 8 * intensity;
    // 链线
    if (i > 0) {
      const prevNx = (i - 1) / segments;
      const prevSag = Math.sin(prevNx * Math.PI) * height * 0.09;
      const px = prevNx * width;
      const py = garlandY + prevSag + Math.sin(t * 0.8 + (i - 1) * 0.5) * 4;
      g.moveTo(px, py);
      g.lineTo(x, y);
      g.stroke({ color: hslNumber(ROSE_H, 30, 80), width: 1.5, alpha: 0.4 });
    }
    // 糖果
    g.circle(x, y, sz);
    g.fill({ color: hslNumber(hue, 70, 70), alpha: 0.85 + rms * 0.1 });
    g.circle(x - sz * 0.25, y - sz * 0.25, sz * 0.3);
    g.fill({ color: 0xffffff, alpha: 0.35 });
  }
}

function drawSoftPillars(g: Graphics, width: number, height: number, t: number, mid: number, rms: number, intensity: number) {
  const segs = 20;
  for (const pil of PILLARS) {
    const drift = Math.sin(t * pil.speed + pil.phase) * 0.015 + Math.sin(t * pil.speed * 1.7 + pil.phase * 1.3) * 0.008;
    const cx = (pil.center + drift * mid * 0.8) * width;
    const halfW = pil.width * width * 0.5;
    for (let s = 0; s < segs; s++) {
      const ny = s / (segs - 1);
      const y = ny * height;
      const vertFalloff = 0.9 - Math.pow(ny, 1.4) * 0.55;
      const breath = 0.55 + Math.sin(t * pil.speed * 0.9 + pil.phase + ny * 1.2) * 0.12 + mid * 0.18;
      for (let layer = 0; layer < 3; layer++) {
        const w = halfW * (1 - layer * 0.32);
        const alpha = (0.05 + layer * 0.06) * vertFalloff * breath * (0.7 + rms * 0.4) * intensity;
        const sat = 32 + layer * 6;
        const light = 82 + layer * 3;
        g.rect(cx - w, y, w * 2, height / segs + 1);
        g.fill({ color: hslNumber(pil.hue, sat, light), alpha });
      }
    }
  }
}

function drawCreamMist(g: Graphics, width: number, height: number, t: number, rms: number, mid: number, bass: number, intensity: number) {
  const blobs = 6;
  for (let i = 0; i < blobs; i++) {
    const px = 0.5 + Math.sin(t * (0.06 + i * 0.014) + i * 1.3) * (0.34 + mid * 0.06);
    const py = 0.55 + Math.cos(t * (0.05 + i * 0.012) + i * 2.1) * (0.28 + bass * 0.04);
    const cx = px * width;
    const cy = py * height;
    const r = Math.min(width, height) * (0.28 + rms * 0.1 + Math.sin(t * 0.4 + i) * 0.03) * (0.9 + intensity * 0.12);
    const hue = CANDY_HUES[i % 3]!;
    for (let l = 0; l < 3; l++) {
      const a = (l / 3) * Math.PI * 2 + i;
      const ox = Math.cos(a) * r * 0.2;
      const oy = Math.sin(a) * r * 0.16;
      g.ellipse(cx + ox, cy + oy, r * (0.65 + l * 0.12), r * (0.5 + l * 0.1));
      g.fill({ color: hslNumber(hue, 38, 82), alpha: 0.12 + mid * 0.04 + rms * 0.04 });
    }
  }
}

function drawGradientBackdrop(g: Graphics, width: number, height: number, rms: number) {
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const y0 = (height / steps) * i;
    const y1 = (height / steps) * (i + 1);
    const nt = i / (steps - 1);
    const topColor = hslNumber(LAVENDER_H, 24, 92);
    const midColor = hslNumber(PEACH_H, 35, 86);
    const botColor = hslNumber(ROSE_H, 35, 60);
    const color = nt < 0.4 ? topColor : nt < 0.75 ? midColor : botColor;
    const alpha = nt < 0.4 ? 0.5 - nt * 0.4 : 0.35 + (nt - 0.4) * 0.5;
    g.rect(0, y0, width, y1 - y0 + 1);
    g.fill({ color, alpha });
  }
  g.rect(0, 0, width, height * 0.22);
  g.fill({ color: 0xfff2f6, alpha: 0.08 + rms * 0.04 });
}

// ============================================================
// V形地面渲染（与物理对应）
// ============================================================
function drawStageFloor(g: Graphics, width: number, height: number, rms: number, bass: number) {
  const floorY = height;
  const flatWidth = width * 0.28;
  const flatLeft = (width - flatWidth) / 2;
  const flatRight = flatLeft + flatWidth;
  const floorGlow = 0.5 + bass * 0.5;

  // 中间平台（发光舞台）
  g.rect(flatLeft - 30, floorY - 8, flatWidth + 60, 40);
  g.fill({ color: hslNumber(ROSE_H, 50, 35 + floorGlow * 10), alpha: 0.85 });
  // 平台高光边
  g.rect(flatLeft - 30, floorY - 8, flatWidth + 60, 3);
  g.fill({ color: hslNumber(PEACH_H, 60, 70), alpha: 0.5 + rms * 0.3 });

  // 两侧斜坡（暗玫瑰色）
  // 左斜坡
  g.poly([
    { x: flatLeft, y: floorY },
    { x: -40, y: floorY + 260 },
    { x: -40, y: floorY + 300 },
    { x: flatLeft, y: floorY + 40 },
  ]);
  g.fill({ color: hslNumber(ROSE_H, 42, 26), alpha: 0.7 });
  // 右斜坡
  g.poly([
    { x: flatRight, y: floorY },
    { x: width + 40, y: floorY + 260 },
    { x: width + 40, y: floorY + 300 },
    { x: flatRight, y: floorY + 40 },
  ]);
  g.fill({ color: hslNumber(ROSE_H, 42, 26), alpha: 0.7 });
}

export function SweetPartyScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#f6e8ec"
      setup={(app, featuresRef, intensityRef) => {
        const backdrop = new Graphics();
        const mist = new Graphics();
        const pillars = new Graphics();
        const garland = new Graphics();
        const floor = new Graphics();
        const lollipops = new Graphics();
        const starLayer = new Graphics();
        const glowShapes = new Graphics();
        const shapes = new Graphics();
        app.stage.addChild(backdrop, mist, pillars, floor, garland, lollipops, starLayer, glowShapes, shapes);

        // 星星柔和发光
        starLayer.filters = [new GlowFilter({
          distance: 8,
          outerStrength: 1.0,
          innerStrength: 0,
          color: 0xffd6e8,
          quality: 0.2,
          alpha: 0.6,
        }) as unknown as Filter];

        // 背景预生成星星：散布在天空区域，treble时闪烁
        const stars = Array.from({ length: 45 }, () => ({
          nx: Math.random(),
          ny: 0.04 + Math.random() * 0.48,
          r: 0.6 + Math.random() * 1.6,
          baseAlpha: 0.15 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
          hue: CANDY_HUES[Math.floor(Math.random() * CANDY_HUES.length)]!,
        }));

        mist.filters = [new BlurFilter({ strength: 28, quality: 3 })];
        pillars.filters = [new BlurFilter({ strength: 10, quality: 2 })];

        const glowFilter = new GlowFilter({
          distance: 20,
          outerStrength: 1.2,
          innerStrength: 0.1,
          color: hslNumber(ROSE_H, 78, 62),
          quality: 0.2,
          alpha: 0.6,
        });
        const godrayFilter = new GodrayFilter({
          angle: 24,
          gain: 0.10,
          lacunarity: 2.2,
          alpha: 0.16,
        });
        const rgbFilter = new RGBSplitFilter([-0.5, 0], [0, 0.3], [0.5, 0]);
        pillars.filters = [
          new BlurFilter({ strength: 10, quality: 2 }) as unknown as Filter,
          godrayFilter as unknown as Filter,
        ];
        lollipops.filters = [
          new GlowFilter({
            distance: 14,
            outerStrength: 0.7,
            innerStrength: 0.05,
            color: hslNumber(PEACH_H, 70, 70),
            quality: 0.2,
            alpha: 0.5,
          }) as unknown as Filter,
        ];
        glowShapes.filters = [glowFilter as unknown as Filter];
        shapes.filters = [rgbFilter as unknown as Filter];

        const audio = createAudioResponse(featuresRef);
        // 基础重力调小，随音乐能量加速
        const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.7, scale: 0.001 } });
        const world = engine.world;
        const particles: Particle[] = [];
        let bounds = { width: 0, height: 0 };
        let walls: Matter.Body[] = [];

        let t = 0;
        let shake = 0;
        let splitCurrent = 0;

        const rebuildWalls = (width: number, height: number) => {
          if (walls.length) Matter.Composite.remove(world, walls);
          bounds = { width, height };
          walls = buildSlopedFloor(width, height);
          Matter.Composite.add(world, walls);
        };

        rebuildWalls(app.renderer.width, app.renderer.height);
        // 开场少量
        for (let i = 0; i < 5; i++) {
          addHeart(particles, world, app.renderer.width, app.renderer.height, 0.8);
        }

        const tick = () => {
          const dt = Math.min(0.033, app.ticker.deltaMS / 1000);
          t += dt;
          audio.update(dt);
          const { width, height } = app.renderer;
          const intensity = intensityRef.current;
          const { bass, mid, treble, rms, beat } = featuresRef.current;

          if (width !== bounds.width || height !== bounds.height) {
            rebuildWalls(width, height);
          }

          // 动态重力：无音乐时慢飘（像羽毛），有音乐时随rms和bass加快下落
          const section = audio.section;
          let fallSpeedMul = 0.6; // 基础慢
          let gravityY = 0.5;
          if (section === "intro" || section === "breakdown") {
            fallSpeedMul = 0.5;
            gravityY = 0.35;
          } else if (section === "verse") {
            fallSpeedMul = 0.8;
            gravityY = 0.6;
          } else if (section === "buildup") {
            fallSpeedMul = 0.9 + audio.tension * 0.5;
            gravityY = 0.6 + audio.tension * 0.3;
          } else if (section === "drop") {
            fallSpeedMul = 1.3 + audio.release * 0.4;
            gravityY = 0.9 + audio.release * 0.3;
          }
          // rms微调
          fallSpeedMul *= 0.7 + rms * 0.6;
          gravityY += rms * 0.2 + bass * 0.15;
          engine.gravity.y = Math.max(0.2, Math.min(1.3, gravityY));

          // 节拍震动
          if ((audio.impact > 0.25 || beat) && rms > 0.05) {
            shake = Math.max(shake, audio.impact * 8 * intensity);
          }
          shake *= 0.85;

          // 粒子数目标：音乐时更多
          const musicOn = rms > 0.04;
          const targetCap = musicOn
            ? Math.min(PARTICLE_SOFT_CAP, 70 + Math.floor(rms * 80 + treble * 50 * intensity))
            : PARTICLE_IDLE_CAP;

          // 生成频率
          const under = particles.length < targetCap;
          const baseRate = musicOn ? 0.12 + treble * 0.1 * intensity + rms * 0.08 : 0.025;

          if (under && Math.random() < baseRate) {
            addHeart(particles, world, width, height, fallSpeedMul);
          }

          // 节拍爆发
          if (musicOn && (Boolean(beat) || audio.impact > 0.35)) {
            const burstMax = 1 + Math.floor(audio.impact * 2 * intensity);
            for (let b = 0; b < burstMax; b++) {
              if (particles.length >= PARTICLE_SOFT_CAP) break;
              addHeart(particles, world, width, height, fallSpeedMul * 1.2);
            }
          }

          // 落地检测：一旦触碰平台/斜坡，施加横向持续推力让它们滚出去
          for (const p of particles) {
            if (!p.landed) {
              // 速度很小且接近底部 = 刚落地
              const speed = Math.hypot(p.body.velocity.x, p.body.velocity.y);
              if (speed < 1.5 && p.body.position.y > height - p.size * 1.5) {
                p.landed = true;
                p.landTime = t;
                // 给一个随机方向的初推（左或右）
                const dir = Math.random() < 0.5 ? -1 : 1;
                Matter.Body.setVelocity(p.body, {
                  x: dir * (1.2 + Math.random() * 1.5),
                  y: -1.5 - Math.random() * 0.5,
                });
                Matter.Body.setAngularVelocity(p.body, dir * 0.12);
              }
            } else {
              // 落地后持续向外侧施加重力分量（沿斜坡方向）
              const onLeftHalf = p.body.position.x < width / 2;
              const pushDir = onLeftHalf ? -1 : 1;
              Matter.Body.applyForce(p.body, p.body.position, {
                x: pushDir * 0.0004 * intensity * (1 + mid * 0.5),
                y: 0,
              });
              // 落地久了加速（给点冲量确保滚出）
              const age = t - p.landTime;
              if (age > 1.5) {
                Matter.Body.applyForce(p.body, p.body.position, {
                  x: pushDir * 0.0008 * intensity,
                  y: -0.0001,
                });
              }
            }
          }

          // 节拍震动（影响落地和接近地面的心）
          if (shake > 0.3) {
            for (const p of particles) {
              if (p.body.position.y < height - 120) continue;
              const dir = p.body.position.x < width * 0.5 ? -1 : 1;
              Matter.Body.applyForce(p.body, p.body.position, {
                x: dir * shake * 0.00015 * intensity,
                y: -shake * 0.0001,
              });
            }
          }

          Matter.Engine.update(engine, dt * 1000);

          // 出屏清理：滚出屏幕两侧或底部就销毁
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]!;
            const { x, y } = p.body.position;
            if (y > height + 120 || x < -p.size * 2 - 40 || x > width + p.size * 2 + 40) {
              Matter.Composite.remove(world, p.body);
              particles.splice(i, 1);
            }
          }

          // 硬顶保险
          while (particles.length > PARTICLE_SOFT_CAP) {
            const oldest = particles.shift();
            if (oldest) Matter.Composite.remove(world, oldest.body);
          }

          // 清空图层
          backdrop.clear();
          mist.clear();
          pillars.clear();
          garland.clear();
          floor.clear();
          lollipops.clear();
          starLayer.clear();
          glowShapes.clear();
          shapes.clear();

          // 远景
          drawGradientBackdrop(backdrop, width, height, rms);
          drawCreamMist(mist, width, height, t, rms, mid, bass, intensity);

          // 背景星星
          const starTwinkle = 0.5 + treble * 1.2 + rms * 0.3;
          for (const s of stars) {
            const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase));
            const a = s.baseAlpha * twinkle * starTwinkle;
            const col = hslNumber(s.hue, 50, 75);
            starLayer.circle(s.nx * width, s.ny * height, s.r * (0.7 + twinkle * 0.5));
            starLayer.fill({ color: col, alpha: Math.min(0.9, a) });
            // 十字光芒（亮星）
            if (s.r > 1.2 && twinkle > 0.6) {
              const sx = s.nx * width;
              const sy = s.ny * height;
              const len = s.r * 5 * twinkle;
              starLayer.moveTo(sx - len, sy);
              starLayer.lineTo(sx + len, sy);
              starLayer.stroke({ color: col, alpha: a * 0.3, width: 0.8 });
              starLayer.moveTo(sx, sy - len);
              starLayer.lineTo(sx, sy + len);
              starLayer.stroke({ color: col, alpha: a * 0.3, width: 0.8 });
            }
          }

          // 中景：光柱
          drawSoftPillars(pillars, width, height, t, mid, rms, intensity);
          godrayFilter.time = t * 0.12;
          godrayFilter.gain = 0.08 + rms * 0.05 * intensity;

          // 地面（V形舞台）
          drawStageFloor(floor, width, height, rms, bass);

          // 固定装饰：顶部糖果链
          drawCandyGarland(garland, width, height, t, rms, mid, treble, intensity);

          // 固定装饰：棒棒糖
          for (const lol of LOLLIPOPS) {
            const cx = lol.x * width;
            const cy = lol.baseY * height + Math.sin(t * 0.6 + lol.phase) * 6 * (1 + mid * 0.5);
            const sway = Math.sin(t * 0.9 + lol.phase) * lol.stickLean;
            const glow = rms * 0.5 + treble * 0.5;
            drawLollipop(lollipops, cx + sway * 20, cy, lol.size * (1 + rms * 0.08 * intensity), lol.hue, lol.stickLean + sway, t * 1.2 + lol.phase, glow);
          }

          // 爱心渲染优化：
          // - 空中（未落地）：填充 + glow + rgb偏移（视觉焦点）
          // - 已落地：只画描边（弱glow），快速滑出屏幕无需精细渲染
          glowFilter.outerStrength = 0.8 + treble * 0.8 * intensity + rms * 0.4;

          const splitTarget = musicOn ? 0.25 + audio.impact * 0.8 * intensity + treble * 0.25 * intensity : 0.15;
          splitCurrent += (splitTarget - splitCurrent) * 0.12;
          rgbFilter.red = [-splitCurrent, 0];
          rgbFilter.green = [0, splitCurrent * 0.35];
          rgbFilter.blue = [splitCurrent, 0];

          for (const p of particles) {
            const { x, y } = p.body.position;

            if (!p.landed) {
              // 空中的心：填充+描边+glow 全效果
              const sat = 50 + treble * 15 * intensity;
              const light = 62 + rms * 10 * intensity;
              const fillCol = hslNumber(p.hue, sat, light);
              fillHeartShape(shapes, x, y, p.size, fillCol, 0.7, p.body.angle);

              const strokeCol = hslColor(p.hue, sat + 10, light + 8);
              strokeHeartOutline(shapes, x, y, p.size, strokeCol, 0.85, Math.max(1.2, p.size * 0.07), p.body.angle);

              const glowCol = hslNumber(p.hue, 82, 60);
              strokeHeartOutline(glowShapes, x, y, p.size * 1.1, glowCol, 0.2 + treble * 0.1 * intensity + rms * 0.08, p.size * 0.2, p.body.angle);
            } else {
              // 落地滚动中：只画简化描边，减少性能负担
              const age = t - p.landTime;
              const fadeAlpha = Math.max(0.25, 0.65 - age * 0.25);
              const col = hslColor(p.hue, 40, 55);
              strokeHeartOutline(shapes, x, y, p.size * 0.9, col, fadeAlpha, Math.max(1, p.size * 0.05), p.body.angle);
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
