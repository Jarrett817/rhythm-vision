import type { Graphics } from "pixi.js";
import type { AudioFeatures } from "~/lib/audio/types";
import type { PixiTheme } from "~/features/visualizers/shared/themes";

/** 流动极光色块背景 */
export function drawAuroraBlobs(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  features: AudioFeatures,
  theme: PixiTheme,
  intensity: number,
) {
  const { rms, mid, bass } = features;
  for (let i = 0; i < 5; i++) {
    const cx =
      width * (0.5 + Math.sin(t * 0.15 + i * 1.3) * (0.35 + mid * 0.1));
    const cy =
      height * (0.45 + Math.cos(t * 0.12 + i * 2.1) * (0.3 + bass * 0.08));
    const r =
      Math.min(width, height) *
      (0.22 + rms * 0.12 + Math.sin(t * 0.8 + i) * 0.04) *
      intensity;
    g.circle(cx, cy, r);
    g.fill({
      color: theme.blobs[i % 3]!,
      alpha: 0.1 + mid * 0.12,
    });
  }
}

/** 柔光微粒 */
export function drawSoftMotes(
  g: Graphics,
  motes: { x: number; y: number; phase: number; size: number }[],
  width: number,
  height: number,
  t: number,
  features: AudioFeatures,
  accent: string,
  intensity: number,
) {
  const { rms, treble } = features;
  for (const m of motes) {
    const pulse = 0.5 + Math.sin(t * 2.5 + m.phase) * 0.5;
    const x = (m.x + Math.sin(t + m.phase) * 30 * intensity) % width;
    const y = (m.y + Math.cos(t * 0.6 + m.phase) * 20) % height;
    const size = m.size * (1 + pulse + treble * 2);
    g.circle(x, y, size * 2.5);
    g.fill({ color: accent, alpha: (0.04 + pulse * 0.08) * (0.5 + rms * 2) });
    g.circle(x, y, size);
    g.fill({ color: accent, alpha: 0.15 + pulse * 0.25 });
  }
}

/** 从中心发散的柔光射线 */
export function drawLightRays(
  g: Graphics,
  width: number,
  height: number,
  t: number,
  features: AudioFeatures,
  color: string,
  intensity: number,
) {
  const cx = width / 2;
  const cy = height * 0.35;
  const { rms, mid } = features;
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + t * 0.05;
    const len = Math.min(width, height) * (0.4 + rms * 0.3) * intensity;
    const spread = Math.sin(t * 0.3 + i) * 0.15;
    const x2 = cx + Math.cos(angle + spread) * len;
    const y2 = cy + Math.sin(angle + spread) * len;
    g.moveTo(cx, cy);
    g.lineTo(x2, y2);
    g.stroke({
      color,
      width: 2 + mid * 8,
      alpha: 0.03 + rms * 0.08,
    });
  }
}

/** 垂直渐变底色 */
export function drawGradientWash(
  g: Graphics,
  width: number,
  height: number,
  top: string,
  bottom: string,
) {
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const y0 = (height / steps) * i;
    const y1 = (height / steps) * (i + 1);
    const t = i / (steps - 1);
    g.rect(0, y0, width, y1 - y0 + 1);
    g.fill({
      color: t < 0.5 ? top : bottom,
      alpha: 0.35 + (1 - t) * 0.25,
    });
  }
}
