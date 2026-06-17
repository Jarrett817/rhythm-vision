# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product direction

Rhythm Vision is a browser-based music visualizer for singers and bands to use as live performance background walls. Visual scenes should feel like stage visuals, not just decorative landscapes. Favor bold composition, readable silhouettes, large-scale motion, lighting layers, depth, and clear audio-reactive moments that work on a big screen behind performers.

When improving visualizers, avoid tiny pure geometric primitives that read as placeholder graphics, such as white square particles. Prefer believable stage-friendly forms: volumetric haze, beams, ribbons, silhouettes, soft bokeh, water spray, confetti, organic particles, light panels, or shader-driven materials. If a visual element cannot be made convincing quickly, remove it rather than leaving a distracting artifact.

## Implementation preferences

Use the best available implementation with the least custom code. Prefer existing project helpers, established libraries, and shadcn/ui CLI-generated components over hand-rolled equivalents. Before building a new visual primitive, check whether Three.js, React Three Fiber, drei, PixiJS, Matter.js, Motion, or existing shared visualizer components already provide it.

Use shadcn components only via CLI:

```bash
bunx shadcn@latest add <component>
```

Do not handwrite shadcn component files unless fixing local generated code.

When information is needed from the user, batch related questions into a single response when practical. Avoid unnecessary extra model turns for one-at-a-time questions unless a decision truly blocks progress.

## Commands

Install dependencies:

```bash
bun install
```

Start development server:

```bash
bun run dev
```

Build production output:

```bash
bun run build
```

Typecheck:

```bash
bun run typecheck
```

This project currently has no dedicated test script. Use `bun run typecheck` and manual browser verification for visual/UI changes.

## Routing and deployment

React Router 7 runs as an SPA with SSR disabled. GitHub Pages deployment uses the `/rhythm-vision/` subpath. Keep these in sync:

- `react-router.config.ts` uses `basename: "/rhythm-vision/"`.
- `vite.config.ts` uses `base: "/rhythm-vision/"`.

For the default Vite dev server, React Router `basename` must begin with Vite `base`.

GitHub Actions workflows live in `.github/workflows/` and use Bun. GitHub Pages publishes `build/client` via `peaceiris/actions-gh-pages`.

## Architecture overview

- `app/routes/home.tsx` is the main visualizer page. It manages audio state, settings drawer, selected visualizer, fullscreen mode, recording, and lyrics overlay.
- `app/features/audio/use-audio-engine.ts` owns audio loading/playback and updates `featuresRef` with realtime audio features.
- `app/features/lyrics/use-live-transcription.ts` controls browser-side Whisper transcription. It should load the worker/model only when lyrics recognition is enabled.
- `app/workers/whisper.worker.ts` runs Transformers.js transcription in a web worker. Local models are preferred from `${import.meta.env.BASE_URL}models/`, with remote fallback enabled.
- `app/features/visualizers/catalog.ts` contains curated visualizer metadata only. Scene components are lazy-loaded through `app/features/visualizers/lazy-loaders.ts`.
- 3D scenes use React Three Fiber and Three.js. Never put DOM or Motion components inside `<Canvas>`; Canvas children must be Three/R3F objects only.
- 2D scenes use PixiJS through `app/features/visualizers/shared/pixi-visualizer.tsx`.
- Shared audio response helpers live in `app/features/visualizers/shared/audio-response.ts` and are reused by 2D/3D visualizers.

## Visualizer guidelines

For each visualizer, map audio bands intentionally:

- bass: structure, scale, impact, waves, shocks, floor/ground motion
- mid: flow, body movement, color drift, ribbons, skyline/window rhythm
- treble: highlights, sparkles, fine detail, shimmer
- rms/overall energy: brightness, density, glow, scene breathing

Music visualization should still look good when audio is silent: slow stage ambience is fine, but avoid frantic motion, flicker, or random shape changes without music.

For performance background visuals, prioritize:

- large readable shapes over tiny details
- layered depth and haze
- smooth movement unless deliberately beat-synced
- strong color palettes with controlled contrast
- effects that remain legible from a distance

Avoid:

- placeholder particles, white square points, or default-looking geometry
- excessive jitter when no music is playing
- random tiny objects that distract from performers
- creating new custom systems when a library/shared helper already solves it
