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

const STRIPE_COUNT = 9;
const CANDY_HUES = [330, 18, 42, 195, 265, 155, 85, 310, 55, 175];

type ParticleKind = "heart" | "star";
type SpawnZone = "top" | "mid";

type Particle = {
  kind: ParticleKind;
  hue: number;
  size: number;
  body: Matter.Body;
};

/** Pixi 不接受科学计数法 HSL，需归一化为整数 */
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
    frictionAir: 0.01,
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
  const r = Math.random();
  if (r < 0.42) return "top";
  return "mid";
}

function spawnParticle(
  width: number,
  height: number,
  kind: ParticleKind,
  zone = pickSpawnZone(),
): Particle {
  const size = 34 + Math.random() * 34;
  const x = size + Math.random() * Math.max(size, width - size * 2);
  const y =
    zone === "top"
      ? -size - Math.random() * 80
      : height * (0.08 + Math.random() * 0.52);

  const body = createParticleBody(kind, x, y, size);
  if (zone === "mid") {
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 1.2,
      y: 0.8 + Math.random() * 2.2,
    });
  }

  return {
    kind,
    size,
    hue: CANDY_HUES[Math.floor(Math.random() * CANDY_HUES.length)]!,
    body,
  };
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
  Matter.Body.setAngularVelocity(p.body, (Math.random() - 0.5) * 0.1);
}

function drawDynamicStripes(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  stripes: { hue: number; phase: number; speed: number }[],
  mid: number,
  bass: number,
  rms: number,
  beat: boolean,
  intensity: number,
) {
  const stripeW = width / STRIPE_COUNT;
  const drift = (t * (10 + mid * 18 * intensity) + bass * 8) % stripeW;
  const pulse = beat ? 1.08 : 1 + bass * 0.18 + rms * 0.12;

  for (let i = -1; i <= STRIPE_COUNT; i++) {
    const idx = ((i % STRIPE_COUNT) + STRIPE_COUNT) % STRIPE_COUNT;
    const stripe = stripes[idx]!;
    const wave =
      Math.sin(t * stripe.speed * 0.35 + stripe.phase) * 4 * (1 + mid * 0.35 * intensity) +
      Math.sin(t * 0.7 + i * 0.9) * 3 * pulse;
    const x = i * stripeW - drift + wave;
    const hue =
      (stripe.hue +
        t * 10 +
        mid * 24 * intensity +
        i * 14 +
        Math.sin(t * 0.45 + stripe.phase) * 8 * pulse) %
      360;
    const sat = 36 + Math.sin(t * 0.55 + i * 0.6) * 6 + rms * 10 * intensity;
    const light =
      74 +
      Math.sin(t * 0.4 + stripe.phase) * 5 +
      bass * 5 * intensity +
      (i % 2) * 4;

    g.rect(x - 2, 0, stripeW + 6, height);
    g.fill({
      color: hslColor(hue, sat, light),
      alpha: 0.92,
    });
  }

  // 叠一层斜向高光带，增强流动感
  for (let band = 0; band < 3; band++) {
    const bx =
      ((t * (60 + band * 20) + band * width * 0.33) % (width + 200)) - 100;
    g.rect(bx, 0, 48 + bass * 40, height);
    g.fill({
      color: hslColor(band * 80 + t * 30, 40, 88),
      alpha: 0.06 + rms * 0.08 * intensity,
    });
  }
}

export function SweetPartyScene(props: VisualizerProps) {
  return (
    <PixiVisualizer
      {...props}
      bg="#f5eef8"
      setup={(app, featuresRef, intensityRef) => {
        const bg = new Graphics();
        const rays = new Graphics();
        const shapes = new Graphics();
        app.stage.addChild(bg, rays, shapes);

        const glowFilter = new GlowFilter({
          distance: 24,
          outerStrength: 1.6,
          innerStrength: 0.15,
          color: 0xff66cc,
          quality: 0.22,
          alpha: 0.8,
        });
        const godrayFilter = new GodrayFilter({
          angle: 28,
          gain: 0.22,
          lacunarity: 2.1,
          alpha: 0.28,
        });
        const rgbFilter = new RGBSplitFilter([-1.2, 0], [0, 0.8], [1.2, 0]);
        rays.filters = [godrayFilter as unknown as Filter];
        shapes.filters = [glowFilter as unknown as Filter, rgbFilter as unknown as Filter];

        const audio = createAudioResponse(featuresRef);
        const engine = Matter.Engine.create({
          gravity: { x: 0, y: 1.35, scale: 0.001 },
        });
        const world = engine.world;
        const particles: Particle[] = [];
        let bounds = { width: 0, height: 0, floorY: 0 };
        let walls: Matter.Body[] = [];

        const stripes = Array.from({ length: STRIPE_COUNT }, (_, i) => ({
          hue: CANDY_HUES[i % CANDY_HUES.length]!,
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.4,
        }));

        let t = 0;
        let shake = 0;

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
        for (let i = 0; i < 46; i++) {
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

          if (audio.impact > 0.2 || beat) {
            shake = Math.max(shake, audio.impact * 16 * intensity);
          }
          shake *= 0.85;

          const baseRate = 0.22 + treble * 0.1 * intensity + rms * 0.07 + bass * 0.04;
          const perFrame = 1;

          for (let n = 0; n < perFrame; n++) {
            if (Math.random() < baseRate) {
              addParticle(particles, world, width, height);
            }
          }

          if (Boolean(beat) || audio.impact > 0.32) {
            const burst = 2 + Math.floor((audio.impact + rms) * 3 * intensity);
            for (let b = 0; b < burst; b++) {
              addParticle(
                particles,
                world,
                width,
                height,
                Math.random() < 0.55 ? "mid" : "top",
              );
            }
          }

          if (shake > 0.4) {
            const floorY = bounds.floorY;
            for (const p of particles) {
              if (p.body.position.y < floorY - 60) continue;
              const depth = Math.min(
                1,
                (p.body.position.y - (floorY - 140)) / 140,
              );
              const side = p.body.position.x < width * 0.5 ? -1 : 1;
              const force = shake * (0.35 + depth) * 0.00014 * intensity;
              Matter.Body.applyForce(p.body, p.body.position, {
                x: force * side * (1 + bass * 2.2),
                y: -force * 0.32,
              });
            }
          }

          for (const p of particles) {
            if (p.body.isSleeping) continue;
            Matter.Body.applyForce(p.body, p.body.position, {
              x:
                (Math.sin(t * 1.2 + p.body.position.x * 0.01) * mid * 0.000018 +
                  (p.body.position.x < width * 0.5 ? -1 : 1) * 0.000018) *
                intensity,
              y: 0,
            });
          }

          Matter.Engine.update(engine, 1000 / 60);

          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]!;
            const { x, y } = p.body.position;
            if (y > height + 120 || x < -80 || x > width + 80) {
              Matter.Composite.remove(world, p.body);
              particles.splice(i, 1);
            }
          }

          bg.clear();
          rays.clear();
          shapes.clear();

          godrayFilter.time = t * 0.22;
          godrayFilter.gain = 0.16 + rms * 0.14;
          glowFilter.outerStrength = 1.15 + treble * 1.4 + rms * 0.7;
          glowFilter.color = hslNumber(315 + mid * 35, 90, 64);
          const split = 0.45 + treble * 1.8 + audio.impact * 1.2;
          rgbFilter.red = [-split, 0];
          rgbFilter.green = [0, split * 0.45];
          rgbFilter.blue = [split, 0];

          rays.rect(0, 0, width, height);
          rays.fill({ color: 0xffffff, alpha: 0.18 + rms * 0.08 });

          drawDynamicStripes(
            bg,
            width,
            height,
            t,
            stripes,
            mid,
            bass,
            rms,
            Boolean(beat),
            intensity,
          );

          const sorted = [...particles].sort(
            (a, b) => a.body.position.y - b.body.position.y,
          );

          for (const p of sorted) {
            const { x, y } = p.body.position;
            const sat = 34 + treble * 16;
            const light = 58 + rms * 14;
            const color = hslColor(p.hue, sat, light);
            const depth = Math.min(1, (y - bounds.floorY + 120) / 160);
            const alpha = 0.76 + Math.max(0, depth) * 0.2;
            const lineW = Math.max(1.1, p.size * 0.09);

            if (p.kind === "heart") {
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
