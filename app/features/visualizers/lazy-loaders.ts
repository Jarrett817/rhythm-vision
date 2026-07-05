import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { VisualizerId, VisualizerProps } from "~/features/visualizers/catalog";

type VisualizerModule = { default: ComponentType<VisualizerProps> };

type Loader = () => Promise<VisualizerModule>;

export const VISUALIZER_LOADERS: Record<VisualizerId, Loader> = {
  "gentle-tide": () =>
    import("~/features/visualizers/2d/gentle-tide").then((m) => ({
      default: m.GentleTideScene,
    })),
  "ink-mist": () =>
    import("~/features/visualizers/2d/ink-mist").then((m) => ({
      default: m.InkMistScene,
    })),
  "pulse-rush": () =>
    import("~/features/visualizers/pulse-rush").then((m) => ({
      default: m.PulseRushScene,
    })),
  "ethereal-glow": () =>
    import("~/features/visualizers/ethereal-glow").then((m) => ({
      default: m.EtherealGlowScene,
    })),
  "neon-metropolis": () =>
    import("~/features/visualizers/neon-metropolis").then((m) => ({
      default: m.NeonMetropolisScene,
    })),
  "sweet-party": () =>
    import("~/features/visualizers/2d/sweet-party").then((m) => ({
      default: m.SweetPartyScene,
    })),
};

const lazyCache = new Map<
  VisualizerId,
  LazyExoticComponent<ComponentType<VisualizerProps>>
>();

export function getLazyVisualizer(id: VisualizerId) {
  let cached = lazyCache.get(id);
  if (!cached) {
    cached = lazy(VISUALIZER_LOADERS[id]);
    lazyCache.set(id, cached);
  }
  return cached;
}

/** 预加载场景 chunk（悬停/空闲时调用） */
export function prefetchVisualizer(id: VisualizerId) {
  void VISUALIZER_LOADERS[id]();
}

export function prefetchAdjacentVisualizers(
  ids: VisualizerId[],
  currentId: VisualizerId,
) {
  const idx = ids.indexOf(currentId);
  if (idx < 0) return;
  const prev = ids[(idx - 1 + ids.length) % ids.length];
  const next = ids[(idx + 1) % ids.length];
  if (prev) prefetchVisualizer(prev);
  if (next) prefetchVisualizer(next);
}
