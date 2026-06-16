import type { ComponentType, RefObject } from "react";
import type { AudioFeatures } from "~/lib/audio/types";
import { DreamRainScene } from "~/features/visualizers/dream-rain";
import { PetalDriftScene } from "~/features/visualizers/petal-drift";
import { EtherealGlowScene } from "~/features/visualizers/ethereal-glow";

export type VisualizerId = "dream-rain" | "petal-drift" | "ethereal-glow";

export interface VisualizerProps {
  featuresRef: RefObject<AudioFeatures>;
  intensity: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export interface VisualizerDefinition {
  id: VisualizerId;
  name: string;
  dimension: "2d" | "3d";
  description: string;
  Component: ComponentType<VisualizerProps>;
}

export const VISUALIZERS: VisualizerDefinition[] = [
  {
    id: "dream-rain",
    name: "落雨梦境",
    dimension: "3d",
    description: "细雨、光雾与水面涟漪",
    Component: DreamRainScene,
  },
  {
    id: "petal-drift",
    name: "落花流转",
    dimension: "3d",
    description: "花瓣随风飘落，柔粉光晕",
    Component: PetalDriftScene,
  },
  {
    id: "ethereal-glow",
    name: "朦胧极光",
    dimension: "3d",
    description: "灵动光核与星雾环绕",
    Component: EtherealGlowScene,
  },
];

export function getVisualizer(id: VisualizerId) {
  return VISUALIZERS.find((v) => v.id === id);
}
