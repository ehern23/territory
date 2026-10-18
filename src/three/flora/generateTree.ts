import * as THREE from "three";
import { createRng, seededRng, type Rng } from "@/lib/random";

/**
 * Procedural broadleaf tree.
 *
 * A trunk carries a set of scaffold limbs, each recursively divided into
 * secondary and tertiary branches that end in leaf-cluster cards. Scaffold
 * limbs are addressable: for account trees each one is a business unit, so
 * the organisation can thin, go bare or flush with new growth limb by limb.
 *
 * Everything is deterministic from the seed. The output is pure data; mesh
 * construction lives in `treeMeshes.ts`.
 */

export interface LimbSpec {
  /** Relative size of the limb (≈ organisation size), 0..1. */
  weight: number;
}

export interface TreeParams {
  seed: number;
  height: number;
  trunkRadius: number;
  limbs: LimbSpec[];
  /** Crown breadth multiplier. */
  spread?: number;
  /** >1 grows limbs more upright. */
  upright?: number;
  /** Trunk lean / irregularity multiplier. */
  lean?: number;
  /** Recursion depth below scaffold limbs (1 or 2). */
  depth?: 1 | 2;
  /** Leaf card edge length. */
  cardSize?: number;
  /** Multiplier on leaf cards per branch. */
  leafDensity?: number;
  /** Fraction of the trunk that is clear of limbs. */
  clearBole?: number;
}

export interface Branch {
  points: THREE.Vector3[];
  radii: number[];
  /** Wind flexibility at each point. */
  flex: number[];
  level: number;
  /** Scaffold limb index, or -1 for trunk / leader. */
  limb: number;
}

export interface LeafCard {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
  limb: number;
  flex: number;
}

export interface LimbFrame {
  index: number;
  attach: THREE.Vector3;
  tip: THREE.Vector3;
  centroid: THREE.Vector3;
  outward: THREE.Vector3;
  length: number;
}

export interface FruitSlot {
  limb: number;
  /** Point on a branch where the stem starts. */
  hang: THREE.Vector3;
}

export interface TreeShape {
  height: number;
  crownTop: number;
  crownCenter: THREE.Vector3;
  crownRadii: THREE.Vector3;
  trunkRadius: number;
  branches: Branch[];
  cards: LeafCard[];
  limbs: LimbFrame[];
  fruitSlots: FruitSlot[];
}

const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN = 2.399963;

function curvePoints(pts: THREE.Vector3[], samples: number) {
  const c = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  return c.getSpacedPoints(samples);
}

function perpendicular(v: THREE.Vector3): THREE.Vector3 {
  const a = Math.abs(v.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(v, a).normalize();
}

interface GrowOpts {
  start: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  r0: number;
  r1: number;
  flex0: number;
  flexGain: number;
  /** Per-step pull toward vertical (phototropism, + up / − droop). */
  tropism: number;
  wobble: number;
  steps: number;
  level: number;
  limb: number;
}

function grow(rng: Rng, o: GrowOpts): Branch {
  const raw: THREE.Vector3[] = [o.start.clone()];
  const dir = o.dir.clone().normalize();
  const step = o.length / o.steps;
  let p = o.start.clone();
  for (let i = 0; i < o.steps; i++) {
    const side = perpendicular(dir);
    dir
      .addScaledVector(UP, o.tropism)
      .addScaledVector(side, rng.gauss() * o.wobble)
      .addScaledVector(new THREE.Vector3().crossVectors(side, dir), rng.gauss() * o.wobble * 0.6)
      .normalize();
    p = p.clone().addScaledVector(dir, step);
    raw.push(p);
  }
  const samples = Math.max(4, o.steps * 2);
  const points = curvePoints(raw, samples);
  const radii: number[] = [];
  const flex: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const t = i / (points.length - 1);
    radii.push(THREE.MathUtils.lerp(o.r0, o.r1, Math.pow(t, 0.85)));
    flex.push(o.flex0 + o.flexGain * t * t);
  }
  return { points, radii, flex, level: o.level, limb: o.limb };
}

/** Sample position / radius / flex at parameter t along a branch. */
function sample(b: Branch, t: number) {
  const f = THREE.MathUtils.clamp(t, 0, 1) * (b.points.length - 1);
  const i = Math.min(b.points.length - 2, Math.floor(f));
  const k = f - i;
  const pos = b.points[i].clone().lerp(b.points[i + 1], k);
  const tan = b.points[i + 1].clone().sub(b.points[i]).normalize();
  return {
    pos,
    tan,
    radius: THREE.MathUtils.lerp(b.radii[i], b.radii[i + 1], k),
    flex: THREE.MathUtils.lerp(b.flex[i], b.flex[i + 1], k),
  };
}

function branchLength(b: Branch) {
  let l = 0;
  for (let i = 1; i < b.points.length; i++) l += b.points[i].distanceTo(b.points[i - 1]);
  return l;
}

/** Direction for a child: rotate away from the parent tangent by `angle`, around a phyllotactic azimuth. */
function childDirection(tan: THREE.Vector3, azimuth: number, angle: number, upBias: number) {
  const side = perpendicular(tan);
  side.applyAxisAngle(tan, azimuth);
  const d = tan.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
  d.addScaledVector(UP, upBias).normalize();
  return d;
}

export function generateTree(params: TreeParams): TreeShape {
  const rng = createRng(params.seed);
  const H = params.height;
  const R = params.trunkRadius;
  const spread = params.spread ?? 1;
  const upright = params.upright ?? 1;
  const lean = params.lean ?? 1;
  const depth = params.depth ?? 2;
  const cardSize = params.cardSize ?? H * 0.11;
  const leafDensity = params.leafDensity ?? 1;
  const clearBole = params.clearBole ?? 0.3;

  const branches: Branch[] = [];
  const cards: LeafCard[] = [];
  const limbs: LimbFrame[] = [];
  const fruitSlots: FruitSlot[] = [];

  // Trunk: a gently leaning column to ~70% of height; a leader continues above.
  const trunkTop = H * 0.62;
  const trunkDir = new THREE.Vector3(rng.gauss() * 0.08 * lean, 1, rng.gauss() * 0.08 * lean).normalize();
  const trunk = grow(rng, {
    start: new THREE.Vector3(0, -0.6, 0),
    dir: trunkDir,
    length: trunkTop,
    r0: R,
    r1: R * 0.55,
    flex0: 0,
    flexGain: 0.08,
    tropism: 0.05,
    wobble: 0.05 * lean,
    steps: 6,
    level: 0,
    limb: -1,
  });
  // Root flare is modelled in the mesh; keep the first radius generous.
  branches.push(trunk);

  const addLeaves = (b: Branch, from: number, count: number, limb: number) => {
    const n = Math.max(1, Math.round(count * leafDensity));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : from + ((1 - from) * i) / (n - 1);
      const s = sample(b, t);
      const off = new THREE.Vector3(rng.gauss(), rng.gauss() * 0.6 + 0.25, rng.gauss()).multiplyScalar(cardSize * 0.32);
      cards.push({
        center: s.pos.clone().add(off),
        normal: new THREE.Vector3(),
        size: cardSize * rng.range(0.78, 1.18),
        limb,
        flex: s.flex + 0.08,
      });
    }
  };

  const growChildren = (parent: Branch, level: number, limb: number, parentLength: number) => {
    const count =
      level === 2 ? 6 + rng.int(0, 2) + Math.round(parentLength / (H * 0.16)) : 3 + rng.int(0, 2);
    const az0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const t = THREE.MathUtils.clamp(0.22 + (0.74 * (i + 0.5)) / count + rng.gauss() * 0.04, 0.15, 0.97);
      const s = sample(parent, t);
      // Fuller in the middle of the parent, shorter toward the tip: an ovoid crown.
      const shape = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12));
      const len = parentLength * (level === 2 ? 0.5 : 0.48) * shape * rng.range(0.8, 1.15);
      const angle = rng.range(0.55, 0.95);
      const dir = childDirection(s.tan, az0 + i * GOLDEN, angle, level === 2 ? 0.25 : 0.15);
      const child = grow(rng, {
        start: s.pos,
        dir,
        length: len,
        r0: Math.max(0.05, s.radius * 0.62),
        r1: level === 2 ? 0.06 : 0.035,
        flex0: s.flex,
        flexGain: 0.18 + 0.2 * (len / H),
        tropism: level === 2 ? 0.07 : 0.05,
        wobble: 0.16,
        steps: level === 2 ? 4 : 3,
        level,
        limb,
      });
      branches.push(child);
      if (level < depth + 1) {
        growChildren(child, level + 1, limb, len);
        addLeaves(child, 0.45, 3, limb);
      } else {
        addLeaves(child, 0.15, 4, limb);
      }
      if (level === 2 && limb >= 0) {
        const fs = sample(child, rng.range(0.35, 0.6));
        fruitSlots.push({ limb, hang: fs.pos });
      }
    }
  };

  // Scaffold limbs. Larger limbs attach lower, like real trees.
  const order = params.limbs
    .map((l, i) => ({ ...l, i }))
    .sort((a, b) => b.weight - a.weight);
  const n = Math.max(1, order.length);
  const az0 = rng.range(0, Math.PI * 2);
  order.forEach((spec, k) => {
    const limbRng = seededRng(params.seed, "limb", spec.i);
    const f = clearBole + ((0.98 - clearBole) * (k + 0.5)) / n + limbRng.gauss() * 0.03;
    const ts = sample(trunk, THREE.MathUtils.clamp(f, 0.2, 0.99));
    const azimuth = az0 + k * GOLDEN + limbRng.gauss() * 0.25;
    const horizontal = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    // Lower limbs reach out, upper limbs climb.
    const elev = THREE.MathUtils.clamp((0.6 + 0.55 * k / n + limbRng.gauss() * 0.08) * upright, 0.35, 1.3);
    const dir = horizontal.clone().multiplyScalar(Math.cos(elev)).addScaledVector(UP, Math.sin(elev)).normalize();
    const weight = THREE.MathUtils.clamp(spec.weight, 0.25, 1);
    const len = H * (0.36 + 0.24 * weight) * spread * (1.1 - 0.3 * (k / n));
    const limb = grow(limbRng, {
      start: ts.pos,
      dir,
      length: len,
      r0: Math.max(0.25, ts.radius * (0.55 + 0.25 * weight)),
      r1: 0.1,
      flex0: ts.flex,
      flexGain: 0.32 * (len / H),
      tropism: 0.09 * upright,
      wobble: 0.1,
      steps: 6,
      level: 1,
      limb: spec.i,
    });
    branches.push(limb);
    const tip = limb.points[limb.points.length - 1];
    limbs[spec.i] = {
      index: spec.i,
      attach: ts.pos.clone(),
      tip: tip.clone(),
      centroid: sample(limb, 0.62).pos,
      outward: new THREE.Vector3(tip.x, 0, tip.z).normalize(),
      length: len,
    };
    growChildren(limb, 2, spec.i, len);
    addLeaves(limb, 0.75, 2, spec.i);
  });

  // Leader: continues the trunk to the top of the crown (not an organisation).
  const top = trunk.points[trunk.points.length - 1];
  const leader = grow(rng, {
    start: top,
    dir: trunkDir.clone().addScaledVector(UP, 0.6).normalize(),
    length: H - trunkTop,
    r0: R * 0.5,
    r1: 0.08,
    flex0: trunk.flex[trunk.flex.length - 1],
    flexGain: 0.22,
    tropism: 0.06,
    wobble: 0.08,
    steps: 4,
    level: 1,
    limb: -1,
  });
  branches.push(leader);
  growChildren(leader, 2, -1, (H - trunkTop) * 1.3);

  // Crown envelope from leaf cards.
  const box = new THREE.Box3();
  for (const c of cards) box.expandByPoint(c.center);
  const crownCenter = box.getCenter(new THREE.Vector3());
  const crownRadii = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).addScalar(cardSize * 0.4);

  // Orient cards outward from the crown so the silhouette shows leaf faces.
  for (const c of cards) {
    const out = c.center.clone().sub(crownCenter).divide(crownRadii);
    const rnd = new THREE.Vector3(rng.gauss(), rng.gauss(), rng.gauss());
    c.normal.copy(out.normalize().multiplyScalar(0.8).add(rnd.multiplyScalar(0.7))).normalize();
  }

  let crownTop = H;
  for (const b of branches) for (const p of b.points) crownTop = Math.max(crownTop, p.y);
  crownTop = Math.max(crownTop, box.max.y + cardSize * 0.4);

  // Fruit should hang where it can be seen: prefer the outer, lower crown.
  fruitSlots.sort((a, b) => {
    const score = (s: FruitSlot) => {
      const o = s.hang.clone().sub(crownCenter).divide(crownRadii);
      return Math.hypot(o.x, o.z) - Math.max(0, o.y) * 0.6;
    };
    return score(b) - score(a);
  });

  return {
    height: H,
    crownTop,
    crownCenter,
    crownRadii,
    trunkRadius: R,
    branches,
    cards,
    limbs,
    fruitSlots,
  };
}

export { branchLength };
