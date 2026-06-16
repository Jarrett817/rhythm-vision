/** 音频分析特征，供 2D/3D 可视化插件消费 */
export interface AudioFeatures {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  rms: number;
  bass: number;
  mid: number;
  treble: number;
  beat?: boolean;
  bpm?: number;
}

export const EMPTY_AUDIO_FEATURES: AudioFeatures = {
  frequencyData: new Uint8Array(0),
  waveformData: new Uint8Array(0),
  rms: 0,
  bass: 0,
  mid: 0,
  treble: 0,
};
