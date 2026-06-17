import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "~/lib/utils";
import type {
  VisualizerDefinition,
  VisualizerId,
} from "~/features/visualizers/catalog";
import { prefetchVisualizer } from "~/features/visualizers/lazy-loaders";

interface VisualizerEdgeNavProps {
  visualizers: Pick<VisualizerDefinition, "id" | "name" | "imagery">[];
  currentId: VisualizerId;
  onChange: (id: VisualizerId) => void;
}

function wrapIndex(i: number, len: number) {
  return ((i % len) + len) % len;
}

export function VisualizerEdgeNav({
  visualizers,
  currentId,
  onChange,
}: VisualizerEdgeNavProps) {
  if (visualizers.length <= 1) return null;

  const idx = visualizers.findIndex((v) => v.id === currentId);
  const prev = visualizers[wrapIndex(idx - 1, visualizers.length)]!;
  const next = visualizers[wrapIndex(idx + 1, visualizers.length)]!;

  return (
    <>
      <EdgeZone side="left" target={prev} onChange={onChange} />
      <EdgeZone side="right" target={next} onChange={onChange} />
    </>
  );
}

function EdgeZone({
  side,
  target,
  onChange,
}: {
  side: "left" | "right";
  target: Pick<VisualizerDefinition, "id" | "name" | "imagery">;
  onChange: (id: VisualizerId) => void;
}) {
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "group/edge pointer-events-auto absolute top-0 z-40 h-full w-14 sm:w-20",
        isLeft ? "left-0" : "right-0",
      )}
    >
      <motion.button
        type="button"
        aria-label={isLeft ? `上一个效果：${target.name}` : `下一个效果：${target.name}`}
        onClick={() => onChange(target.id)}
        onMouseEnter={() => prefetchVisualizer(target.id)}
        initial={{ opacity: 0, x: isLeft ? -16 : 16 }}
        whileHover={{ opacity: 1, x: 0, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={cn(
          "absolute top-1/2 flex -translate-y-1/2 items-center gap-2 overflow-hidden",
          "border border-white/10 bg-black/40 text-white/80 backdrop-blur-md",
          "opacity-0 group-hover/edge:opacity-100",
          "hover:border-white/25 hover:bg-black/55 hover:text-white",
          isLeft ? "left-0 rounded-r-xl px-2 py-4" : "right-0 rounded-l-xl px-2 py-4",
        )}
      >
        {isLeft && <ChevronLeft className="size-5 shrink-0" />}
        <div className="hidden w-28 sm:block">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {isLeft ? "上一个" : "下一个"}
          </p>
          <p className="truncate text-xs text-white/90">{target.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-white/50">
            {target.imagery}
          </p>
        </div>
        {!isLeft && <ChevronRight className="size-5 shrink-0" />}
      </motion.button>
    </div>
  );
}
