import * as THREE from "three";

/** The baked noise repeats every FBM_PERIOD lattice cells. */
export const FBM_PERIOD = 32;

let fbmTexture: THREE.DataTexture | null = null;

/**
 * Five octaves of value noise, baked once into a texture that tiles: each
 * octave's lattice wraps at the texture edge. The terrain reads it instead of
 * summing hashed noise per pixel, and the atmosphere pass reads it for cloud
 * shadows.
 */
export function getFbmTexture(size = 1024): THREE.DataTexture {
  if (fbmTexture) return fbmTexture;
  const hash = (x: number, y: number, seed: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const data = new Uint8Array(size * size);
  const sum = new Float32Array(size * size);
  let amp = 0.5;
  for (let o = 0; o < 5; o++) {
    const cells = FBM_PERIOD << o;
    // Lattice values for this octave, then a smooth bilinear blend per texel.
    const lattice = new Float32Array(cells * cells);
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) lattice[j * cells + i] = hash(i, j, o + 1);
    const scale = cells / size;
    for (let y = 0; y < size; y++) {
      const fy = (y + 0.5) * scale;
      const y0 = Math.floor(fy) % cells;
      const y1 = (y0 + 1) % cells;
      let ty = fy - Math.floor(fy);
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x + 0.5) * scale;
        const x0 = Math.floor(fx) % cells;
        const x1 = (x0 + 1) % cells;
        let tx = fx - Math.floor(fx);
        tx = tx * tx * (3 - 2 * tx);
        const a = lattice[y0 * cells + x0];
        const b = lattice[y0 * cells + x1];
        const c = lattice[y1 * cells + x0];
        const d = lattice[y1 * cells + x1];
        sum[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
    amp *= 0.5;
  }
  for (let i = 0; i < sum.length; i++) data[i] = Math.round(Math.min(1, sum[i]) * 255);
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  fbmTexture = tex;
  return tex;
}
