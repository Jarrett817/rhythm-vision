import type { AudioFeatures } from "~/lib/audio/types";

function bandAverage(data: Uint8Array, start: number, end: number) {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i] ?? 0;
  return sum / (end - start) / 255;
}

/** 节拍检测状态（跨帧保持） */
const beatState = {
  lastBass: 0,
  beatStrength: 0,
  beat: false,
};

/**
 * 从 AnalyserNode 提取分层音频特征
 *
 * 频段划分（近似）：
 * - subBass / bass  → 底鼓、贝斯（20–250Hz）
 * - mid           → 人声、旋律（250Hz–2kHz）
 * - treble        → 镲片、泛音、亮度（2kHz+）
 * - rms           → 整体响度（时域）
 */
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
  const subBass = bandAverage(frequencyData, 0, Math.max(1, Math.floor(len * 0.04)));
  const bassLow = bandAverage(
    frequencyData,
    Math.floor(len * 0.04),
    Math.floor(len * 0.12),
  );
  const bass = subBass * 0.45 + bassLow * 0.55;
  const lowMid = bandAverage(
    frequencyData,
    Math.floor(len * 0.12),
    Math.floor(len * 0.28),
  );
  const midCore = bandAverage(
    frequencyData,
    Math.floor(len * 0.28),
    Math.floor(len * 0.5),
  );
  const mid = lowMid * 0.4 + midCore * 0.6;
  const highMid = bandAverage(
    frequencyData,
    Math.floor(len * 0.5),
    Math.floor(len * 0.72),
  );
  const treble = bandAverage(frequencyData, Math.floor(len * 0.72), len);

  // 频谱重心 → 整体「明亮度」
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    const v = frequencyData[i] ?? 0;
    weighted += i * v;
    total += v;
  }
  const brightness = total > 0 ? weighted / total / len : 0;

  // 节拍：低频突增
  const bassJump = bass - beatState.lastBass;
  beatState.beat = bassJump > 0.08 && bass > 0.15;
  beatState.beatStrength = beatState.beat
    ? Math.min(1, bassJump * 4)
    : beatState.beatStrength * 0.85;
  beatState.lastBass = bass;

  return {
    frequencyData,
    waveformData,
    rms,
    subBass,
    bass,
    mid,
    treble,
    highMid,
    brightness,
    beat: beatState.beat,
    beatStrength: beatState.beatStrength,
  };
}
