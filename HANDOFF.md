# Handoff: `visual-polish`

Branch `visual-polish`, cut from `main` at `5b910c0`. Not merged. One commit per item, in order:

| Commit | Item |
| --- | --- |
| `50a4d77` | 1. Soft shadows that work on three 0.185 |
| `20ec82e` | 2. Phone top bar: nothing overlaps from 360 to 430px |
| `743bb35` | 3. `?seller=` deep link |
| `3f09df2` | 4. Cleanup: THREE.Timer, `map` warnings, favicon 404 |
| `7744edf` | 5. Phone budget: terrain tiles, biome-switch memory |
| `3bac2a0` | 6. Frosted-glass fallback for Safari / iOS / Firefox |

At the end of the branch:
- `npm test`: 79/79 pass. The 7 new tests cover soft shadows, the deep link and the Timer clock.
- `npm run typecheck`: clean.
- `npm run build`: passes.

`src/domain`, `src/store` and `/api/territory` are unchanged.

This machine has no GPU (SwiftShader only). Nothing below is a judgement of how it *looks*. The visual checks were objective ones only: layout and overlaps, shaders compiling, styles applying, no holes. Everything marked **GPU pass** needs a look on real hardware.

---

## 1. Soft shadows

**Problem.** `THREE.PCFSoftShadowMap` is deprecated in three 0.185. The renderer warns and swaps in `PCFShadowMap`, and the light kept the default `shadow.radius = 1`, so shadows were effectively hard.

**What changed**
- `Scene.tsx` asks for `THREE.PCFShadowMap` directly, so the deprecation warning is gone.
- In 0.185, `PCFShadowMap` already filters with a rotated Vogel disk of `shadow.radius` texels. It uses only 5 hardware-PCF taps, which turns grainy at a wide radius.
  - `src/three/world/softShadows.ts` patches `THREE.ShaderChunk.shadowmap_pars_fragment` once at load to use **12 taps (8 on touch / `?lite`)**.
  - The patch matches the exact five-tap block. If a future three changes it, the patch logs a warning and leaves three's own filter in place rather than breaking shaders.
  - Only the directional/spot PCF path is touched. Point-light shadows and all depth passes are unchanged.
- `Atmosphere.tsx` (KeyLight) sets `shadow.radius` every frame from a penumbra in **metres**:
  - 0.32 m base, wider under cloud, at low sun and by moonlight;
  - converted to texels for the current map (4096 over 460 m on desktop, 2048 over 320 m on touch), so softness matches across budgets;
  - clamped to 1–9 texels.
- **Depth materials still match the visible trees.**
  - Foliage already had a custom depth material that shares the same vertex code: wind sway plus health thinning.
  - Bark swayed in the wind but cast its shadow through the default depth material, so trunk and limb shadows stood still.
  - New `createBarkDepthMaterial()` (floraMaterials.ts) applies the same wind to bark, on account trees and the wild forest.
- Tests: `src/__tests__/softShadows.test.ts`. A headless Chromium run confirms the patched shaders compile.

**GPU pass**
- Tune the penumbra constants in `penumbraMetres()` by eye.
- Check for grain at the widest radius (overcast + low sun).
- Check for acne or peter-panning with the current `bias -0.0004 / normalBias 0.4`.

## 2. Phone top bar (360–430px)

**Before.** At 390px the button capsule was 342px wide. It squeezed the wordmark to 4px and sat on top of it. "Skip intro" sat in the same row.

**After** (`TopBar.tsx`, `globals.css`)
- On phones the seller chip moves **under the wordmark**, where desktop shows its tagline.
  - It reads "Selling for Vercel ▾", or "Vercel ▾" under 380px.
  - The capsule now holds only the icon buttons and Demo.
- Capsule icons are 36px square touch targets. The bar uses 12px side margins on phones.
- "Skip intro" is a pill at the foot of the screen on phones (desktop unchanged).
- In account mode the wordmark yields to the mark alone under 380px.

**Verified** with Playwright at 360 / 390 / 430px in the intro, forest and account states. Element boxes show no overlaps. The sky pill and the onboarding card clear the bar.

## 3. Seller deep link

`?seller=anthropic` (or `openai`, `cursor`, `stripe`, any preset id or alias, any case, `-`/`_` allowed) opens straight into that preset. `&role=AE|SDR|AM` is optional.
- The onboarding card stays closed for that visit.
- The linked seller is **not saved**, so a shared link never replaces the visitor's own remembered seller.
- An unknown seller falls back to the normal first-visit flow.
- Code: `sellerFromSearch`, `applySellerDeepLink` and `openedFromDeepLink` in `components/onboarding/seller.ts`; wired in `TerritoryApp.tsx`.
- It reads `window.location.search` in an effect, as the other URL flags do, so no `useSearchParams` Suspense boundary is needed on the static page.
- Tests: `src/__tests__/deepLink.test.ts`. Browser check with fresh storage:
  - `?seller=anthropic` loaded Anthropic, onboarding closed, nothing persisted;
  - `?seller=OpenAI&role=SDR` gave the OpenAI preset with the SDR role;
  - plain `/` still opens onboarding.

## 4. Cleanup

- **THREE.Clock → THREE.Timer.**
  - The app itself never used `THREE.Clock`. R3F 9 builds its frame clock from it (still true in 9.8.2, the latest 9.x).
  - `src/three/timerClock.ts` is a `THREE.Timer`-backed clock with the surface R3F and drei use (`getDelta`, `elapsedTime`/`oldTime`, `start`/`stop`). It also follows page visibility, so returning to a tab gives no huge first delta.
  - `Scene.tsx` swaps it in at `onCreated`, so every frame runs on `Timer`.
  - **Open:** R3F still constructs one `THREE.Clock` internally before the swap, so **its one-time deprecation warning remains**. Removing it needs R3F 10, or a `patch-package` patch to `@react-three/fiber`. I tried the patch, but this environment blocked edits to `node_modules` and adding the dependency. If you want it, approve `patch-package` as a dev dependency and replace `clock: new THREE.Clock()` in R3F's three dist files with the `timerClock` adapter.
- **`'map' has value of undefined` (×4).**
  - Materials were built with `map: undefined` (pebbles, foliage atlases, bark without maps).
  - They now pass `null`, three's "no texture" value.
- **The desktop 404** was the browser's automatic `/favicon.ico` request: the app had no icon.
  - Added the Territory mark as `src/app/icon.svg`, plus `favicon.ico` (16/32/48 px) and a 180 px `apple-icon.png` rendered from it.
  - Production server: all three return 200, and the load shows no failed requests.
- **Remaining console output on desktop load (production):**
  - the R3F `Clock` warning above;
  - `KHR_parallel_shader_compile not supported`. That one is specific to SwiftShader; Chrome on real GPUs supports the extension.

## 5. Phone budget (recent iPhone)

**Measured** with `?lite` at 393×852 @3x (iPhone 15 size). Frame times on SwiftShader mean nothing, so I recorded structure only:
- canvas 589×1278 at DPR 1.5;
- about 100 draw calls;
- 1.6 M triangles per frame, shadow pass included;
- 34 programs.

Largest items:

| Item | Triangles | Notes |
| --- | --- | --- |
| Terrain | 353 k | One mesh, never culled |
| Grass | 342 k | 57 k blades |
| Ferns etc. | 164 k | |
| Account giants | ~50 k each | Drawn twice: colour + shadow pass |

**Applied (look-neutral)**
- **Terrain tiles.**
  - The terrain is drawn as a 4×4 set of tiles sharing one set of vertex buffers, so off-screen tiles are frustum-culled.
  - Overview camera: 1.60 M → 1.49 M triangles for +10 draw calls. Far more is culled at ground level and in Explore.
  - Same vertices, same shading. Screenshots show no holes or seams.
- **Biome-switch leak.** Switching forest now disposes the previous species' geometries and materials. Before, every switch only added GPU memory, which is what gets a Safari tab killed on a phone. Shared textures are kept.

**Not applied (would change the look). Measure on a device first with `?perf`, then decide.** Safari doesn't expose GPU timer queries, so the overlay shows frame times only there.
1. **Shadow cost.** Item 1 raised touch taps from 5 to 8, roughly 60% more shadow lookups per shadowed pixel. Two options:
   - drop touch back to 5 taps and cap the touch radius at about 3 texels, which gives slightly firmer shadows under cloud;
   - or re-render the shadow map every other frame on touch, which makes wind-swayed shadows move at 30 Hz.
2. **Account giants in the shadow pass.** Their full foliage (about 400 k triangles in total) is drawn into the shadow map every frame. Low-detail cards for the depth pass only would make crown shadow shapes slightly coarser.
3. **Post-processing targets.** The composer uses `HalfFloatType` targets. On touch, `UnsignedByteType` halves bandwidth but risks banding in the sky gradient. Bloom's mip chain could also drop to fewer levels.
4. **Grass density.** Touch uses 0.38× of desktop (57 k blades). 0.3× would save about 70 k triangles and some overdraw, at a visibly sparser meadow.
5. **Resolution.** The DPR cap is 1.5 on touch; 1.25 would cut fragment work by about 30% at slightly softer edges. The existing governor already steps down after 8 s if frame rate falls.
6. **Terrain textures.** Anisotropy 8 → 4 on touch, slightly blurrier ground at grazing angles.
7. **Shader warm-up.** iOS lacks `KHR_parallel_shader_compile`, so the precompile sweeps at 0.4 / 1.5 / 4 s compile synchronously during the intro. That's intended, since it beats mid-interaction hitches. Watch for an intro stutter on iPhone. A single sweep at 1.5 s is the alternative.

## 6. Frosted-glass fallback (CSS only)

Where the Chromium refraction filter isn't active (`.glass:not(.lg-refract)`: Safari, iOS, Firefox), glass is now a layered material instead of a flat blurred tint. Chromium's refraction path is unchanged. The layers:
- a deeper saturated blur: 26px, or 32px with a denser frost on text panels (`.glass-strong`);
- a body lit slightly from above, derived from each surface's `--glass-tint`;
- a soft caustic glow in the top-left corner;
- fine SVG grain so large blurred panels don't band;
- a **specular rim** drawn as a gradient border: bright along the top edge, faint down the sides, catching a little light underneath, and brighter on pills.

Fallbacks: near-solid glass without `backdrop-filter` or with `prefers-reduced-transparency`, and a firmer edge with `prefers-contrast: more`.

**Verified** in Chromium with Safari macOS and iOS user agents (which turn refraction off): every glass surface takes the new styles, and there are no errors. There is no WebKit build here.

**GPU pass**
- Look at it in real Safari on a Mac and an iPhone.
- Tune the rim alphas (`--glass-rim-*`), the grain (the `0.05` alpha in the data-URI matrix) and the blur radii.

---

## Open questions

1. **R3F clock warning:** OK to add `patch-package` (or wait for R3F 10) to remove the last `THREE.Clock`?
2. **Phone shadows:** keep 8 taps and accept the cost, or go back to 5 with a radius cap (item 5.1)? Best decided with `?perf` on an iPhone.
3. **Deep links:** should a `?seller=` link also save the seller, so a returning visitor lands there again? It currently doesn't, on purpose.
4. **Wild-forest shadows:** wild-forest trees in the LOD fade band (150–195 m from the camera) still cast full shadows while their crowns dither out. That's not new; worth a look on GPU.
