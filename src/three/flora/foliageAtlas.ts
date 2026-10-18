import * as THREE from "three";
import { createRng, type Rng } from "@/lib/random";

/**
 * Procedural leaf-cluster atlas (2×2 cells), painted once on a canvas.
 *
 * Each cell is a loose spray of broad leaves around a few twigs, drawn back to
 * front with value variation so a single card already reads as a volume. The
 * albedo is a light, nearly neutral green: the foliage shader tints it by
 * account vitality, so one texture serves every health state.
 */

const CELL = 512;
let cached: THREE.DataTexture | null = null;

function leafPath(ctx: CanvasRenderingContext2D, len: number, wid: number, asym: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.22, -wid * (1 + asym), len * 0.68, -wid * 0.95, len, 0);
  ctx.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.24, wid * (1 - asym), 0, 0);
  ctx.closePath();
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  angle: number,
  len: number,
  depth: number,
) {
  const wid = len * rng.range(0.34, 0.44);
  const asym = rng.gauss() * 0.12;
  // Back leaves are darker and cooler; front leaves catch light.
  const v = 0.52 + depth * 0.38 + rng.gauss() * 0.06;
  const hue = rng.gauss() * 0.06; // + warmer / - cooler
  const r = Math.round(255 * Math.min(1, v * (0.86 + hue)));
  const g = Math.round(255 * Math.min(1, v * 1.0));
  const b = Math.round(255 * Math.min(1, v * (0.66 - hue * 0.6)));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Petiole.
  ctx.strokeStyle = `rgba(${Math.round(r * 0.55)},${Math.round(g * 0.5)},${Math.round(b * 0.4)},1)`;
  ctx.lineWidth = Math.max(1.2, len * 0.035);
  ctx.beginPath();
  ctx.moveTo(-len * 0.16, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Blade with a light-to-dark gradient across the fold.
  leafPath(ctx, len, wid, asym);
  const grad = ctx.createLinearGradient(0, -wid, 0, wid);
  grad.addColorStop(0, `rgb(${Math.round(r * 1.08)},${Math.round(g * 1.08)},${Math.round(b * 1.05)})`);
  grad.addColorStop(0.5, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r * 0.78)},${Math.round(g * 0.8)},${Math.round(b * 0.78)})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Tip/base shading along the length.
  const along = ctx.createLinearGradient(0, 0, len, 0);
  along.addColorStop(0, "rgba(0,0,0,0.16)");
  along.addColorStop(0.35, "rgba(0,0,0,0)");
  along.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = along;
  ctx.fill();

  // Midrib and a few veins.
  ctx.strokeStyle = `rgba(${Math.round(r * 1.15)},${Math.round(g * 1.12)},${Math.round(b * 0.95)},0.55)`;
  ctx.lineWidth = Math.max(0.8, len * 0.022);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, asym * wid * 0.3, len * 0.92, 0);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.5, len * 0.01);
  for (let i = 1; i <= 4; i++) {
    const t = i / 5.2;
    ctx.beginPath();
    ctx.moveTo(len * t, 0);
    ctx.lineTo(len * (t + 0.12), -wid * 0.62);
    ctx.moveTo(len * t, 0);
    ctx.lineTo(len * (t + 0.12), wid * 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCluster(ctx: CanvasRenderingContext2D, ox: number, oy: number, seed: number) {
  const rng = createRng(seed);
  const cx = ox + CELL / 2;
  const cy = oy + CELL / 2;

  // A few twigs radiating from near the centre; leaves hang off them.
  const twigs = 5 + rng.int(0, 2);
  const leaves: { x: number; y: number; a: number; len: number; depth: number }[] = [];
  ctx.lineCap = "round";
  for (let t = 0; t < twigs; t++) {
    const a = (t / twigs) * Math.PI * 2 + rng.gauss() * 0.4;
    const reach = CELL * rng.range(0.2, 0.3);
    const bend = rng.gauss() * 0.5;
    const sx = cx + Math.cos(a) * CELL * 0.03;
    const sy = cy + Math.sin(a) * CELL * 0.03;
    const ex = cx + Math.cos(a + bend * 0.3) * reach;
    const ey = cy + Math.sin(a + bend * 0.3) * reach;
    ctx.strokeStyle = "rgb(92,84,64)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      (sx + ex) / 2 + Math.cos(a + Math.PI / 2) * bend * 24,
      (sy + ey) / 2 + Math.sin(a + Math.PI / 2) * bend * 24,
      ex,
      ey,
    );
    ctx.stroke();
    const n = 5 + rng.int(0, 3);
    for (let i = 0; i < n; i++) {
      const f = 0.25 + (0.75 * (i + 0.5)) / n;
      const px = sx + (ex - sx) * f;
      const py = sy + (ey - sy) * f;
      const side = i % 2 === 0 ? 1 : -1;
      leaves.push({
        x: px,
        y: py,
        a: a + side * rng.range(0.5, 1.05) + rng.gauss() * 0.2,
        len: CELL * rng.range(0.11, 0.165) * (1 - f * 0.25),
        depth: rng.next(),
      });
    }
    leaves.push({ x: ex, y: ey, a: a + rng.gauss() * 0.2, len: CELL * rng.range(0.12, 0.16), depth: rng.next() });
  }
  // Loose fill so the centre is not hollow.
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = CELL * Math.sqrt(rng.next()) * 0.17;
    leaves.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      a: a + rng.gauss() * 0.6,
      len: CELL * rng.range(0.1, 0.15),
      depth: rng.next() * 0.7,
    });
  }

  leaves.sort((p, q) => p.depth - q.depth);
  for (const l of leaves) {
    // Keep every blade inside its cell so mipmaps never bleed between cells.
    const maxLen = Math.min(
      l.len,
      Math.max(8, CELL * 0.47 - Math.hypot(l.x - cx, l.y - cy)),
    );
    drawLeaf(ctx, rng, l.x, l.y, l.a, maxLen, l.depth);
  }
}

/**
 * Colour channels are dilated beyond the alpha edge so mip levels do not
 * pull in black fringes.
 */
function dilate(d: Uint8ClampedArray, size: number) {
  for (let pass = 0; pass < 6; pass++) {
    const src = new Uint8ClampedArray(d);
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = (y * size + x) * 4;
        if (src[i + 3] > 8) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const j = ((y + dy) * size + (x + dx)) * 4;
          if (src[j + 3] > 8) {
            r += src[j];
            g += src[j + 1];
            b += src[j + 2];
            n += 1;
          }
        }
        if (n > 0) {
          d[i] = r / n;
          d[i + 1] = g / n;
          d[i + 2] = b / n;
          d[i + 3] = 9; // below the alpha cut, but marks the texel as filled
        }
      }
    }
  }
  // Restore true transparency for the dilated ring (colour stays behind).
  for (let i = 3; i < d.length; i += 4) if (d[i] === 9) d[i] = 0;
}

export function getFoliageAtlas(): THREE.DataTexture | null {
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * 2;
  canvas.height = CELL * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCluster(ctx, 0, 0, 1101);
  drawCluster(ctx, CELL, 0, 2203);
  drawCluster(ctx, 0, CELL, 3307);
  drawCluster(ctx, CELL, CELL, 4409);
  const size = CELL * 2;
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, size, size).data);
  dilate(data, size);

  // A DataTexture keeps the dilated colour under fully transparent texels;
  // a canvas would premultiply it away.
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
