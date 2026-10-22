import * as THREE from "three";
import { createRng } from "@/lib/random";
import type { Branch, TreeShape } from "./generateTree";

/**
 * Geometry from a TreeShape: one merged bark mesh and one merged foliage mesh.
 *
 * Bark vertices carry `aBark = (flex, limb)` for wind and per-limb state.
 * Foliage vertices carry the card centre, `aLeaf = (colourRand, densityRand,
 * limb, flex)` and a baked crown-occlusion term, so thinning, colour and wind
 * all happen in the shader without rebuilding geometry.
 */

const RADIAL = [14, 9, 6, 4];
const BARK_TEX_SCALE = 3.2;

export interface TreeGeometries {
  bark: THREE.BufferGeometry;
  foliage: THREE.BufferGeometry;
}

function frames(points: THREE.Vector3[]) {
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    tangents.push(b.clone().sub(a).normalize());
  }
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  // Parallel transport from an arbitrary initial normal.
  const t0 = tangents[0];
  let n = new THREE.Vector3(0, 0, 1);
  if (Math.abs(t0.dot(n)) > 0.9) n = new THREE.Vector3(1, 0, 0);
  n = n.sub(t0.clone().multiplyScalar(n.dot(t0))).normalize();
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i]);
      const len = axis.length();
      if (len > 1e-6) {
        axis.divideScalar(len);
        const angle = Math.acos(THREE.MathUtils.clamp(tangents[i - 1].dot(tangents[i]), -1, 1));
        n = n.clone().applyAxisAngle(axis, angle);
      }
    }
    normals.push(n.clone());
    binormals.push(new THREE.Vector3().crossVectors(tangents[i], n).normalize());
  }
  return { tangents, normals, binormals };
}

export function buildBarkGeometry(shape: TreeShape, opts: { lowDetail?: boolean } = {}) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const bark: number[] = [];
  const idx: number[] = [];
  const rng = createRng(7);
  const flareH = shape.height * 0.1;

  const addBranch = (b: Branch) => {
    let radial = RADIAL[Math.min(RADIAL.length - 1, b.level)];
    // Distant trees: fewer sides and every other ring — bark is mostly hidden by foliage.
    let points = b.points;
    let radii = b.radii;
    let flex = b.flex;
    if (opts.lowDetail) {
      radial = b.level === 0 ? 7 : 3;
      if (b.level >= 1) {
        const keep = b.points.map((_, i) => i % 2 === 0 || i === b.points.length - 1);
        points = b.points.filter((_, i) => keep[i]);
        radii = b.radii.filter((_, i) => keep[i]);
        flex = b.flex.filter((_, i) => keep[i]);
      }
    }
    const { normals, binormals } = frames(points);
    const base = pos.length / 3;
    const uRepeat = Math.max(1, Math.round((Math.PI * 2 * radii[0]) / BARK_TEX_SCALE));
    const buttressPhase = rng.range(0, Math.PI * 2);
    let v = 0;
    for (let i = 0; i < points.length; i++) {
      if (i > 0) v += points[i].distanceTo(points[i - 1]) / BARK_TEX_SCALE;
      const p = points[i];
      const r = radii[i];
      for (let j = 0; j <= radial; j++) {
        const theta = (j / radial) * Math.PI * 2;
        const dir = normals[i]
          .clone()
          .multiplyScalar(Math.cos(theta))
          .addScaledVector(binormals[i], Math.sin(theta));
        let rr = r;
        if (b.level === 0 && p.y < flareH) {
          // Root flare with buttresses at the base of the trunk.
          const k = 1 - THREE.MathUtils.smoothstep(p.y, -0.6, flareH);
          const lobes = Math.pow(0.5 + 0.5 * Math.cos(theta * 5 + buttressPhase), 2.2);
          rr = r * (1 + k * (0.35 + 0.75 * lobes));
        }
        pos.push(p.x + dir.x * rr, p.y + dir.y * rr, p.z + dir.z * rr);
        nor.push(dir.x, dir.y, dir.z);
        uv.push((j / radial) * uRepeat, v);
        bark.push(flex[i], b.limb);
      }
    }
    const ring = radial + 1;
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * ring + j;
        const c = base + (i + 1) * ring + j;
        idx.push(a, c, a + 1, c, c + 1, a + 1);
      }
    }
  };

  for (const b of shape.branches) {
    if (opts.lowDetail && b.level >= 3) continue;
    addBranch(b);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aBark", new THREE.Float32BufferAttribute(bark, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildFoliageGeometry(shape: TreeShape, opts: { cardScale?: number; keep?: number } = {}) {
  const rng = createRng(11);
  const cardScale = opts.cardScale ?? 1;
  const keep = opts.keep ?? 1;
  const cards = keep < 1 ? shape.cards.filter(() => rng.next() < keep) : shape.cards;
  const n = cards.length;
  const pos = new Float32Array(n * 12);
  const nor = new Float32Array(n * 12);
  const uv = new Float32Array(n * 8);
  const center = new Float32Array(n * 12);
  const leaf = new Float32Array(n * 16);
  const shade = new Float32Array(n * 4);
  const idx: number[] = [];
  const c0 = shape.crownCenter;
  const r = shape.crownRadii;
  const r2 = new THREE.Vector3(r.x * r.x, r.y * r.y, r.z * r.z);
  const corner = new THREE.Vector3();
  const ell = new THREE.Vector3();

  cards.forEach((card, k) => {
    const nrm = card.normal;
    const t = new THREE.Vector3().crossVectors(nrm, Math.abs(nrm.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    t.applyAxisAngle(nrm, rng.range(0, Math.PI * 2));
    const b = new THREE.Vector3().crossVectors(nrm, t).normalize();
    const h = (card.size * cardScale) / 2;
    const cell = rng.int(0, 3);
    const u0 = (cell % 2) * 0.5 + 0.004;
    const v0 = Math.floor(cell / 2) * 0.5 + 0.004;
    const span = 0.492;
    const rColor = rng.next();
    const rDensity = rng.next();

    const rel = card.center.clone().sub(c0).divide(r);
    const depth = rel.length();
    const y01 = THREE.MathUtils.clamp(rel.y * 0.5 + 0.5, 0, 1);
    const occl =
      THREE.MathUtils.lerp(0.4, 1, THREE.MathUtils.smoothstep(depth, 0.2, 1.0)) *
      THREE.MathUtils.lerp(0.68, 1.06, y01);

    const sx = [-1, 1, 1, -1];
    const sy = [-1, -1, 1, 1];
    for (let q = 0; q < 4; q++) {
      corner.copy(card.center).addScaledVector(t, sx[q] * h).addScaledVector(b, sy[q] * h);
      const o = (k * 4 + q) * 3;
      pos[o] = corner.x;
      pos[o + 1] = corner.y;
      pos[o + 2] = corner.z;
      // Ellipsoid normal blended with the card normal: the crown shades as a volume.
      ell.copy(corner).sub(c0).divide(r2).normalize().multiplyScalar(0.78).addScaledVector(nrm, 0.22).normalize();
      nor[o] = ell.x;
      nor[o + 1] = ell.y;
      nor[o + 2] = ell.z;
      center[o] = card.center.x;
      center[o + 1] = card.center.y;
      center[o + 2] = card.center.z;
      const u = (k * 4 + q) * 2;
      uv[u] = u0 + (sx[q] * 0.5 + 0.5) * span;
      uv[u + 1] = v0 + (sy[q] * 0.5 + 0.5) * span;
      const l = (k * 4 + q) * 4;
      leaf[l] = rColor;
      leaf[l + 1] = rDensity;
      leaf[l + 2] = card.limb;
      leaf[l + 3] = card.flex;
      shade[k * 4 + q] = occl;
    }
    const a = k * 4;
    idx.push(a, a + 1, a + 2, a, a + 2, a + 3);
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  g.setAttribute("aLeaf", new THREE.BufferAttribute(leaf, 4));
  g.setAttribute("aShade", new THREE.BufferAttribute(shade, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildTreeGeometries(shape: TreeShape, opts: { lowDetail?: boolean; cardScale?: number; keep?: number } = {}): TreeGeometries {
  return {
    bark: buildBarkGeometry(shape, opts),
    foliage: buildFoliageGeometry(shape, opts),
  };
}
