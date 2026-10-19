import * as THREE from "three";
import { createRng, seededRng, type Rng } from "@/lib/random";

/**
 * Procedural broadleaf tree.
 *
 * One continuous trunk rises to a leader; scaffold limbs peel off it and are
 * recursively divided into finer branches that end in leaf-cluster cards.
 * Every child leaves its parent nearly parallel and bends away over its first
 * few segments, so forks read as grown wood rather than intersecting pipes.
 *
 * Scaffold limbs are addressable: for account trees each one is a business
 * unit, so the organisation can thin, go bare or flush with new growth limb by
 * limb. Everything is deterministic from the seed. The output is pure data;
 * mesh construction lives in `treeMeshes.ts`.
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
  /** Recursion depth below scaffold limbs (1–3). */
  depth?: 1 | 2 | 3;
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
  /** Point on a real branch where the fruit stem starts. */
  hang: THREE.Vector3;
}

export interface PerchSlot {
  /** Point on top of a sturdy limb. */
  position: THREE.Vector3;
  /** Horizontal direction along the limb. */
  along: THREE.Vector3;
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
  perches: PerchSlot[];
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
  /** Final heading. */
  dir: THREE.Vector3;
  /** Parent heading at the fork: the child starts along it and bends away. */
  from?: THREE.Vector3;
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
  const target = o.dir.clone().normalize();
  const dir = (o.from ? o.from.clone().lerp(target, 0.35) : target.clone()).normalize();
  const step = o.length / o.steps;
  let p = o.start.clone();
  for (let i = 0; i < o.steps; i++) {
    // Bend from the parent's heading toward this branch's own over the first steps.
    if (o.from && i < 3) dir.lerp(target, 0.45).normalize();
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
    // Taper fast at the collar, then slowly: wood reads heavier.
    const taper = 1 - Math.pow(t, 0.7);
    radii.push(o.r1 + (o.r0 - o.r1) * taper);
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
  const fruitCandidates: FruitSlot[] = [];
  const perches: PerchSlot[] = [];

  // Trunk and leader as one tube: no seam at the top of the bole.
  const trunkDir = new THREE.Vector3(rng.gauss() * 0.07 * lean, 1, rng.gauss() * 0.07 * lean).normalize();
  const trunk = grow(rng, {
    start: new THREE.Vector3(0, -0.8, 0),
    dir: trunkDir,
    length: H * 0.94,
    r0: R,
    r1: Math.max(0.12, R * 0.06),
    flex0: 0,
    flexGain: 0.2,
    tropism: 0.04,
    wobble: 0.045 * lean,
    steps: 9,
    level: 0,
    limb: -1,
  });
  // The trunk tapers gently through the bole, then quickly through the crown.
  trunk.radii = trunk.radii.map((_, i) => {
    const t = i / (trunk.radii.length - 1);
    const bole = 1 - 0.45 * THREE.MathUtils.smoothstep(t, 0, 0.6);
    const crown = 1 - THREE.MathUtils.smoothstep(t, 0.55, 1.0) * 0.9;
    return Math.max(0.1, R * bole * crown);
  });
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

  const growChildren = (parent: Branch, level: number, limb: number, parentLength: number, tFrom = 0.22) => {
    const count =
      level === 2
        ? 6 + rng.int(0, 2) + Math.round(parentLength / (H * 0.16))
        : level === 3
          ? 3 + rng.int(0, 2)
          : 2 + rng.int(0, 2);
    const az0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const t = THREE.MathUtils.clamp(tFrom + ((0.96 - tFrom) * (i + 0.5)) / count + rng.gauss() * 0.04, 0.12, 0.97);
      const s = sample(parent, t);
      // Fuller in the middle of the parent, shorter toward the tip: an ovoid crown.
      const shape = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12));
      const len = parentLength * (level === 2 ? 0.5 : 0.48) * shape * rng.range(0.8, 1.15);
      const angle = rng.range(0.55, 0.95);
      const dir = childDirection(s.tan, az0 + i * GOLDEN, angle, level === 2 ? 0.25 : 0.15);
      const child = grow(rng, {
        start: s.pos,
        from: s.tan,
        dir,
        length: len,
        r0: Math.max(0.04, s.radius * 0.68),
        r1: level >= 3 ? 0.03 : 0.05,
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
      if (level >= 2 && limb >= 0) {
        // Fruit hangs from the outer half of fine branches.
        const fs = sample(child, rng.range(0.5, 0.85));
        fruitCandidates.push({ limb, hang: fs.pos });
      }
    }
  };

  // Scaffold limbs. Larger limbs attach lower, like real trees.
  const order = params.limbs.map((l, i) => ({ ...l, i })).sort((a, b) => b.weight - a.weight);
  const n = Math.max(1, order.length);
  const az0 = rng.range(0, Math.PI * 2);
  const crownStart = clearBole;
  const crownEnd = 0.78;
  order.forEach((spec, k) => {
    const limbRng = seededRng(params.seed, "limb", spec.i);
    const f = THREE.MathUtils.clamp(crownStart + ((crownEnd - crownStart) * (k + 0.5)) / n + limbRng.gauss() * 0.03, 0.15, 0.85);
    const ts = sample(trunk, f);
    const azimuth = az0 + k * GOLDEN + limbRng.gauss() * 0.25;
    const horizontal = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    // Lower limbs reach out, upper limbs climb.
    const elev = THREE.MathUtils.clamp((0.6 + (0.55 * k) / n + limbRng.gauss() * 0.08) * upright, 0.35, 1.3);
    const dir = horizontal.clone().multiplyScalar(Math.cos(elev)).addScaledVector(UP, Math.sin(elev)).normalize();
    const weight = THREE.MathUtils.clamp(spec.weight, 0.25, 1);
    const len = H * (0.36 + 0.24 * weight) * spread * (1.1 - 0.3 * (k / n));
    const limb = grow(limbRng, {
      start: ts.pos,
      from: ts.tan,
      dir,
      length: len,
      r0: Math.max(0.25, ts.radius * (0.6 + 0.2 * weight)),
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
    // A perch: the upper surface of the limb about a third of the way out.
    const ps = sample(limb, 0.32);
    perches.push({
      position: ps.pos.clone().addScaledVector(UP, ps.radius * 0.95),
      along: new THREE.Vector3(ps.tan.x, 0, ps.tan.z).normalize(),
    });
    growChildren(limb, 2, spec.i, len);
    addLeaves(limb, 0.75, 2, spec.i);
  });

  // The leader's own crown (not an organisation).
  growChildren(trunk, 2, -1, H * 0.45, crownEnd);

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

  // Keep fruit candidates on the outer, lower shell of the crown, where fruit is visible.
  const fruitSlots = fruitCandidates
    .map((s) => {
      const o = s.hang.clone().sub(crownCenter).divide(crownRadii);
      return { s, radial: Math.hypot(o.x, o.z), y: o.y };
    })
    .filter((c) => c.radial > 0.55 && c.y < 0.15)
    .sort((a, b) => b.radial - b.y * 0.5 - (a.radial - a.y * 0.5))
    .map((c) => c.s);

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
    perches,
  };
}

export { branchLength };
