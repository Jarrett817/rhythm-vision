---
name: stage-vj-design
description: >-
  Professional stage/VJ visual design standard for building and refining audio-reactive
  visualizer scenes. Use this skill WHENEVER you are creating a new visualizer, reworking
  an existing scene, or the user complains a scene looks "cheap / low / cluttered / like a
  screensaver / not stage-worthy / lacks 舞台感". Also trigger when tuning audio-reactive
  mapping, color palettes, composition, motion pacing, or post-processing for any scene in
  app/features/visualizers. This encodes the difference between amateur "particles on black"
  and professional VJ visuals used behind live performers.
---

# Stage / VJ Visual Design Standard

## Why this exists

The #1 reason a music visualizer looks cheap is not the code — it's that it violates
professional VJ design principles. Additive thin lines on pure black, everything jittering
uniformly to the beat, rainbow hue-cycling, and a cluttered center all read as "2003
screensaver." Professional stage visuals feel intentional, composed, and calm even when
energetic. This skill is the rulebook. Apply it before writing scene code, and audit against
it whenever a scene feels off.

**The mental test for every scene:** *"Could this be projected on a 10-meter LED wall behind
a singer without looking amateur?"* If not, it's failing one of the rules below.

## The five failure modes (what makes visuals look "low")

1. **Additive glowing thin lines/points on pure black** — the strongest amateur tell. Stage
   visuals use volumetric mass, soft light, silhouettes, ribbons, haze — not wireframe spaghetti.
2. **Everything reacts uniformly and constantly** — the whole frame "itches" nonstop. Pro
   visuals move in layers at different tempos; big shapes drift slowly, only accents pop on beats.
3. **Rainbow hue-cycling** — continuously rotating `hue` is instantly cheap. Lock 2–3 colors.
4. **Cluttered, centered, full-bleed composition** — no breathing room. Pros keep a calm
   negative-space safe zone (the performer stands there).
5. **Flat emissive/basic materials, no post** — no depth, no color grade, no cinematic finish.
   Cheapness lives here.
6. **Hard-geometry stacking** — dozens of cubes/rings/triangles/lines piled on one plane, many
   kinds at once, all moving at the same speed. This is the single most common WebGL-VJ tell.
   The cure is depth layering + procedural soft texture (see the dedicated section below).

## Core principles

### 1. Color — restraint over spectacle

- **Lock 2–3 colors per scene.** Define them as named constants at module top
  (e.g. `DEEP_VIOLET`, `AMBER`). Transition *between* the locked colors driven by audio; never
  free-run `hue` around the wheel.
- **Three-layer light:** dim ambient base → mid-layer moving textured light → sparse high-light
  accents. Never blow the whole frame to pure white, never let it fall to dead black.
- **Tempo-linked palette:** calm/slow sections stay low-saturation and soft; drops go
  high-contrast. Saturation and contrast are dynamics, not constants.
- **Silence must still look good.** With no audio, hold a slow, self-sufficient ambient state
  (gentle drift/breathing). No frantic motion, flicker, or random shape changes without music.

### 2. Motion — layered, pace-differentiated

This is what separates pro from amateur. Assign different frequency bands to different
*layers*, and give each layer a *different tempo*:

- **Background layer** — slow drifting texture/gradient/haze. Reacts to `rms`/overall energy
  only, very smoothed. This is the "canvas."
- **Mid layer** — the hero element and body movement. Reacts to `mid` (the vocal/melody band —
  this is what "follows the singing"). Moderate smoothing.
- **Foreground accents** — sparks, beam flashes, shockwaves. React to `treble` and beat/impact.
  These are the only things allowed to snap sharply, and only on real beats.

Rules of thumb:
- **4-beat big moves, 1-beat micro-moves.** Large scale/position changes happen on phrase
  boundaries or drops, not every frame.
- **Smooth almost everything.** Use `SmoothValue`/damping so values ease toward targets. Raw
  per-frame audio values cause the "itch." Reserve un-smoothed response for genuine beat accents.
- **Vocal-driven pacing:** if the user wants motion "to follow the singing," drive
  speed/flow from `mid` (vocals/melody live there), not `bass` and not a fixed fast constant.
- **Restrained strobe:** slow pulses by default; only brief high-frequency flashes at climaxes.
  Never dense fast flicker (visual-safety + looks cheap).

### 3. Composition — leave the stage room

- **Keep ~20% negative space.** Do not fill every pixel. The center-lower area often belongs to
  the performer; push mass to edges, top, or a rim, or keep the center a calm focal object.
- **One clear focal hierarchy.** A scene should have a hero (or an intentional void), a
  supporting mid field, and atmosphere — not 5 equally-loud systems fighting.
- **Anchor the frame.** A horizon line, floor reflection, or bottom vignette gives the image
  something to "stand on" so it doesn't float in void.
- **Depth via fog + backdrop.** In 3D, add fog so far elements melt into the background color.
  Never sit elements on pure black — use a gradient backdrop (see project's
  `shared/gradient-backdrop.tsx`) so there's air and space.

### 4. Material & finish — where "cheap" is cured

- Prefer believable materials over flat emissive: physical materials with roughness/metalness/
  clearcoat/transmission, soft volumetric haze, bokeh, ribbons, silhouettes, light panels,
  shader-driven surfaces. Avoid raw wireframe as the *main* subject (fine as a subtle sub-layer).
- **Cinematic post is mandatory for stage look.** A high-threshold bloom (threshold ~0.2, not
  ~0.02 which lights up everything), plus at least color grading (hue/saturation +
  brightness/contrast) and a subtle vignette / widescreen darkening. Optional: shallow depth of
  field, faint film grain, mild chromatic aberration. This single step removes most "cheapness."
- Keep bloom disciplined: only genuinely bright accents should bloom, so raise the luminance
  threshold rather than flooding the frame.

### 5. Depth layering & geometry discipline — the anti-"cheap stacking" rule

This is the WebGL-specific core. Cheap VJ = many hard geometries (cubes, rings, triangles,
lines) piled on one plane, all spinning at the same speed. Fix it structurally:

**Three separated depth planes, each with its own motion logic** — this alone creates
professional parallax and stops everything clumping together:

- **Far / base plane (slow):** nebula, gradient cloud, fbm-noise fluid, distant soft grid.
  Low contrast, very low speed (`time * ~0.1`, roughly quarter-BPM drift). **No hard geometry
  here** — it carries atmosphere and must never fight for attention.
- **Mid / subject plane (rhythm):** the hero. **One single family of geometry** (e.g. one ring
  array — not rings + cubes + stars together). Deforms/scales/moves only on beat/BPM
  (`time * ~0.4`). Each song keeps 1–2 base forms, no more.
- **Near / accent plane (burst):** thin lines, particles, light blades, chromatic glints,
  scan lines. Hidden at low opacity normally; flash only on drops/strong beats (~0.2s), then
  gone. Point accents, never a persistent layer.

**Hard rule — per frame, ≤2 kinds of hard geometry on screen.** Everything else is fluid /
noise / gradient soft texture. Aim for ~70% of the frame to be procedural soft texture
(simplex/fbm/voronoi/fluid displacement), with hard geometry only as sparse visual anchors.

**Motion desync (kills the "plastic" look):** the three planes never share a speed. Offset
rotation, translation, and ripple onto different tempos, and add a small per-instance random
time offset so same-family shapes don't move in lockstep — lockstep reads as cheap cloning.

**Array discipline (stops full-screen geometry spam):**
- **Falloff mask:** fade instance opacity toward the edges (radial/gradient), concentrate in a
  region, leave the rest empty. Never a uniform full-bleed grid.
- **Size variance:** randomize base size per instance; identical sizes read as a copy-paste.
- **Count cap:** keep mesh instances modest (mid-size show ≈ ≤300 hard meshes). Beyond that,
  switch to particle/sprite textures, not solid meshes.
- **Dynamic thinning:** shed instances in calm sections, grow back into the climax — density is
  a dynamic, not a constant.

### 6. Narrative arc (bonus, for full scenes)

A scene ideally breathes with the music's structure: intro (sparse setup) → verse (calm) →
chorus/drop (bold expansion) → outro (dissipation). Even without section detection, design so
that low energy reads as "waiting" and high energy reads as "arrival," rather than a constant
level of busyness.

## This project's toolkit (use existing helpers — don't reinvent)

Before building a primitive, check these. The project standard is least-custom-code, reuse-first.

- **Audio response:** `shared/audio-response.ts` — `useAudioResponse` gives smoothed
  `bass/mid/treble/rms`, plus `impact` and `isBeatDrop` for accents. `SmoothValue` for damping.
  Remember: **mid = vocals/melody**, bass = kick/structure, treble = detail/shimmer.
- **Backdrop:** `shared/gradient-backdrop.tsx` (`GradientBackdrop`) — vertical gradient sky,
  replaces pure-black `<color>` background. Give every 3D scene air.
- **3D:** React Three Fiber + Three.js + drei (`Environment`, `Float`, `Sparkles`, `Cloud`,
  `Lightformer`, `MeshTransmissionMaterial`, etc.), `maath` for damping/easing math.
- **Post:** `@react-three/postprocessing` (`Bloom`, `DepthOfField`, `HueSaturation`,
  `BrightnessContrast`, `Vignette`, `Noise`, `ChromaticAberration`). `shared/dreamy-postprocessing.tsx`
  is the shared stack.
- **2D:** PixiJS via `shared/pixi-visualizer.tsx`, plus `@pixi/filter-glow`,
  `@pixi/filter-godray`, `@pixi/filter-rgb-split` for stage glow / light beams / neon dispersion.
- **Procedural noise:** `lib/glsl/noise-chunks.ts` (`GLSL_CLASSIC_NOISE_2D/3D`) for fbm/simplex
  in shaders — prefer this over hard-geometry fields to fill space. `shared/aurora-sky.tsx` is a
  working shader-plane example.
- **Never put DOM/Motion components inside `<Canvas>`** — Canvas children must be Three/R3F objects.

## Workflow for building or reworking a scene

1. **Pick a direction and lock it.** One clear aesthetic + a 2–3 color palette (named constants)
   + a hero concept (or intentional void). Write these down before coding.
2. **Assign bands to layers.** Decide what background (rms), mid/hero (mid), and accents
   (treble/impact) each do. Different tempos per layer.
3. **Set up three depth planes.** Far soft-texture base / mid single-family hero / near burst
   accents — each on its own tempo. Keep ≤2 hard-geometry kinds on screen; fill space with noise.
4. **Build the backdrop first.** Gradient sky + fog, so nothing floats on black.
5. **Build the hero / focal field**, keeping the safe zone. Smooth its motion; big moves on beats.
   Give arrays a falloff mask, size variance, and a modest count cap.
6. **Add restrained accents** — beat-triggered, pooled (reuse meshes, no per-frame allocation).
7. **Apply cinematic post** — high-threshold bloom + grade + vignette at minimum.
8. **Audit against the six failure modes.** If any apply, fix before declaring done.
9. **Verify in-browser** when possible — a scene's feel can't be judged from code alone.

## Quick wins (immediate cheapness fixes)

When a scene already looks cheap and you want fast, high-leverage fixes:
- Delete half the hard geometry; fill the freed space with an fbm-noise background.
- Add soft-blur / bloom post so sharp geometric edges stop reading as raw primitives.
- Collapse to a single base geometry family on the subject plane.
- Give glow only to lines/particles; turn OFF self-emissive on the main solid geometry.
- Add a vignette to pull the eye to center and hide edge clutter.
- Desync speeds across layers and add per-instance time offsets.

## Self-audit checklist (run before calling a scene finished)

- [ ] Palette locked to 2–3 named colors; no free-running hue cycle.
- [ ] Background is a gradient/atmosphere, not pure black; fog gives depth (3D).
- [ ] Three separated depth planes, each on its own tempo (far slow / mid rhythm / near burst).
- [ ] ≤2 hard-geometry kinds on screen; ~70% of the frame is soft noise/fluid/gradient texture.
- [ ] Subject plane uses ONE geometry family; arrays have falloff mask + size variance + count cap.
- [ ] Layer speeds are desynced; same-family instances have per-instance time offsets (no lockstep).
- [ ] Motion is layered: slow background, mid-driven hero, beat-only accents — not uniform jitter.
- [ ] "Follows the singing" motion is driven by `mid`, not bass or a fixed fast speed.
- [ ] ~20% calm negative space; clear focal hierarchy; frame is anchored.
- [ ] Hero uses a believable material, not flat emissive or bare wireframe as the subject.
- [ ] Self-emissive is off on main solid geometry; glow/bloom reserved for lines/particles/accents.
- [ ] Cinematic post present: high-threshold bloom + color grade + vignette.
- [ ] Looks calm and intentional in silence; big reactions only on real beats.
- [ ] Reused project helpers instead of hand-rolling; no per-frame allocations in the render loop.
