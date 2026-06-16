interface LyricsOverlayProps {
  lines: string[];
  currentLine: string;
  visible: boolean;
}

export function LyricsOverlay({ lines, currentLine, visible }: LyricsOverlayProps) {
  if (!visible) return null;

  const display = currentLine || lines.at(-1) || "";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-36 px-6">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="relative max-w-3xl space-y-3 text-center">
        {lines.slice(-2, -1).map((line, i) => (
          <p
            key={`${line}-${i}`}
            className="text-lg font-light tracking-[0.2em] text-white/30 blur-[0.3px]"
          >
            {line}
          </p>
        ))}
        {display && (
          <p className="animate-in fade-in text-2xl font-extralight leading-relaxed tracking-[0.25em] text-white/90 drop-shadow-[0_0_30px_rgba(196,181,253,0.7)] duration-700 md:text-3xl">
            {display}
          </p>
        )}
      </div>
    </div>
  );
}
