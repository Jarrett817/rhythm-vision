import type { ComponentType, RefObject } from "react";
import type { AudioFeatures } from "~/lib/audio/types";
import type { SongMood } from "~/lib/audio/mood";
import { DreamRainScene } from "~/features/visualizers/dream-rain";
import { PetalDriftScene } from "~/features/visualizers/petal-drift";
import { EtherealGlowScene } from "~/features/visualizers/ethereal-glow";
import { ThunderFuryScene } from "~/features/visualizers/thunder-fury";
import { PulseRushScene } from "~/features/visualizers/pulse-rush";
import { OceanHorizonScene } from "~/features/visualizers/ocean-horizon";
import { NeonMetropolisScene } from "~/features/visualizers/neon-metropolis";
import { InkMistScene } from "~/features/visualizers/2d/ink-mist";
import { SunDustScene } from "~/features/visualizers/2d/sun-dust";
import { EmberCrackScene } from "~/features/visualizers/2d/ember-crack";
import { GentleTideScene } from "~/features/visualizers/2d/gentle-tide";
import { NeonStreamScene } from "~/features/visualizers/2d/neon-stream";
import { SeaShimmerScene } from "~/features/visualizers/2d/sea-shimmer";
import { CyberStreetScene } from "~/features/visualizers/2d/cyber-street";

export type VisualizerId =
  | "dream-rain"
  | "petal-drift"
  | "ethereal-glow"
  | "thunder-fury"
  | "pulse-rush"
  | "ocean-horizon"
  | "neon-metropolis"
  | "ink-mist"
  | "sun-dust"
  | "ember-crack"
  | "gentle-tide"
  | "neon-stream"
  | "sea-shimmer"
  | "cyber-street";

export type VisualizerCategory = "abstract" | "landscape";

export interface VisualizerProps {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export interface VisualizerDefinition {
  id: VisualizerId;
  name: string;
  dimension: "2d" | "3d";
  category: VisualizerCategory;
  moods: SongMood[];
  description: string;
  Component: ComponentType<VisualizerProps>;
}

export const VISUALIZERS: VisualizerDefinition[] = [
  {
    id: "dream-rain",
    name: "落雨梦境",
    dimension: "3d",
    category: "abstract",
    moods: ["sad", "slow"],
    description: "冷雨、水雾、深蓝夜色",
    Component: DreamRainScene,
  },
  {
    id: "ink-mist",
    name: "水墨烟岚",
    dimension: "2d",
    category: "abstract",
    moods: ["sad"],
    description: "2D 水墨滴落，低饱和蓝灰",
    Component: InkMistScene,
  },
  {
    id: "petal-drift",
    name: "落花流转",
    dimension: "3d",
    category: "abstract",
    moods: ["joyful"],
    description: "粉瓣飘落，暖色柔光",
    Component: PetalDriftScene,
  },
  {
    id: "sun-dust",
    name: "日光微尘",
    dimension: "2d",
    category: "abstract",
    moods: ["joyful"],
    description: "2D 金色微粒，轻盈闪烁",
    Component: SunDustScene,
  },
  {
    id: "thunder-fury",
    name: "雷霆怒焰",
    dimension: "3d",
    category: "abstract",
    moods: ["angry"],
    description: "暗红闪电、余烬升腾",
    Component: ThunderFuryScene,
  },
  {
    id: "ember-crack",
    name: "裂焰碎芒",
    dimension: "2d",
    category: "abstract",
    moods: ["angry"],
    description: "2D 放射碎裂，高对比暗红",
    Component: EmberCrackScene,
  },
  {
    id: "ethereal-glow",
    name: "朦胧极光",
    dimension: "3d",
    category: "abstract",
    moods: ["slow"],
    description: "光核呼吸，星雾缓慢流转",
    Component: EtherealGlowScene,
  },
  {
    id: "gentle-tide",
    name: "潮汐慢涌",
    dimension: "2d",
    category: "abstract",
    moods: ["slow"],
    description: "2D 多层柔波，深蓝渐变",
    Component: GentleTideScene,
  },
  {
    id: "pulse-rush",
    name: "脉冲疾驰",
    dimension: "3d",
    category: "abstract",
    moods: ["fast"],
    description: "高速脉冲环，霓虹轨迹",
    Component: PulseRushScene,
  },
  {
    id: "neon-stream",
    name: "霓虹疾流",
    dimension: "2d",
    category: "abstract",
    moods: ["fast"],
    description: "2D 水平光流，节奏驱动",
    Component: NeonStreamScene,
  },
  // —— 景观 ——
  {
    id: "ocean-horizon",
    name: "海平晚潮",
    dimension: "3d",
    category: "landscape",
    moods: ["slow", "sad", "joyful"],
    description: "3D Shader 海面、日落天际、波光粼粼",
    Component: OceanHorizonScene,
  },
  {
    id: "sea-shimmer",
    name: "海面微光",
    dimension: "2d",
    category: "landscape",
    moods: ["slow", "sad"],
    description: "2D 海平线、落日、多层海浪与水面反光",
    Component: SeaShimmerScene,
  },
  {
    id: "neon-metropolis",
    name: "霓虹都市",
    dimension: "3d",
    category: "landscape",
    moods: ["fast", "joyful", "angry"],
    description: "3D 天际线、窗灯闪烁、湿街霓虹",
    Component: NeonMetropolisScene,
  },
  {
    id: "cyber-street",
    name: "赛博街景",
    dimension: "2d",
    category: "landscape",
    moods: ["fast", "joyful"],
    description: "2D 都市剪影、霓虹招牌、地面倒影",
    Component: CyberStreetScene,
  },
];

export const MOOD_VISUALIZERS = {
  sad: VISUALIZERS.filter((v) => v.moods.includes("sad")),
  joyful: VISUALIZERS.filter((v) => v.moods.includes("joyful")),
  angry: VISUALIZERS.filter((v) => v.moods.includes("angry")),
  slow: VISUALIZERS.filter((v) => v.moods.includes("slow")),
  fast: VISUALIZERS.filter((v) => v.moods.includes("fast")),
} as const;

export const LANDSCAPE_VISUALIZERS = VISUALIZERS.filter(
  (v) => v.category === "landscape",
);

export function getVisualizer(id: VisualizerId) {
  return VISUALIZERS.find((v) => v.id === id);
}

export function getDefaultForMood(mood: SongMood): VisualizerId {
  const list = MOOD_VISUALIZERS[mood];
  return list[0]?.id ?? "dream-rain";
}

export function getVisualizersByCategory(
  category: VisualizerCategory | "all",
): VisualizerDefinition[] {
  if (category === "all") return VISUALIZERS;
  return VISUALIZERS.filter((v) => v.category === category);
}
