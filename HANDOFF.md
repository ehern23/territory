# Handoff: `visual-polish`

Branch `visual-polish`, cut from `main` at `5b910c0`. Not merged. Two sessions so far:

1. **Code-level fixes** on a machine with no GPU (soft shadows, phone top bar, seller deep link, cleanup, phone budget, frosted-glass fallback). Summary at the end of this file.
2. **The visual pass on a real GPU** (Apple M5, Chrome via Metal). Everything below up to "Earlier session".

State at the end of the branch: `npm test` 80/80, `npm run typecheck` clean, `npm run build` passes. `src/domain`, `src/store` and `/api/territory` are unchanged.

Before/after images: [`docs/visual-polish/`](docs/visual-polish/) (desktop 1440x900 pairs for intro, dawn, golden hour, noon, night and two guided-demo beats; two phone sheets at 390x844).

## The visual pass

| Commit | What |
| --- | --- |
| `91f3418` | Far forest fixed on HiDPI screens (impostor atlas) |
| `ca8da03` | 60 fps at Retina: baked terrain noise, no SSAO, pixel budget |
| `8fa45b2`, `d3efab5` | Light and air: equinox season, gold key, atmosphere pass, lit far forest, night |
| `127574a` | The first ten seconds: hero frame, crane to a lower overview, label declutter |
| `f933334` | Surface: treetop dashes, rock line, FXAA for the lite tier |
| `b760958` | Motion: eased flights, springy fruit |
| `de22405` | Liquid Glass: panel and map refract again, account bar |
| `4552f99` | Greeting follows the sky; README |

### Two bugs that were hiding the whole scene

Neither could be seen on the software renderer the first session had, and between them they explain most of "murky" and "hard cutout edges".

- **The far forest was drawn as stacked rectangles on any screen above 1x.** `captureAtlas` addressed atlas cells with `renderer.setViewport`, which multiplies by the device pixel ratio. At 2x each tree was captured four cells large, so every distant impostor showed a slab of another tree's crown. Cells now go through the render target's own viewport and scissor (`WildForest.tsx`). This also applies to phones (1.5x).
- **Every leaf had a pale hairline round it.** Alpha-to-coverage leaves fractional alpha along leaf edges, and each post effect blended by that alpha. The first effect in the chain now writes opaque alpha (`AerialEffect.tsx`).

### 1. The first ten seconds (`CameraDirector.tsx`, `IntroTitle.tsx`, `Forest.tsx`)

- **Hero frame.** The move opens level with the treetops, 330 m from the flagship account, on the far side of it from the light. The crown is rim-lit, the haze behind it glows, and the ranges and sky sit above it. The side it opens from follows the sun or moon, stays within a quarter turn of the overview, and is checked clear of the other giants and the ground along the whole path.
- **Move.** It then cranes up and swings round to the overview over 11.5 s on a smootherstep, the rise leading the pull-back. The first frame holds 0.7 s while shaders compile.
- **Overview.** Lower and a little wider, so the giants stand above the canopy against the ranges and a strip of sky.
- **Labels.** Account labels declutter in screen space, front to back, a few times a second. From the lower angle two giants at different depths line up; the farther label now steps up clear of the nearer one.
- **Title.** Moved to the lower third so it no longer covers the flagship.

### 2. Light and mood (`sky/`, `world/AerialEffect.tsx`, `world/WildForest.tsx`)

- **Season is pinned to the equinox** (`celestial.SEASON_DAY`). With the real calendar, `?time=17.5` in November is full dusk, which is why the "light is going gold" greeting sat over a dark scene. Now the day is 12 hours all year and 5:30 pm is golden hour in every month. Set the constant to `null` to follow the calendar again.
- **Direct light has its own colour ramp.** The sunset orange used for the key is nearly pure red in linear space, and green leaves reflect none of it, so the forest went brown. The key is now a paler gold; the saturated orange stays in the sky glow.
- **No scene fog.** One screen pass over colour and depth does the air:
  - aerial perspective toward the colour the sky has in that direction (shared GLSL with the dome, `sky/skyGlsl.ts`), warm toward a low sun and cool away from it;
  - a thin valley mist that pools at dawn;
  - drifting cloud shadows;
  - at night, an exposure lift and a cool desaturating grade, so the forest keeps its shapes under the stars.
- **The far forest is lit.** Impostors were a flat capture times one shade colour. They are now shaded as domes from the light's direction with sky fill from above, and take soft analytic shadows from the eight account giants (crown spheres tested in the vertex shader).
- **Soft shadows.** The penumbra constants from the first session were left as they are; they look right at noon and at a low sun. I saw no acne or peter-panning with the current bias.

### 3. Surface quality

- Blocky far forest and leaf hairlines: see above.
- **Treetop dashes.** Texture filtering reached into the neighbouring atlas cell at a card's rim and drew a dark dash over distant treetops. Cards now fade at the rim.
- **Rock line.** The rock/forest boundary on the ranges followed vertex-normal slope, so on the coarse far grid it ran along straight facet edges. Two scales of noise break it up (`Terrain.tsx`).
- **Lite tier.** Touch devices have no MSAA, so leaf cut-outs stair-stepped. They now run FXAA as a final pass over the tone-mapped frame.

### 4. Motion

- **Flights ease in as well as out.** The controls' damping only eases out, so every app-driven flight started at full speed. Flights now run on a smootherstep from wherever the camera is, with distance interpolated in octaves and a duration that grows with the journey (1.4 to 3 s). Touching the controls takes over at once.
- **Fruit swells and settles.** Size is a lightly under-damped spring; the stem grows with it; the second and third fruit of a cluster grow in after the first instead of appearing at full size.
- Wind and the health transition were left alone: they already read well.

### 5. Liquid Glass

- **The overview panel and the minimap were not refracting at all.** Their wrappers animated a CSS `filter` (ending at `blur(0px)`, which still counts). A filtered ancestor becomes the backdrop root, so the glass had nothing behind it to bend or blur. Entrance and exit now run on the glass itself (`GLASS_PRESENCE` in `GlassMorph.tsx`). **Rule for new glass: never put `filter` or an animated `opacity` on an ancestor of a `.glass` element.**
- The cursor glare has a tight specular core inside the broad glow.
- In an account on desktop the seller chip leaves the capsule and the sky pill sits further left; the two overlapped at 1440px.

### 6. Performance

Production build, headless Chrome on the M5's GPU (ANGLE Metal), 60 Hz, measured with `?perf` over 6 s windows. Scene: `?seller=anthropic&weather=fair&time=12`.

| | Before | After |
| --- | --- | --- |
| Desktop 1440x900 @2x, intro | 10.9 fps at 2880x1800 | 56.3 fps at 2304x1440 (22 of 338 frames late, worst 33 ms) |
| Desktop, overview | 23.8 fps, after the governor had cut to 1800x1125 | 60.0 fps at 2304x1440, 0 dropped |
| Desktop, overview a little later | 35.5 fps, governor at 1440x900 (1x) | — |
| Desktop, account view | not measured | 60.0 fps at 2304x1440, 0 dropped |
| Lite 390x844 (585x1266), intro / overview / account | 60 / 59.8 / 60 fps, GPU timer 19.9 / 13.4 / 13.3 ms | 60 / 60 / 60 fps, GPU timer 4.9 / 4.5 / 4.3 ms |

Where the time went, and what changed:

- **Terrain shader** was most of the frame: about 22 five-octave hashed fbm calls per pixel. The same field is baked once into a tiling, mip-mapped texture (`world/noiseTexture.ts`), and valley and mountain shading sit behind branches with explicit gradients. Terrain alone went from 67 ms to under one frame at 2880x1800.
- **N8AO removed.** It was about a third of the frame and over dense foliage mostly added murk.
- **Pixel budget.** Resolution now follows a budget (3.3M pixels on desktop, 1.15M on touch) instead of a fixed `[1, 2]` range, and the governor scales that budget. At 1440x900 this is 1.6x with 4x MSAA.

Caveats:

- The "before" desktop account row is missing because the test click failed in that run; the 35.5 fps figure is the overview after the governor reached 1x.
- GPU timer values from `EXT_disjoint_timer_query` are only good as a relative measure (the desktop "after" rows report about 23 ms while holding 60 fps). Trust the fps and dropped-frame columns.
- The intro's late frames fall in the first seconds, during shader warm-up.
- **No real iPhone was measured.** The lite tier's GPU time on the M5 fell to about a third, which leaves headroom, but that is an inference, not a phone reading.
- Safari and Firefox were not opened in this session either.

### Decisions worth a second look

1. **Equinox season** changes documented behaviour (the sky no longer follows the calendar). One constant to revert.
2. **No SSAO.** If you miss the grounding under trunks, a cheap contact-shadow decal would cost far less than N8AO did.
3. **A test was changed.** The sky test asserted a June-solstice noon sun; it now asserts the equinox, and a new test checks that 5:30 pm is golden hour in every month.
4. **Resolution is 1.6x, not 2x,** at 1440x900. Raising `PIXEL_BUDGET` in `Scene.tsx` trades frame rate for sharpness.

### Not done

- The hero frame never has the river in its foreground: the low positions over the water sit inside the canopy. The river and both falls come into view as the camera rises.
- At golden hour the north-facing overview is moodier than the hero frame, because the light is side-on there.
- One dev-only console error appeared once: `Cannot read properties of undefined (reading 'isReady')` from `gl.compileAsync` when a material was disposed mid-compile (React StrictMode's double effect). Not seen on the production build.
- `.claude/launch.json` (dev and prod preview configs) is untracked.

### 45-second screen recording (LinkedIn / outreach)

Record at 1440x900 or larger in Chrome, cursor hidden where possible. Use `?seller=<their company>&time=17.5&weather=fair` so every take opens on the same golden hour.

| Time | Shot | What to do |
| --- | --- | --- |
| 0:00–0:09 | Establishing shot | Load the link and touch nothing. The giant stands against the gold haze, then the camera cranes up. Let the title read. |
| 0:09–0:13 | Overview | Hold as the labels fade in over the eight giants. |
| 0:13–0:19 | Health at a glance | Click **Needs attention** in the overview panel: healthy accounts quiet down, four stay lit. Click **All accounts** again. |
| 0:19–0:26 | Into an account | Click the flagship's label. The flight eases in, the intelligence panel opens. Pause on health 81 and the limb labels. |
| 0:26–0:33 | Neglect | **Simulate sales activity → Skip 60 days.** The crown yellows and thins, health drops. |
| 0:33–0:39 | Recovery and fruit | **Executive meeting.** The canopy greens and a new fruit swells on the limb. Click the fruit for the close-up. |
| 0:39–0:43 | Time of day | Open the sky pill and drag the slider from evening through night to dawn. |
| 0:43–0:45 | End card | **← Territory**, let the flight settle on the overview. Cut. |

Shorter alternative for a comment or DM: the first 12 seconds alone (establishing shot into the labelled overview).

---

## Earlier session: code-level fixes (no GPU)

| Commit | Item |
| --- | --- |
| `50a4d77` | 1. Soft shadows that work on three 0.185 |
| `20ec82e` | 2. Phone top bar: nothing overlaps from 360 to 430px |
| `743bb35` | 3. `?seller=` deep link |
| `3f09df2` | 4. Cleanup: THREE.Timer, `map` warnings, favicon 404 |
| `7744edf` | 5. Phone budget: terrain tiles, biome-switch memory |
| `3bac2a0` | 6. Frosted-glass fallback for Safari / iOS / Firefox |

- **Soft shadows.** `PCFShadowMap` with a patched 12-tap Vogel disk (8 on touch), in `world/softShadows.ts`. The penumbra is set in metres from cloud cover, sun elevation and night. Bark has a depth material that sways with the wind.
- **Phone top bar.** The seller chip sits under the wordmark on phones; "Skip intro" is a pill at the foot of the screen.
- **Seller deep link.** `?seller=anthropic` (any preset id or alias), optional `&role=AE|SDR|AM`. Skips onboarding and is not saved.
- **Cleanup.** Frames run on `THREE.Timer` (`timerClock.ts`); R3F still constructs one `THREE.Clock` before the swap, so its one-time deprecation warning remains.
- **Phone budget.** Terrain is drawn as 4x4 tiles sharing vertex buffers; switching biome disposes the old species.
- **Frosted fallback.** Where refraction is unavailable, glass is a layered CSS material (deep blur, lit body, corner caustic, grain, gradient rim).

### Still open from that session

1. **R3F clock warning.** Removing it needs R3F 10 or a `patch-package` patch.
2. **Phone shadows.** Touch uses 8 PCF taps. The lite tier now has more headroom, so I left it; decide with `?perf` on a real iPhone.
3. **Deep links.** A `?seller=` link does not save the seller, on purpose. Change if a returning visitor should land there again.
4. **Wild-forest shadows in the LOD fade band** were not looked at in this pass.
5. **Frosted fallback** has still not been seen in real Safari.
