export type SkyTheme = {
  color1: string;
  color2: string;
  color3: string;
  fog: string;
  sparkle: string;
};

export const SKY_THEMES = {
  sad: {
    color1: "#0a1628",
    color2: "#1e3a5f",
    color3: "#4c1d95",
    fog: "#0c1929",
    sparkle: "#93c5fd",
  },
  joyful: {
    color1: "#4a1942",
    color2: "#9a3412",
    color3: "#fbbf24",
    fog: "#2a1020",
    sparkle: "#fde68a",
  },
  angry: {
    color1: "#1a0505",
    color2: "#7f1d1d",
    color3: "#ea580c",
    fog: "#1a0808",
    sparkle: "#fca5a5",
  },
  slow: {
    color1: "#0f172a",
    color2: "#312e81",
    color3: "#6366f1",
    fog: "#0a0e1a",
    sparkle: "#c4b5fd",
  },
  fast: {
    color1: "#020617",
    color2: "#0e7490",
    color3: "#22d3ee",
    fog: "#040818",
    sparkle: "#67e8f9",
  },
  ocean: {
    color1: "#0c4a6e",
    color2: "#ea580c",
    color3: "#7c2d12",
    fog: "#0a2540",
    sparkle: "#bae6fd",
  },
  city: {
    color1: "#050508",
    color2: "#312e81",
    color3: "#db2777",
    fog: "#06060c",
    sparkle: "#c084fc",
  },
} as const satisfies Record<string, SkyTheme>;

export type PixiTheme = {
  bg: string;
  blobs: [string, string, string];
  accent: string;
};

export const PIXI_THEMES = {
  sad: {
    bg: "#0a1220",
    blobs: ["#1e3a5f", "#312e81", "#1e1b4b"],
    accent: "#7dd3fc",
  },
  joyful: {
    bg: "#2a1508",
    blobs: ["#f97316", "#fbbf24", "#fda4af"],
    accent: "#fef3c7",
  },
  angry: {
    bg: "#140404",
    blobs: ["#991b1b", "#dc2626", "#ea580c"],
    accent: "#fca5a5",
  },
  slow: {
    bg: "#080c18",
    blobs: ["#1e3a8a", "#4338ca", "#6366f1"],
    accent: "#a5b4fc",
  },
  fast: {
    bg: "#030712",
    blobs: ["#0891b2", "#06b6d4", "#818cf8"],
    accent: "#22d3ee",
  },
  ocean: {
    bg: "#0a1e33",
    blobs: ["#0369a1", "#ea580c", "#7c3aed"],
    accent: "#7dd3fc",
  },
  city: {
    bg: "#050508",
    blobs: ["#4c1d95", "#be185d", "#0891b2"],
    accent: "#e879f9",
  },
} as const satisfies Record<string, PixiTheme>;
