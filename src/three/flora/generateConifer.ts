import * as THREE from "three";
import { createRng } from "@/lib/random";
import type { Branch, LeafCard, TreeShape } from "./generateTree";

/**
 * Procedural spruce / fir. A straight leader carries whorls of branches that
 * shorten toward the top and droop toward their tips, giving the classic
 * narrow cone. Needle sprigs are cards laid mostly flat along each branch.
 * Output matches TreeShape so the same mesh builder and shaders apply.
 */

export interface ConiferParams {
  seed: number;
  height: number;
  trunkRadius: number;
  /** Crown width relative to height. */
  width?: number;
  cardSize?: number;
  density?: number;
  /** Fraction of the trunk below the lowest whorl (redwoods hold their crown high). */
  firstWhorl?: number;
  /** Buttress flare at the base, as a multiple of the trunk radius. */
  flare?: number;
}

export function generateConifer(p: ConiferParams): TreeShape {
  const rng = createRng(p.seed);
  const H = p.height;
  const R = p.trunkRadius;
  const width = p.width ?? 0.28;
  const card = p.cardSize ?? H * 0.09;
  const density = p.density ?? 1;
  const flare = p.flare ?? 0;
  const branches: Branch[] = [];
  const cards: LeafCard[] = [];

  // Trunk: straight with a slight sway.
  const tp: THREE.Vector3[] = [];
  const tr: number[] = [];
  const tf: number[] = [];
  const steps = 12;
  const lean = new THREE.Vector2(rng.gauss() * 0.02, rng.gauss() * 0.02);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    tp.push(new THREE.Vector3(lean.x * t * H, -0.8 + t * H, lean.y * t * H));
    tr.push(Math.max(0.06, R * (1 - t) ** 1.1 * (1 + flare * Math.exp(-t * 28))));
    tf.push(0.02 + 0.25 * t * t);
  }
  branches.push({ points: tp, radii: tr, flex: tf, level: 0, limb: -1 });

  const firstWhorl = p.firstWhorl ?? 0.16;
  const whorls = Math.round(H / 1.9);
  for (let w = 0; w < whorls; w++) {
    const t = firstWhorl + (0.97 - firstWhorl) * (w / (whorls - 1));
    const y = -0.8 + t * H;
    const centre = new THREE.Vector3(lean.x * t * H, y, lean.y * t * H);
    const reach = H * width * Math.pow(1 - t, 0.85) * (0.85 + rng.next() * 0.3) + 0.6;
    const n = 4 + rng.int(0, 2);
    const a0 = rng.range(0, Math.PI * 2);
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2 + rng.gauss() * 0.2;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const pts: THREE.Vector3[] = [];
      const radii: number[] = [];
      const flex: number[] = [];
      const segs = 4;
      const lift = 0.15 - t * 0.1;
      for (let s = 0; s <= segs; s++) {
        const f = s / segs;
        const pt = centre
          .clone()
          .addScaledVector(dir, reach * f)
          .add(new THREE.Vector3(0, reach * (lift * f - 0.32 * f * f), 0));
        pts.push(pt);
        // Big trunks still carry slender limbs.
        radii.push(Math.max(0.03, Math.min(R * 0.32, 0.36) * (1 - t) * (1 - f) + 0.03));
        flex.push(0.05 + 0.4 * f * (reach / H));
      }
      branches.push({ points: pts, radii, flex, level: 2, limb: -1 });
      // Sprigs along the branch, flat-ish, denser toward the tip.
      const m = Math.max(2, Math.round((2 + reach / (card * 0.45)) * density));
      for (let c = 0; c < m; c++) {
        const f = 0.25 + 0.75 * ((c + 0.5) / m);
        const i = Math.min(segs - 1, Math.floor(f * segs));
        const pos = pts[i].clone().lerp(pts[i + 1], f * segs - i);
        pos.add(new THREE.Vector3(rng.gauss() * 0.25, rng.gauss() * 0.15 - 0.05, rng.gauss() * 0.25).multiplyScalar(card));
        const normal = new THREE.Vector3(rng.gauss() * 0.35, 1, rng.gauss() * 0.35).addScaledVector(dir, 0.35).normalize();
        cards.push({ center: pos, normal, size: card * rng.range(0.75, 1.15), limb: -1, flex: 0.1 + 0.4 * f * (reach / H) });
      }
    }
  }
  // A tuft at the very top.
  for (let c = 0; c < 4; c++) {
    cards.push({
      center: new THREE.Vector3(lean.x * H, H - 0.8 - c * card * 0.35, lean.y * H),
      normal: new THREE.Vector3(rng.gauss(), 0.6, rng.gauss()).normalize(),
      size: card * 0.7,
      limb: -1,
      flex: 0.3,
    });
  }

  const box = new THREE.Box3();
  for (const c of cards) box.expandByPoint(c.center);
  const crownCenter = box.getCenter(new THREE.Vector3());
  const crownRadii = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).addScalar(card * 0.4);
  return {
    height: H,
    crownTop: H,
    crownCenter,
    crownRadii,
    trunkRadius: R,
    branches,
    cards,
    limbs: [],
    fruitSlots: [],
    perches: [],
  };
}
