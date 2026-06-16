export function resampleTo16k(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  if (sampleRate === 16_000) return samples;
  const ratio = sampleRate / 16_000;
  const length = Math.floor(samples.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    output[i] =
      (samples[idx] ?? 0) * (1 - frac) + (samples[idx + 1] ?? 0) * frac;
  }
  return output;
}

export function extractAudioChunk(
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number,
): Float32Array {
  const sampleRate = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  const end = Math.min(
    buffer.length,
    Math.floor((startSec + durationSec) * sampleRate),
  );
  if (end <= start) return new Float32Array(0);
  return buffer.getChannelData(0).slice(start, end);
}
