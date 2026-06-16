import type { AudioFeatures } from "~/lib/audio/types";

export function featuresToPalette(features: AudioFeatures) {
  const { bass, mid, treble } = features;
  return {
    hue: 260 + mid * 50 + treble * 30,
    fog: `hsl(${240 + mid * 20}, 35%, ${6 + bass * 6}%)`,
    glow: `hsl(${280 + bass * 40}, 75%, ${55 + treble * 20}%)`,
    accent: `hsl(${320 + treble * 40}, 65%, ${60 + bass * 15}%)`,
    mist: `hsl(${200 + mid * 30}, 50%, ${70 + treble * 10}%)`,
  };
}

export function lerpHue(base: number, target: number, t: number) {
  return base + (target - base) * t;
}
