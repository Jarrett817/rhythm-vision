import type { AudioFeatures } from "~/lib/audio/types";

export type VisualizerDimension = "2d" | "3d";

export interface VisualizerPlugin {
  id: string;
  name: string;
  dimension: VisualizerDimension;
  mount(container: HTMLElement): void;
  unmount(): void;
  update(features: AudioFeatures, delta: number): void;
}

const registry = new Map<string, VisualizerPlugin>();

export function registerVisualizer(plugin: VisualizerPlugin) {
  registry.set(plugin.id, plugin);
}

export function getVisualizer(id: string) {
  return registry.get(id);
}

export function listVisualizers(dimension?: VisualizerDimension) {
  const all = [...registry.values()];
  return dimension ? all.filter((v) => v.dimension === dimension) : all;
}
