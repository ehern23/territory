import * as THREE from "three";
import { MAP_HALF, groundCover, terrainHeight } from "../layout";

/**
 * World data on the GPU.
 *
 * `height` is the terrain height (half-float, linearly filtered) and `cover`
 * holds what grows there: R grass, G ferns, B flowers, A water. Both cover
 * [-MAP_HALF, MAP_HALF]² so ground cover can be placed in the vertex shader
 * anywhere the camera goes, with no per-instance CPU work.
 */

export interface WorldMaps {
  height: THREE.DataTexture;
  cover: THREE.DataTexture;
  size: number;
}

let cached: WorldMaps | null = null;

export function getWorldMaps(lowRes = false): WorldMaps {
  if (cached) return cached;
  const size = lowRes ? 384 : 640;
  const heights = new Uint16Array(size * size);
  const cover = new Uint8Array(size * size * 4);
  const step = (MAP_HALF * 2) / (size - 1);
  for (let j = 0; j < size; j++) {
    const z = -MAP_HALF + j * step;
    for (let i = 0; i < size; i++) {
      const x = -MAP_HALF + i * step;
      const k = j * size + i;
      heights[k] = THREE.DataUtils.toHalfFloat(terrainHeight(x, z));
      // On low-power devices cover is sampled on every other texel and copied.
      if (!lowRes || ((i & 1) === 0 && (j & 1) === 0)) {
        const c = groundCover(x, z);
        const o = k * 4;
        cover[o] = Math.round(c.grass * 255);
        cover[o + 1] = Math.round(c.ferns * 255);
        cover[o + 2] = Math.round(c.flowers * 255);
        cover[o + 3] = Math.round(c.water * 255);
      }
    }
  }
  // Fill the skipped cover texels from their even neighbours.
  for (let j = 0; lowRes && j < size; j++) {
    for (let i = 0; i < size; i++) {
      if ((i & 1) === 0 && (j & 1) === 0) continue;
      const si = Math.min(size - 1, i - (i & 1));
      const sj = Math.min(size - 1, j - (j & 1));
      const src = (sj * size + si) * 4;
      const dst = (j * size + i) * 4;
      cover[dst] = cover[src];
      cover[dst + 1] = cover[src + 1];
      cover[dst + 2] = cover[src + 2];
      cover[dst + 3] = cover[src + 3];
    }
  }

  const height = new THREE.DataTexture(heights, size, size, THREE.RedFormat, THREE.HalfFloatType);
  height.magFilter = THREE.LinearFilter;
  height.minFilter = THREE.LinearFilter;
  height.wrapS = height.wrapT = THREE.ClampToEdgeWrapping;
  height.needsUpdate = true;

  const coverTex = new THREE.DataTexture(cover, size, size, THREE.RGBAFormat);
  coverTex.magFilter = THREE.LinearFilter;
  coverTex.minFilter = THREE.LinearFilter;
  coverTex.wrapS = coverTex.wrapT = THREE.ClampToEdgeWrapping;
  coverTex.needsUpdate = true;

  cached = { height, cover: coverTex, size };
  return cached;
}

/** GLSL helpers shared by everything that samples the world maps. */
export const WORLD_MAP_GLSL = /* glsl */ `
uniform sampler2D uWorldHeight;
uniform sampler2D uWorldCover;
uniform float uMapHalf;
vec2 worldUv(vec2 xz) { return clamp((xz + uMapHalf) / (2.0 * uMapHalf), 0.0, 1.0); }
float worldHeight(vec2 xz) { return texture2D(uWorldHeight, worldUv(xz)).r; }
vec4 worldCover(vec2 xz) { return texture2D(uWorldCover, worldUv(xz)); }
`;

export function worldMapUniforms(maps: WorldMaps) {
  return {
    uWorldHeight: { value: maps.height },
    uWorldCover: { value: maps.cover },
    uMapHalf: { value: MAP_HALF },
  };
}
