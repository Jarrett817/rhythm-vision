import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@huggingface/transformers")) {
            return "transformers";
          }
          if (id.includes("pixi.js")) {
            return "pixi";
          }
          if (
            id.includes("three") ||
            id.includes("@react-three/fiber") ||
            id.includes("@react-three/drei") ||
            id.includes("@react-three/postprocessing") ||
            id.includes("postprocessing") ||
            id.includes("three-custom-shader-material") ||
            id.includes("glsl-noise")
          ) {
            return "three";
          }
          if (id.includes("@react-spring")) {
            return "react-spring";
          }
          if (id.includes("motion")) {
            return "motion";
          }
        },
      },
    },
  },
});
