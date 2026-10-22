import * as THREE from "three";
import { createRng } from "@/lib/random";

/**
 * Procedurally painted alpha atlases for ground cover. Colour is dilated into
 * transparent texels so mipmaps never pull in dark fringes; DataTextures keep
 * that colour (a canvas texture would premultiply it away).
 */

function dilateRows(data: Uint8ClampedArray, W: number, H: number, passes: number) {
  for (let pass = 0; pass < passes; pass++) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (src[i + 3] > 0) continue;
        for (const o of [4, -4, W * 4, -W * 4]) {
          if (src[i + o + 3] > 0) {
            data[i] = src[i + o];
            data[i + 1] = src[i + o + 1];
            data[i + 2] = src[i + o + 2];
            break;
          }
        }
      }
    }
  }
}

function toTexture(data: Uint8ClampedArray, W: number, H: number) {
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

let grassTex: THREE.DataTexture | null = null;

export function getGrassAtlas() {
  if (grassTex || typeof document === "undefined") return grassTex;
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(77);
  ctx.lineCap = "round";
  for (let i = 0; i < 240; i++) {
    const x = rng.range(14, W - 14);
    const h = H * rng.range(0.4, 0.97);
    const lean = rng.gauss() * 40;
    const w = rng.range(2.5, 5);
    const v = rng.range(0.72, 1.0);
    const dry = rng.chance(0.1);
    const r = Math.round(255 * v * (dry ? 0.98 : 0.78));
    const g = Math.round(255 * v * (dry ? 0.9 : 0.95));
    const b = Math.round(255 * v * (dry ? 0.55 : 0.5));
    // Tapered blade as a filled curve.
    ctx.beginPath();
    ctx.moveTo(x - w / 2, H);
    ctx.quadraticCurveTo(x - w / 2 + lean * 0.3, H - h * 0.55, x + lean, H - h);
    ctx.quadraticCurveTo(x + w / 2 + lean * 0.3, H - h * 0.55, x + w / 2, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `rgb(${Math.round(r * 0.82)},${Math.round(g * 0.86)},${Math.round(b * 0.76)})`);
    grad.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data);
  // Dilate colour into transparent texels so mips keep the blade colour.
  for (let pass = 0; pass < 4; pass++) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (src[i + 3] > 0) continue;
        for (const o of [4, -4, W * 4, -W * 4]) {
          if (src[i + o + 3] > 0) {
            data[i] = src[i + o];
            data[i + 1] = src[i + o + 1];
            data[i + 2] = src[i + o + 2];
            break;
          }
        }
      }
    }
  }
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  // Canvas rows run top-down; flip so blades grow up from v = 0.
  tex.flipY = false;
  tex.needsUpdate = true;
  grassTex = tex;
  return tex;
}


let flowerTex: THREE.DataTexture | null = null;

/** Four cells of small meadow flowers on stems: white, butter-yellow, lilac, cream. */
export function getFlowerAtlas() {
  if (flowerTex || typeof document === "undefined") return flowerTex;
  const C = 128;
  const canvas = document.createElement("canvas");
  canvas.width = C * 4;
  canvas.height = C;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(31);
  const petals = ["#f4f1e8", "#f1d65a", "#c7a6e0", "#f5e6bf"];
  const centers = ["#e7b53a", "#c98a1e", "#f0e2a0", "#d9a53a"];
  for (let cell = 0; cell < 4; cell++) {
    const ox = cell * C;
    for (let f = 0; f < 4; f++) {
      const x = ox + 22 + f * 26 + rng.gauss() * 6;
      const top = C * rng.range(0.12, 0.42);
      ctx.strokeStyle = "rgb(96,124,58)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + rng.gauss() * 4, C);
      ctx.quadraticCurveTo(x + rng.gauss() * 8, (C + top) / 2, x, top);
      ctx.stroke();
      const r = rng.range(6, 9.5);
      ctx.fillStyle = petals[cell];
      const n = cell === 2 ? 0 : 6;
      if (n === 0) {
        // Clover-like head.
        for (let k = 0; k < 9; k++) {
          ctx.beginPath();
          ctx.arc(x + rng.gauss() * r * 0.5, top + rng.gauss() * r * 0.5, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.6, top + Math.sin(a) * r * 0.45, r * 0.55, r * 0.32, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = centers[cell];
        ctx.beginPath();
        ctx.arc(x, top, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, C * 4, C).data);
  for (let pass = 0; pass < 3; pass++) {
    const src = new Uint8ClampedArray(data);
    for (let i = 4; i < data.length - 4; i += 4) {
      if (src[i + 3] > 0) continue;
      for (const o of [4, -4]) {
        if (src[i + o + 3] > 0) {
          data[i] = src[i + o];
          data[i + 1] = src[i + o + 1];
          data[i + 2] = src[i + o + 2];
          break;
        }
      }
    }
  }
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), C * 4, C, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  flowerTex = tex;
  return tex;
}


let fernTex: THREE.DataTexture | null = null;

/**
 * One fern frond, base at the bottom (v = 1 after flip) and tip at the top:
 * a curved rachis with paired pinnae that shorten toward the tip.
 */
export function getFernAtlas() {
  if (fernTex || typeof document === "undefined") return fernTex;
  const W = 256;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(53);
  const cx = W / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push([cx + Math.sin(t * 2.2) * 10 * t, H - 6 - t * (H - 20)]);
  }
  ctx.lineCap = "round";
  // Pinnae: lobed leaflets either side, longest a third of the way up.
  for (let i = 3; i < 40; i++) {
    const t = i / 40;
    const [x, y] = pts[i];
    const len = W * 0.44 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05)) * (1 - t * 0.35);
    for (const side of [-1, 1]) {
      const ang = side * (1.15 - t * 0.35) + (rng.next() - 0.5) * 0.1;
      const ex = x + Math.sin(ang) * len;
      const ey = y - Math.cos(ang) * len * 0.42;
      const v = 0.6 + rng.next() * 0.3 + t * 0.1;
      ctx.strokeStyle = `rgb(${Math.round(92 * v)},${Math.round(150 * v)},${Math.round(62 * v)})`;
      ctx.lineWidth = Math.max(2, 7 * (1 - t * 0.7));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 - 6, ex, ey);
      ctx.stroke();
      // Lobes along the pinna.
      ctx.fillStyle = ctx.strokeStyle;
      for (let k = 1; k <= 5; k++) {
        const f = k / 6;
        const lx = x + (ex - x) * f;
        const ly = y + (ey - y) * f - 3;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 4.2 * (1 - f * 0.6), 2.6, ang, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = "rgb(88,112,52)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data);
  dilateRows(data, W, H, 4);
  fernTex = toTexture(data, W, H);
  return fernTex;
}

let needleTex: THREE.DataTexture | null = null;

/** Spruce sprigs in a 2×2 atlas, matching the broadleaf card layout. */
export function getNeedleAtlas() {
  if (needleTex || typeof document === "undefined") return needleTex;
  const C = 256;
  const canvas = document.createElement("canvas");
  canvas.width = C * 2;
  canvas.height = C * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(97);
  ctx.lineCap = "round";
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * C;
    const oy = Math.floor(cell / 2) * C;
    const sprigs = 5 + (cell % 2);
    for (let s = 0; s < sprigs; s++) {
      const a = (s / sprigs) * Math.PI * 2 + rng.gauss() * 0.3;
      const x0 = ox + C / 2 + Math.cos(a) * 6;
      const y0 = oy + C / 2 + Math.sin(a) * 6;
      const len = C * (0.32 + rng.next() * 0.12);
      const x1 = x0 + Math.cos(a) * len;
      const y1 = y0 + Math.sin(a) * len;
      ctx.strokeStyle = "rgb(74,62,44)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      // Dense short needles along the twig.
      for (let k = 0; k < 46; k++) {
        const f = k / 46;
        const px = x0 + (x1 - x0) * f;
        const py = y0 + (y1 - y0) * f;
        const nl = 13 * (1 - f * 0.5) * (0.8 + rng.next() * 0.4);
        // Brighter toward the tips, where new growth catches the light.
        const v = (0.7 + rng.next() * 0.38) * (0.85 + 0.35 * f);
        ctx.strokeStyle = `rgb(${Math.round(92 * v)},${Math.round(150 * v)},${Math.round(98 * v)})`;
        ctx.lineWidth = 1.6;
        for (const side of [-1, 1]) {
          const na = a + side * (0.9 + rng.gauss() * 0.15);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(na) * nl, py + Math.sin(na) * nl);
          ctx.stroke();
        }
      }
    }
  }
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, C * 2, C * 2).data);
  dilateRows(data, C * 2, C * 2, 5);
  const tex = toTexture(data, C * 2, C * 2);
  tex.flipY = false;
  needleTex = tex;
  return tex;
}
