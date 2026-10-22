import * as THREE from "three";

/**
 * A tileable rock surface generated at load: a colour map and a matching
 * normal map. Ridged noise gives the broken faces, a periodic Voronoi pattern
 * gives the cracks between blocks, and bands of strata run across it. The
 * terrain shader projects it from three sides (triplanar), so cliffs keep
 * crisp detail instead of stretched texels.
 */

const SIZE = 512;

function hash(ix: number, iy: number, period: number, seed: number) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function vnoise(x: number, y: number, period: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, period, seed);
  const b = hash(ix + 1, iy, period, seed);
  const c = hash(ix, iy + 1, period, seed);
  const d = hash(ix + 1, iy + 1, period, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Ridged fbm that tiles every `period` cells at the base octave. */
function ridged(u: number, v: number, period: number, seed: number) {
  let sum = 0;
  let amp = 0.55;
  let f = 1;
  let weight = 1;
  for (let o = 0; o < 5; o++) {
    let n = 1 - Math.abs(vnoise(u * period * f, v * period * f, period * f, seed + o) * 2 - 1);
    n *= n * weight;
    weight = Math.min(1, n * 1.7);
    sum += n * amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}

/** Distance to the nearest Voronoi edge, periodic. */
function cracks(u: number, v: number, cells: number, seed: number) {
  const x = u * cells;
  const y = v * cells;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let d1 = 9;
  let d2 = 9;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const px = cx + 0.15 + 0.7 * hash(cx, cy, cells, seed);
      const py = cy + 0.15 + 0.7 * hash(cx, cy, cells, seed + 7);
      const d = Math.hypot(px - x, py - y);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  }
  return d2 - d1;
}

let cached: { color: THREE.DataTexture; normal: THREE.DataTexture } | null = null;

export function getRockTextures() {
  if (cached) return cached;
  const height = new Float32Array(SIZE * SIZE);
  const tint = new Float32Array(SIZE * SIZE);
  const lichen = new Float32Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const u = i / SIZE;
      const v = j / SIZE;
      const r = ridged(u, v, 6, 11);
      const big = cracks(u, v, 7, 3);
      const small = cracks(u + 0.37, v + 0.11, 19, 5);
      const strata = 0.5 + 0.5 * Math.sin((v * 9 + vnoise(u * 8, v * 8, 8, 21) * 0.9) * Math.PI * 2);
      let h = r * 0.75 + strata * 0.12;
      h -= (1 - Math.min(1, big / 0.06)) * 0.45;
      h -= (1 - Math.min(1, small / 0.04)) * 0.18;
      const idx = j * SIZE + i;
      height[idx] = h;
      tint[idx] = vnoise(u * 5, v * 5, 5, 31);
      lichen[idx] = Math.max(0, vnoise(u * 12, v * 12, 12, 41) - 0.62) * 2.6 * (vnoise(u * 3, v * 3, 3, 43) > 0.45 ? 1 : 0.2);
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const h of height) {
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }

  const color = new Uint8Array(SIZE * SIZE * 4);
  const normal = new Uint8Array(SIZE * SIZE * 4);
  const at = (i: number, j: number) => height[((j + SIZE) % SIZE) * SIZE + ((i + SIZE) % SIZE)];
  const strength = 5.5;
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const idx = j * SIZE + i;
      const h = (height[idx] - lo) / (hi - lo);
      // Warm grey stone, darker in the cracks, a little rust and lichen.
      const base = 0.36 + 0.5 * h;
      const t = tint[idx];
      let r = base * (0.95 + 0.12 * t);
      let g = base * (0.93 + 0.06 * t);
      let b = base * (0.9 - 0.04 * t);
      const l = Math.min(1, lichen[idx]) * h;
      r = r * (1 - l) + 0.55 * l;
      g = g * (1 - l) + 0.58 * l;
      b = b * (1 - l) + 0.38 * l;
      color[idx * 4] = Math.min(255, r * 255);
      color[idx * 4 + 1] = Math.min(255, g * 255);
      color[idx * 4 + 2] = Math.min(255, b * 255);
      color[idx * 4 + 3] = 255;

      const dx = (at(i + 1, j) - at(i - 1, j)) * strength;
      const dy = (at(i, j + 1) - at(i, j - 1)) * strength;
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      normal[idx * 4] = (n.x * 0.5 + 0.5) * 255;
      normal[idx * 4 + 1] = (n.y * 0.5 + 0.5) * 255;
      normal[idx * 4 + 2] = (n.z * 0.5 + 0.5) * 255;
      normal[idx * 4 + 3] = 255;
    }
  }
  const make = (data: Uint8Array, srgb: boolean) => {
    const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  cached = { color: make(color, true), normal: make(normal, false) };
  return cached;
}
