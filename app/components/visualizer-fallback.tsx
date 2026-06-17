import { Loader2 } from "lucide-react";
import { getVisualizer, type VisualizerId } from "~/features/visualizers/catalog";

export function VisualizerFallback({ id }: { id: VisualizerId }) {
  const meta = getVisualizer(id);

  return (
    <div className="absolute inset-0 flex size-full min-h-full flex-col items-center justify-center gap-3 bg-black/80 text-white/70">
      <Loader2 className="size-6 animate-spin text-white/50" />
      <p className="text-sm">{meta?.name ?? "加载场景"}</p>
      <p className="text-xs text-white/40">{meta?.imagery}</p>
    </div>
  );
}
