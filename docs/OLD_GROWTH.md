# Old-growth visual architecture

Territory separates seller meaning from environmental art. Account topology and relationship state remain in the existing procedural tree model and Zustand store. The old-growth layer supplies the setting around that model.

## Scene composition

`Scene` renders `Landscape` before the account `Tree` instances. `Landscape` contains:

- `Terrain`: a 1960 × 1960 displaced plane driven by `terrainHeight`, with 320 × 320 segments on desktop and 180 × 180 on touch-capable pointers.
- `Ecology`: locally hosted Poly Haven CC0 tree, grass, fern, shrub, and rock assets placed through deterministic scatter helpers.
- `FernBeds`: a procedural instanced swordfern layer. Each shared plant has eight curved fronds and paired pointed leaflets, with deterministic clusters anchored to terrain. Placement avoids account clearings and the creek corridor. The current density is 1200 plants on desktop and 600 on touch-capable pointers.
- `DistantForest`: three rings of non-interactive crossed-card conifers at 340–850 world units and two irregular mountain ridge strips beyond them. It is hidden in Roots view.

The strategic canopy is `DecorativeCanopy` inside each active or forest tree. It follows generated twigs and branches, uses shared procedural spray geometry, and dims or removes mass according to branch focus and dormancy. It does not create account entities or alter the domain model.

## Biome constants and assets

`src/three/biome.ts` holds the art direction constants in `OLD_GROWTH`: fog, ground, canopy, sunlight, exposure, and desktop/mobile DPR targets. `Scene`, `Landscape`, and `Canopy` consume these values rather than embedding the palette in their semantic logic.

The original environmental textures, models, and HDRI are locally hosted CC0 assets from Poly Haven. Their provenance and runtime uses are recorded in `public/assets/CREDITS.md`. The visible sky is procedural; the HDRI is used for image-based lighting.

## Performance controls

Large repeated elements use instanced meshes or shared geometry. Fern, distant-forest, and canopy instance transforms are prepared from seeded data and written during setup or semantic state changes. Canopy and fern wind update a shader uniform rather than rewriting instance matrices. Distant scenery has no pointer handlers and no account semantics.

The existing capability check uses `matchMedia("(pointer: coarse)")` to set the store's `isTouch` flag. That flag selects lower DPR, fewer ecology scatter items, and lower fern density. These settings are capability-based quality choices, not a benchmark of a specific real device.

Development builds expose render FPS, calls, triangles, and texture count through the canvas `data-render-stats` attribute. This is a diagnostic aid, not a production telemetry path.

## Reduced motion

`Scene` observes `prefers-reduced-motion` and stores the result. Reduced motion freezes canopy and fern shader wind, stops cloud drift and canopy sway, and makes camera transitions immediate. Living interactions settle without animation: meeting leaves complete directly at their base marker, reactivation buds complete semantically, and selection rings do not pulse. The underlying status, activity, signal, and opportunity state still changes through the same store actions.

## Future biome boundary

The biome layer should remain an art-direction boundary. A future biome can introduce another constants module and environmental components while reusing terrain, scatter, and lifecycle interfaces. Account topology, relationship progression, opportunity evaluation, activity history, and seller navigation should continue to live in `src/domain`, `src/data`, `src/store`, and the semantic tree components rather than moving into biome code.
