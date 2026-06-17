import { cn } from "~/lib/utils";
import {
  VISUALIZERS,
  type VisualizerDefinition,
  type VisualizerId,
} from "~/features/visualizers/catalog";
import { prefetchVisualizer } from "~/features/visualizers/lazy-loaders";

interface EffectSwitcherProps {
  visualizerId: VisualizerId;
  onVisualizerChange: (id: VisualizerId) => void;
  visualizer: VisualizerDefinition;
  compact?: boolean;
}

export function EffectSwitcher({
  visualizerId,
  onVisualizerChange,
  visualizer,
  compact = false,
}: EffectSwitcherProps) {
  return (
    <div className={cn("flex flex-col gap-4", compact && "gap-3")}>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {VISUALIZERS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onVisualizerChange(v.id)}
            onMouseEnter={() => prefetchVisualizer(v.id)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all",
              visualizerId === v.id
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/8 bg-white/3 text-white/50 hover:border-white/15 hover:bg-white/5 hover:text-white/80",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-light tracking-wide">{v.name}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] text-white/40 ring-1 ring-white/10">
                {v.dimension}
              </span>
            </div>
            {!compact && (
              <p className="mt-1 max-w-[180px] truncate text-[11px] text-white/35">
                {v.imagery}
              </p>
            )}
          </button>
        ))}
      </div>

      {!compact && (
        <p className="text-xs font-light tracking-wide text-white/40">
          {visualizer.imagery}
        </p>
      )}
    </div>
  );
}
