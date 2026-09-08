# Environmental assets

Territory ships a small set of locally hosted CC0 assets from [Poly Haven](https://polyhaven.com). Files are downloaded into `public/assets` and served from this repository. Runtime code does not hotlink third-party hosts.

License for every asset below: **CC0 1.0 Universal** (public domain dedication). Credit is not required; it is recorded here for provenance.

| Asset | Poly Haven ID | Use in Territory | Runtime files | Notes |
| --- | --- | --- | --- | --- |
| Forest floor PBR | [`forest_leaves_03`](https://polyhaven.com/a/forest_leaves_03) | Terrain albedo / normal / ARM | `textures/forest_floor/{diff,nor,arm}.jpg` | 1K JPEG |
| Bark PBR | [`bark_brown_02`](https://polyhaven.com/a/bark_brown_02) | Strategic-account trunks and limbs | `textures/bark/{diff,nor,arm}.jpg` | 1K JPEG; UV repeat along limbs |
| Foliage cards | [`tree_small_02`](https://polyhaven.com/a/tree_small_02) leaf maps | Decorative (non-interactive) canopy | `textures/foliage/leaves_{diff,nor,arm}.jpg` | JPEG; luma used as alpha |
| Outdoor HDRI | [`noon_grass`](https://polyhaven.com/a/noon_grass) | Image-based lighting only | `hdri/noon_grass_1k.hdr` | Not used as the visible sky |
| Fern | [`fern_02`](https://polyhaven.com/a/fern_02) | Undergrowth | `models/fern_02.glb` | Packed from 1K glTF |
| Grass clump | [`grass_medium_01`](https://polyhaven.com/a/grass_medium_01) | Forest-floor grass | `models/grass_medium_01.glb` | Simplified, then packed |
| Mossy rocks | [`rock_moss_set_01`](https://polyhaven.com/a/rock_moss_set_01) | Individual buried rocks | `models/rock_moss_set_01.glb` | Six meshes; three are instanced |
| Shrub | [`shrub_02`](https://polyhaven.com/a/shrub_02) | Mid-height undergrowth | `models/shrub_02.glb` | Packed from 1K glTF |
| Ordinary tree | [`tree_small_02`](https://polyhaven.com/a/tree_small_02) | Surrounding non-strategic forest | `models/tree_small_02.glb`, `tree_small_02_lod.glb` | Photogrammetry mesh; welded and simplified for web. Near LOD ~61k tris; far LOD more aggressive. |

Re-fetch textures/HDRI/unpacked glTFs with `node scripts/fetch-polyhaven.mjs` (requires a User-Agent header; Poly Haven returns 403 without one). Do not reintroduce unpacked `.gltf` folders or 8K sources into `public/`.
