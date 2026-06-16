import type { AudioFeatures } from "~/lib/audio/types";

/** 合成频谱，模拟不同情绪的律动预览 */
export function synthesizeDemoFeatures(time: number): AudioFeatures {
  const binCount = 128;
  const frequencyData = new Uint8Array(binCount);
  const waveformData = new Uint8Array(256);

  const pulse = 0.5 + Math.sin(time * 1.2) * 0.25;
  const swell = 0.5 + Math.sin(time * 0.35) * 0.35;
  const shimmer = Math.sin(time * 2.4) * 0.5 + 0.5;

  for (let i = 0; i < binCount; i++) {
    const t = i / binCount;
    const wave =
      Math.sin(time * 2 + t * 8) * 0.3 +
      Math.sin(time * 0.7 + t * 3) * 0.4 +
      Math.exp(-t * 2) * swell;
    frequencyData[i] = Math.floor(Math.max(0, Math.min(1, wave + pulse * 0.3)) * 220);
  }

  for (let i = 0; i < waveformData.length; i++) {
    const t = i / waveformData.length;
    waveformData[i] = Math.floor(
      128 + Math.sin(time * 3 + t * Math.PI * 4) * 40 * pulse,
    );
  }

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;
  const third = Math.floor(binCount / 3);
  for (let i = 0; i < third; i++) bassSum += frequencyData[i]!;
  for (let i = third; i < third * 2; i++) midSum += frequencyData[i]!;
  for (let i = third * 2; i < binCount; i++) trebleSum += frequencyData[i]!;

  const rms = 0.12 + pulse * 0.18 + swell * 0.08;

  return {
    frequencyData,
    waveformData,
    rms,
    bass: bassSum / third / 255,
    mid: midSum / third / 255,
    treble: trebleSum / (binCount - third * 2) / 255 + shimmer * 0.1,
  };
}
