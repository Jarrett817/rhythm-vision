import { Suspense } from "react";
import type { VisualizerId, VisualizerProps } from "~/features/visualizers/catalog";
import { getLazyVisualizer } from "~/features/visualizers/lazy-loaders";
import { VisualizerFallback } from "~/components/visualizer-fallback";

export function LazyVisualizer({
  id,
  ...props
}: VisualizerProps & { id: VisualizerId }) {
  const Component = getLazyVisualizer(id);

  return (
    <div className="absolute inset-0 size-full">
      <Suspense fallback={<VisualizerFallback id={id} />}>
        <Component {...props} />
      </Suspense>
    </div>
  );
}
