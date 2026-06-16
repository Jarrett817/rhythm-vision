import type { AudioFeatures } from "~/lib/audio/types";

function bandAverage(data: Uint8Array, start: number, end: number) {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i] ?? 0;
  return sum / (end - start) / 255;
}

export function extractAudioFeatures(
  analyser: AnalyserNode,
  frequencyData: Uint8Array<ArrayBuffer>,
  waveformData: Uint8Array<ArrayBuffer>,
): AudioFeatures {
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(waveformData);

  let sumSquares = 0;
  for (let i = 0; i < waveformData.length; i++) {
    const sample = (waveformData[i]! - 128) / 128;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / waveformData.length);

  const len = frequencyData.length;
  const bass = bandAverage(frequencyData, 0, Math.max(1, Math.floor(len * 0.1)));
  const mid = bandAverage(
    frequencyData,
    Math.floor(len * 0.1),
    Math.floor(len * 0.5),
  );
  const treble = bandAverage(frequencyData, Math.floor(len * 0.5), len);

  return {
    frequencyData,
    waveformData,
    rms,
    bass,
    mid,
    treble,
  };
}
