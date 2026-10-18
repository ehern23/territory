# Assets and attribution

Almost everything you see in Territory is generated at runtime:

| Element | Source |
| --- | --- |
| Account trees and backdrop forest | Procedural (`src/three/flora/generateTree.ts`) |
| Leaf clusters, grass and wildflowers | Procedurally painted canvas atlases (`foliageAtlas.ts`, `Ground.tsx`) |
| Sky, clouds, sun and ridgelines | Procedural shaders (`Atmosphere.tsx`, `Horizon.tsx`) |
| Opportunity fruit | Procedural geometry and shader |

Three locally hosted texture sets come from [Poly Haven](https://polyhaven.com). License for each: **CC0 1.0 Universal** (public domain dedication). Credit is not required; it is recorded here for provenance. Runtime code never hotlinks third-party hosts.

| Asset | Poly Haven ID | Use | Files |
| --- | --- | --- | --- |
| Bark PBR | [`bark_brown_02`](https://polyhaven.com/a/bark_brown_02) | Bark detail on every trunk and limb (as luminance over a tuned base colour) | `textures/bark/{diff,nor,arm}.jpg` |
| Forest floor PBR | [`forest_leaves_03`](https://polyhaven.com/a/forest_leaves_03) | Ground micro-detail under the meadow colour field | `textures/forest_floor/{diff,nor}.jpg` |
| Outdoor HDRI | [`noon_grass`](https://polyhaven.com/a/noon_grass) | Image-based fill light only (never the visible sky) | `hdri/noon_grass_1k.hdr` |

Typeface: [Geist and Geist Mono](https://vercel.com/font) (SIL Open Font License 1.1), served locally via the `geist` package.

Re-fetch with `node scripts/fetch-polyhaven.mjs` (Poly Haven requires a User-Agent header).
