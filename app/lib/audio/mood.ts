import type { AudioFeatures } from "~/lib/audio/types";

/** 情绪分类 */
export type SongMood = "joyful" | "sad" | "angry" | "slow" | "fast";

export const MOOD_LABELS: Record<SongMood, string> = {
  joyful: "愉悦",
  sad: "悲伤",
  angry: "愤怒",
  slow: "慢歌",
  fast: "快歌",
};

export const MOOD_DESCRIPTIONS: Record<SongMood, string> = {
  joyful: "温暖、轻盈、金色柔光",
  sad: "冷色、雨雾、低饱和",
  angry: "暗红、碎裂、高对比",
  slow: "缓慢流动、呼吸感",
  fast: "高速线条、脉冲节奏",
};

/** 根据实时音频特征推断当前情绪倾向 */
export function detectMood(features: AudioFeatures): SongMood {
  const { rms, bass, mid, treble } = features;
  const energy = rms;
  const aggression = bass * 0.5 + mid * 0.3 + energy * 0.2;
  const brightness = treble;

  if (aggression > 0.38 && energy > 0.18) return "angry";
  if (energy > 0.22 && (brightness > 0.3 || mid > 0.35)) return "fast";
  if (energy < 0.1 && brightness < 0.22) return "sad";
  if (energy < 0.14 && bass < 0.25) return "slow";
  return "joyful";
}

export function getVisualizersForMood<
  T extends { moods: SongMood[] },
>(items: T[], mood: SongMood | "all"): T[] {
  if (mood === "all") return items;
  return items.filter((v) => v.moods.includes(mood));
}
