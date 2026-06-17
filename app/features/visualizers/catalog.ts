import type { RefObject } from "react";

/** 精 curated：意象清晰、频段分工明确 */
export type VisualizerId =
  | "gentle-tide"
  | "pulse-rush"
  | "dream-rain"
  | "ink-mist"
  | "ethereal-glow"
  | "ocean-horizon"
  | "neon-metropolis"
  | "sweet-party";

export type VisualizerCategory = "abstract" | "landscape";

export interface VisualizerProps {
  featuresRef: RefObject<import("~/lib/audio/types").AudioFeatures>;
  intensity: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

/** 场景元数据（不含组件，便于拆包） */
export interface VisualizerMeta {
  id: VisualizerId;
  name: string;
  dimension: "2d" | "3d";
  category: VisualizerCategory;
  description: string;
  imagery: string;
  audioMap: string;
}

export const VISUALIZER_META: VisualizerMeta[] = [
  {
    id: "gentle-tide",
    name: "潮汐慢涌",
    dimension: "2d",
    category: "abstract",
    imagery: "深夜海潮，月下水纹层层推近",
    audioMap: "低频抬浪 · 中频推速 · 高频染蓝 · 响度呼吸",
    description: "多层柔波，像潮水一遍遍漫过沙滩",
  },
  {
    id: "pulse-rush",
    name: "脉冲疾驰",
    dimension: "3d",
    category: "abstract",
    imagery: "隧道中光速粒子，鼓点激起冲击波",
    audioMap: "低频脉冲环 · 中频旋转 · 高频粒子 · 节拍冲击波",
    description: "环形脉冲与粒子隧道，适合快歌",
  },
  {
    id: "dream-rain",
    name: "落雨梦境",
    dimension: "3d",
    category: "abstract",
    imagery: "月夜海面，细雨丝落涟漪",
    audioMap: "低频雨势 · 中频风飘 · 高频波光",
    description: "真实海面反光、月光朦胧、线状落雨",
  },
  {
    id: "ink-mist",
    name: "水墨烟岚",
    dimension: "2d",
    category: "abstract",
    imagery: "月照远山，墨晕空蒙",
    audioMap: "低频墨晕 · 中频雾带 · 高频雨丝",
    description: "山水剪影、水墨晕染与月雾",
  },
  {
    id: "ethereal-glow",
    name: "朦胧极光",
    dimension: "3d",
    category: "abstract",
    imagery: "极光圈绕光核，星尘缓慢流转",
    audioMap: "低频光核 · 中频环扩 · 高频星尘",
    description: "慢速呼吸感，适合冥想式慢歌",
  },
  {
    id: "ocean-horizon",
    name: "海平晚潮",
    dimension: "3d",
    category: "landscape",
    imagery: "日落海平线，Shader 波浪与余晖",
    audioMap: "低频浪高 · 中频涌速 · 高频波光",
    description: "3D 海面景观",
  },
  {
    id: "neon-metropolis",
    name: "霓虹都市",
    dimension: "3d",
    category: "landscape",
    imagery: "雨夜天际线，窗灯与湿街霓虹",
    audioMap: "低频楼影 · 中频窗灯 · 高频招牌",
    description: "3D 都市夜景",
  },
  {
    id: "sweet-party",
    name: "甜心派对",
    dimension: "2d",
    category: "abstract",
    imagery: "糖果竖条流转，镂空爱心星形飘落堆积",
    audioMap: "低频震堆 · 中频飘带 · 高频落心",
    description: "动感变色竖条，心星空中涌现落底堆积",
  },
];

/** @deprecated 使用 VISUALIZER_META */
export const VISUALIZERS = VISUALIZER_META;

/** @deprecated 使用 VisualizerMeta */
export type VisualizerDefinition = VisualizerMeta;

export function getVisualizer(id: VisualizerId) {
  return VISUALIZER_META.find((v) => v.id === id);
}

export function getVisualizersByCategory(
  category: VisualizerCategory | "all",
) {
  if (category === "all") return VISUALIZER_META;
  return VISUALIZER_META.filter((v) => v.category === category);
}

export function getDefaultVisualizer(): VisualizerId {
  return "gentle-tide";
}
