import { Graphics } from "pixi.js";
import Matter from "matter-js";
import decomp from "poly-decomp";
import type { VisualizerProps } from "~/features/visualizers/catalog";
import { PixiVisualizer } from "~/features/visualizers/shared/pixi-visualizer";
import { createAudioResponse } from "~/lib/audio/response";

Matter.Common.setDecomp(decomp);

const STRIPE_COUNT = 20;
const MAX_PARTICLES = 220;
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
  const size = 10 + Math.random() * 16;
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
  const drift = (t * (42 + mid * 90 * intensity) + bass * 30) % stripeW;
  const pulse = beat ? 1.35 : 1 + bass * 0.5 + rms * 0.35;

  for (let i = -1; i <= STRIPE_COUNT; i++) {
    const idx = ((i % STRIPE_COUNT) + STRIPE_COUNT) % STRIPE_COUNT;
    const stripe = stripes[idx]!;
    const wave =
      Math.sin(t * stripe.speed + stripe.phase) * 10 * (1 + mid * intensity) +
      Math.sin(t * 2.4 + i * 0.9) * 6 * pulse;
    const x = i * stripeW - drift + wave;
    const hue =
      (stripe.hue +
        t * 48 +
        mid * 100 * intensity +
        i * 14 +
        Math.sin(t * 1.8 + stripe.phase) * 28 * pulse) %
      360;
    const sat = 30 + Math.sin(t * 2.2 + i * 0.6) * 14 + rms * 22 * intensity;
    const light =
      72 +
      Math.sin(t * 1.6 + stripe.phase) * 12 +
      bass * 14 * intensity +
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
        const shapes = new Graphics();
        app.stage.addChild(bg, shapes);

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
            Matter.Bodies.rectangle(width * 0.5, floorY + 22, width + 200, 44, {
              isStatic: true,
              friction: 0.62,
              restitution: 0.12,
              label: "floor",
            }),
            Matter.Bodies.rectangle(-40, height * 0.5, 80, height * 1.6, {
              isStatic: true,
              label: "wall",
            }),
            Matter.Bodies.rectangle(width + 40, height * 0.5, 80, height * 1.6, {
              isStatic: true,
              label: "wall",
            }),
          ];
          Matter.Composite.add(world, walls);
        };

        rebuildWalls(app.renderer.width, app.renderer.height);

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

          const room = MAX_PARTICLES - particles.length;
          if (room > 0) {
            const baseRate =
              0.22 + treble * 0.28 * intensity + rms * 0.18 + bass * 0.08;
            const perFrame = Math.min(room, 1 + Math.floor(baseRate * 2.5));

            for (let n = 0; n < perFrame; n++) {
              if (Math.random() < baseRate) {
                addParticle(particles, world, width, height);
              }
            }

            if (Boolean(beat) || audio.impact > 0.32) {
              const burst = Math.min(
                room,
                3 + Math.floor((audio.impact + rms) * 10 * intensity),
              );
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
          }

          if (shake > 0.4) {
            const floorY = bounds.floorY;
            for (const p of particles) {
              if (p.body.position.y < floorY - 60) continue;
              const depth = Math.min(
                1,
                (p.body.position.y - (floorY - 140)) / 140,
              );
              const force = shake * (0.35 + depth) * 0.00004 * intensity;
              Matter.Body.applyForce(p.body, p.body.position, {
                x: force * (Math.random() > 0.5 ? 1 : -1) * (1 + bass * 2.2),
                y: -force * 0.4,
              });
            }
          }

          for (const p of particles) {
            if (p.body.isSleeping) continue;
            Matter.Body.applyForce(p.body, p.body.position, {
              x:
                Math.sin(t * 1.8 + p.body.position.x * 0.015) *
                mid *
                0.000014 *
                intensity,
              y: 0,
            });
          }

          Matter.Engine.update(engine, 1000 / 60);

          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]!;
            const { x, y } = p.body.position;
            if (y > height + 100 || x < -100 || x > width + 100) {
              Matter.Composite.remove(world, p.body);
              particles.splice(i, 1);
            }
          }

          while (particles.length > MAX_PARTICLES) {
            const idx = particles.findIndex((p) => p.body.isSleeping);
            const removeAt = idx >= 0 ? idx : 0;
            const [removed] = particles.splice(removeAt, 1);
            if (removed) Matter.Composite.remove(world, removed.body);
          }

          bg.clear();
          shapes.clear();

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
