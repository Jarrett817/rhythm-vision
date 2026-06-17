/** 音频分析特征，供 2D/3D 可视化插件消费 */
export interface AudioFeatures {
  /** 完整频谱（FFT） */
  frequencyData: Uint8Array;
  /** 时域波形 */
  waveformData: Uint8Array;
  /** 整体响度 → 呼吸感、透明度、全局明暗 */
  rms: number;
  /** 超低频 → 重鼓、低音冲击 */
  subBass: number;
  /** 低频 → 底鼓、贝斯，驱动缩放/脉冲/ripple */
  bass: number;
  /** 中频 → 人声与旋律，驱动流动速度、色相、层叠 */
  mid: number;
  /** 中高频过渡 */
  highMid: number;
  /** 高频 → 镲、泛音，驱动粒子、光晕、闪烁 */
  treble: number;
  /** 频谱重心 0–1 → 整体明亮度 */
  brightness: number;
  /** 当前帧是否检测到节拍点 */
  beat?: boolean;
  /** 节拍强度 0–1 */
  beatStrength?: number;
}

export const EMPTY_AUDIO_FEATURES: AudioFeatures = {
  frequencyData: new Uint8Array(0),
  waveformData: new Uint8Array(0),
  rms: 0,
  subBass: 0,
  bass: 0,
  mid: 0,
  highMid: 0,
  treble: 0,
  brightness: 0,
  beat: false,
  beatStrength: 0,
};

/** 各频段推荐的视觉映射（供效果作者参考） */
export const BAND_VISUAL_ROLES = {
  bass: "体量 · 脉冲 · 涟漪 · 冲击波",
  mid: "流动 · 旋律起伏 · 色相漂移",
  treble: "光粒 · 高光 · 边缘闪烁",
  rms: "整体呼吸 · 透明度 · 环境明暗",
} as const;
