import { cn } from "~/lib/utils";
import {
  VISUALIZERS,
  type VisualizerDefinition,
  type VisualizerId,
} from "~/features/visualizers/catalog";
import {
  getVisualizersForMood,
  MOOD_LABELS,
  type SongMood,
} from "~/lib/audio/mood";

type MoodFilter = SongMood | "all";

const MOODS: { value: MoodFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "sad", label: MOOD_LABELS.sad },
  { value: "joyful", label: MOOD_LABELS.joyful },
  { value: "angry", label: MOOD_LABELS.angry },
  { value: "slow", label: MOOD_LABELS.slow },
  { value: "fast", label: MOOD_LABELS.fast },
];

interface EffectSwitcherProps {
  moodFilter: MoodFilter;
  visualizerId: VisualizerId;
  onMoodChange: (mood: MoodFilter) => void;
  onVisualizerChange: (id: VisualizerId) => void;
  visualizer: VisualizerDefinition;
  compact?: boolean;
}

export function EffectSwitcher({
  moodFilter,
  visualizerId,
  onMoodChange,
  onVisualizerChange,
  visualizer,
  compact = false,
}: EffectSwitcherProps) {
  const filtered = getVisualizersForMood(VISUALIZERS, moodFilter);

  return (
    <div className={cn("flex flex-col gap-4", compact && "gap-3")}>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onMoodChange(m.value)}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs tracking-wide transition-all",
              moodFilter === m.value
                ? "bg-white/15 text-white ring-1 ring-white/25"
                : "text-white/45 hover:bg-white/5 hover:text-white/70",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onVisualizerChange(v.id)}
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
                {v.description}
              </p>
            )}
          </button>
        ))}
      </div>

      {!compact && (
        <p className="text-xs font-light tracking-wide text-white/40">
          {visualizer.description}
        </p>
      )}
    </div>
  );
}

export type { MoodFilter };
