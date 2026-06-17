import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HomePreferences {
  intensity: number;
  lyricsEnabled: boolean;
  visualizerCategory: "all" | "abstract" | "landscape";
  setIntensity: (v: number) => void;
  setLyricsEnabled: (v: boolean) => void;
  setVisualizerCategory: (v: "all" | "abstract" | "landscape") => void;
}

export const useHomePreferences = create<HomePreferences>()(
  persist(
    (set) => ({
      intensity: 1.2,
      lyricsEnabled: false,
      visualizerCategory: "all",
      setIntensity: (intensity) => set({ intensity }),
      setLyricsEnabled: (lyricsEnabled) => set({ lyricsEnabled }),
      setVisualizerCategory: (visualizerCategory) => set({ visualizerCategory }),
    }),
    { name: "rhythm-vision-preferences" },
  ),
);
