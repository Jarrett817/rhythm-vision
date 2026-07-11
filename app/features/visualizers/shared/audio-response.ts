import { useRef, useMemo } from "react";
import * as THREE from "three";
import type { AudioFeatures } from "~/lib/audio/types";

// ============================================
// 音频特征 → 视觉属性 映射工具
// ============================================

/**
 * 分层音频响应器
 * 将音频的不同频段映射到不同的视觉行为
 */
export type SongSection = "intro" | "verse" | "buildup" | "drop" | "breakdown";

export class AudioLayeredResponse {
  private featuresRef: React.RefObject<AudioFeatures>;

  // 平滑后的数值
  private smoothBass = 0;
  private smoothMid = 0;
  private smoothTreble = 0;
  private smoothRms = 0;

  // 变化检测
  private bassDelta = 0;
  private midDelta = 0;
  private trebleDelta = 0;

  // 冲击检测（用于 beat drop）
  private bassImpact = 0;
  private lastBass = 0;

  // 歌曲结构追踪
  private energyHistory: number[] = [];
  private readonly historyMaxLen = 180; // 约3秒@60fps
  private longTermEnergy = 0;
  private shortTermEnergy = 0;
  private energyTrend = 0; // 正=上升, 负=下降
  private sectionState: SongSection = "intro";
  private sectionBlend = 0; // 在段落内的渐进 0→1
  private timeInSection = 0;
  private lastDropTime = -999;

  constructor(featuresRef: React.RefObject<AudioFeatures>) {
    this.featuresRef = featuresRef;
  }

  update(delta: number) {
    const f = this.featuresRef.current;

    // 平滑滤波（不同频率用不同的平滑系数）
    const bassSmoothing = Math.min(1, delta * 8);
    const midSmoothing = Math.min(1, delta * 12);
    const trebleSmoothing = Math.min(1, delta * 20);
    const rmsSmoothing = Math.min(1, delta * 6);
    this.smoothBass += (f.bass - this.smoothBass) * bassSmoothing;
    this.smoothMid += (f.mid - this.smoothMid) * midSmoothing;
    this.smoothTreble += (f.treble - this.smoothTreble) * trebleSmoothing;
    this.smoothRms += (f.rms - this.smoothRms) * rmsSmoothing;

    // 变化率
    this.bassDelta = delta > 0 ? (this.smoothBass - this.lastBass) / delta : 0;
    this.lastBass = this.smoothBass;

    // Bass 冲击（突然增强时）
    if (this.bassDelta > 0.5) {
      this.bassImpact = 1;
    } else {
      this.bassImpact *= Math.max(0, 1 - delta * 3);
    }

    // 歌曲结构追踪
    const instantEnergy = this.smoothBass * 0.5 + this.smoothMid * 0.3 + this.smoothRms * 0.2;
    this.shortTermEnergy += (instantEnergy - this.shortTermEnergy) * Math.min(1, delta * 2);
    this.longTermEnergy += (instantEnergy - this.longTermEnergy) * Math.min(1, delta * 0.15);
    this.energyTrend += (this.shortTermEnergy - this.longTermEnergy - this.energyTrend) * Math.min(1, delta * 1.5);

    this.energyHistory.push(instantEnergy);
    if (this.energyHistory.length > this.historyMaxLen) this.energyHistory.shift();

    this.timeInSection += delta;

    // 段落状态机
    const t = performance.now() / 1000;
    const rising = this.energyTrend > 0.05;
    const falling = this.energyTrend < -0.05;
    const highEnergy = this.shortTermEnergy > 0.5;
    const lowEnergy = this.shortTermEnergy < 0.2;
    const veryHigh = this.shortTermEnergy > 0.7;
    const justDropped = this.bassImpact > 0.6 && this.timeInSection > 0.5;

    if (justDropped && (this.sectionState === "buildup" || highEnergy)) {
      this.sectionState = "drop";
      this.sectionBlend = 0;
      this.timeInSection = 0;
      this.lastDropTime = t;
    } else if (rising && !highEnergy && this.sectionState !== "buildup" && this.sectionState !== "drop") {
      this.sectionState = "buildup";
      this.sectionBlend = 0;
      this.timeInSection = 0;
    } else if (falling && highEnergy && this.sectionState === "drop" && this.timeInSection > 4) {
      this.sectionState = "breakdown";
      this.sectionBlend = 0;
      this.timeInSection = 0;
    } else if (lowEnergy && this.sectionState === "breakdown" && this.timeInSection > 3) {
      this.sectionState = "intro";
      this.sectionBlend = 0;
      this.timeInSection = 0;
    } else if (!lowEnergy && !highEnergy && this.sectionState === "intro" && this.timeInSection > 2) {
      this.sectionState = "verse";
      this.sectionBlend = 0;
      this.timeInSection = 0;
    } else if (this.sectionState === "verse" && highEnergy) {
      this.sectionState = "drop";
      this.sectionBlend = 0;
      this.timeInSection = 0;
    }

    // 段落内渐进 blend
    const blendSpeed = this.sectionState === "drop" ? 2.5 : 0.6;
    this.sectionBlend = Math.min(1, this.sectionBlend + delta * blendSpeed);
  }

  // ============= 基础数值 =============
  get bass() {
    return this.smoothBass;
  }
  get mid() {
    return this.smoothMid;
  }
  get treble() {
    return this.smoothTreble;
  }
  get rms() {
    return this.smoothRms;
  }

  // ============= 变化率 =============
  get bassAccent() {
    return Math.max(0, this.bassDelta * 0.1);
  }
  get impact() {
    return this.bassImpact;
  }

  // ============= 音乐能量层级 =============
  get energyLevel() {
    // 0-1 的整体能量
    return (this.smoothBass * 0.5 + this.smoothMid * 0.3 + this.smoothRms * 0.2);
  }

  get isBeatDrop() {
    return this.bassImpact > 0.3;
  }

  // ============= 歌曲段落检测 =============
  /** 当前歌曲段落 */
  get section(): SongSection {
    return this.sectionState;
  }

  /** 段落内进度 0→1（刚进入段落时为0，完全进入后为1） */
  get sectionProgress() {
    return this.sectionBlend;
  }

  /** 长期平均能量（用于对比是否在build-up） */
  get longEnergy() {
    return this.longTermEnergy;
  }

  /** 短期瞬时能量 */
  get shortEnergy() {
    return this.shortTermEnergy;
  }

  /** 能量趋势：正=上升(build-up)，负=下降(breakdown)，0=稳定 */
  get energyTrendValue() {
    return this.energyTrend;
  }

  /** 从0到1的"紧张度"：build-up期间持续上升，drop瞬间爆发到1后回落 */
  get tension() {
    if (this.sectionState === "buildup") {
      return Math.min(1, this.sectionBlend * 0.7 + Math.max(0, this.energyTrend) * 3);
    }
    if (this.sectionState === "drop") {
      // drop瞬间tension=1，随后在段落中维持0.7-0.9
      return 0.7 + 0.3 * Math.exp(-this.timeInSection * 1.5);
    }
    if (this.sectionState === "breakdown") {
      return 0.3 * (1 - this.sectionBlend);
    }
    if (this.sectionState === "intro") {
      return 0.1;
    }
    return 0.4; // verse
  }

  /** 场景"释放度"：drop期间高，breakdown/intro期间低 */
  get release() {
    if (this.sectionState === "drop") {
      return 0.6 + 0.4 * this.sectionBlend;
    }
    if (this.sectionState === "verse") {
      return 0.3 + 0.2 * this.sectionBlend;
    }
    if (this.sectionState === "buildup") {
      return 0.15 + 0.1 * this.sectionBlend;
    }
    return 0.1;
  }

  // ============= 视觉映射函数 =============

  /** 映射到缩放（bass驱动主体，mid驱动细节） */
  scale(base: number, bassAmount = 0.5, midAmount = 0.2) {
    return base * (1 + this.smoothBass * bassAmount + this.smoothMid * midAmount);
  }

  /** 映射到速度（高频驱动细节速度） */
  speed(base: number, intensity = 1) {
    return base * (1 + this.smoothBass * 2 * intensity + this.smoothTreble * intensity);
  }

  /** 映射到透明度（rms驱动整体可见度） */
  opacity(base: number, amount = 0.5) {
    return Math.min(1, base + this.smoothRms * amount);
  }

  /** 映射到发光强度（高频驱动高光） */
  glow(base: number, amount = 1.5) {
    return base + this.smoothTreble * amount + this.smoothRms * 0.5;
  }

  /** 映射到色散/扭曲（bass强时增加） */
  distortion(base: number, amount = 0.8) {
    return base + this.smoothBass * amount;
  }

  /** 映射到粒子密度 */
  density(base: number, amount = 1) {
    return Math.floor(base * (1 + this.energyLevel * amount));
  }

  /** 音乐驱动的脉冲波（返回0-1的周期性数值） */
  pulse(time: number, speed = 1) {
    return 0.5 + 0.5 * Math.sin(time * speed * (1 + this.smoothBass * 2));
  }

  /** 颜色偏移（mid驱动色相变化） */
  hueOffset(baseHue: number, amount = 30) {
    return baseHue + this.smoothMid * amount;
  }
}

// ============================================
// React Hook 封装
// ============================================
export function useAudioResponse(featuresRef: React.RefObject<AudioFeatures>) {
  const responseRef = useRef<AudioLayeredResponse | null>(null);

  if (!responseRef.current) {
    responseRef.current = new AudioLayeredResponse(featuresRef);
  }

  return responseRef.current;
}

// ============================================
// 视觉元素的音频行为预设
// ============================================

/** 粒子系统的音乐响应预设 */
export const particleAudioPresets = {
  rain: {
    speedBass: 1.5,
    speedTreble: 0.5,
    sizeTreble: 0.3,
    opacityRms: 0.4,
  },
  sparkles: {
    speedBass: 1,
    speedTreble: 2,
    sizeTreble: 0.5,
    glowBass: 2,
  },
  mist: {
    densityMid: 1,
    opacityRms: 0.3,
    speedBass: 0.5,
  },
};

/** 水面/液体的音乐响应预设 */
export const waterAudioPresets = {
  rippleOnBassImpact: true,
  rippleSpeedFromBass: 1.2,
  reflectionGlowFromTreble: 1.5,
  waveHeightFromMid: 0.3,
};

/** 光效的音乐响应预设 */
export const lightAudioPresets = {
  intensityFromRms: 1,
  colorShiftFromMid: 20,
  flickerFromTreble: 0.2,
};

// ============================================
// 平滑数值工具
// ============================================
export class SmoothValue {
  private value = 0;
  private smoothFactor: number;

  constructor(smoothFactor = 0.1) {
    this.smoothFactor = smoothFactor;
  }

  update(target: number, delta?: number) {
    const factor = delta ? Math.min(1, this.smoothFactor * delta * 60) : this.smoothFactor;
    this.value += (target - this.value) * factor;
    return this.value;
  }

  get current() {
    return this.value;
  }
}

// ============================================
// Three.js 颜色工具
// ============================================
export function hslToThreeColor(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

export function lerpHSL(
  color: THREE.Color,
  h: number,
  s: number,
  l: number,
  t: number,
): THREE.Color {
  const currentHSL = { h: 0, s: 0, l: 0 };
  color.getHSL(currentHSL);
  return color.setHSL(
    THREE.MathUtils.lerp(currentHSL.h, h / 360, t),
    THREE.MathUtils.lerp(currentHSL.s, s / 100, t),
    THREE.MathUtils.lerp(currentHSL.l, l / 100, t),
  );
}
