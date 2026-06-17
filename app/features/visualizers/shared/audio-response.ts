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
export class AudioLayeredResponse {
  private featuresRef: React.RefObject<AudioFeatures>;
  private history: number[] = [];
  private maxHistory = 60;

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

  constructor(featuresRef: React.RefObject<AudioFeatures>) {
    this.featuresRef = featuresRef;
  }

  update(delta: number) {
    const f = this.featuresRef.current;

    // 平滑滤波（不同频率用不同的平滑系数）
    this.smoothBass += (f.bass - this.smoothBass) * Math.min(1, delta * 8);
    this.smoothMid += (f.mid - this.smoothMid) * Math.min(1, delta * 12);
    this.smoothTreble += (f.treble - this.smoothTreble) * Math.min(1, delta * 20);
    this.smoothRms += (f.rms - this.smoothRms) * Math.min(1, delta * 6);

    // 变化率
    this.bassDelta = (this.smoothBass - this.lastBass) / delta;
    this.lastBass = this.smoothBass;

    // Bass 冲击（突然增强时）
    if (this.bassDelta > 0.5) {
      this.bassImpact = 1;
    } else {
      this.bassImpact *= Math.max(0, 1 - delta * 3);
    }

    // 历史记录（用于检测趋势）
    this.history.push(this.smoothRms);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
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
