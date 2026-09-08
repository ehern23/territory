import * as THREE from "three";
import type { Account, BusinessUnit, Prospect, Team } from "@/domain/types";
import { createRng, hashString, seededRng, type Rng } from "@/lib/random";

/**
 * Procedural organizational tree skeleton.
 *
 * Account → trunk, business unit → major branch, team → secondary branch,
 * prospect → leaf, opportunity → fruit, intelligence → root. Generation is
 * fully deterministic from the account seed so a tree is recognizable across
 * reloads. Geometry is derived from this skeleton in `treeGeometry.ts`.
 */

export type BranchKind = "trunk" | "bu" | "team" | "twig" | "root";

export interface BranchSegment {
  id: string;
  kind: BranchKind;
  businessUnitId?: string;
  teamId?: string;
  curve: THREE.CatmullRomCurve3;
  radiusStart: number;
  radiusEnd: number;
  length: number;
}

export interface LeafAnchor {
  prospectId: string;
  businessUnitId: string;
  teamId: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  /** Local x axis of the leaf blade (used for droop rotation). */
  hinge: THREE.Vector3;
  scale: number;
  outward: THREE.Vector3;
  /** Point on the parent branch where the twig starts. */
  branchPoint: THREE.Vector3;
}

export interface FruitAnchor {
  opportunityId: string;
  businessUnitId: string;
  position: THREE.Vector3;
  /** Point on the branch the fruit hangs from. */
  branchPoint: THREE.Vector3;
}

export interface BranchFrame {
  id: string;
  businessUnitId: string;
  teamId?: string;
  attach: THREE.Vector3;
  tip: THREE.Vector3;
  centroid: THREE.Vector3;
  outward: THREE.Vector3;
  length: number;
  radius: number;
}

export interface RootAnchor {
  intelligenceId: string;
  position: THREE.Vector3;
  outward: THREE.Vector3;
}

export interface TreeSkeleton {
  accountId: string;
  seed: number;
  /** Trunk height (the structural scale of the tree). */
  height: number;
  /** Highest point reached by any branch — used for camera framing. */
  crownTop: number;
  trunkRadius: number;
  canopyRadius: number;
  canopyCenter: THREE.Vector3;
  trunk: BranchSegment;
  branches: BranchSegment[];
  twigs: BranchSegment[];
  roots: BranchSegment[];
  leaves: LeafAnchor[];
  fruit: FruitAnchor[];
  buFrames: Record<string, BranchFrame>;
  teamFrames: Record<string, BranchFrame>;
  rootAnchors: RootAnchor[];
}

const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN_ANGLE = 2.399963;

export interface TreeInput {
  account: Account;
  businessUnits: BusinessUnit[];
  /** Prospect lookup used to size teams; latent prospects are included. */
  prospectsById: Record<string, Prospect>;
}

export function treeDimensions(account: Account) {
  const habit = habitFor(account.id);
  const height = (36 + 18 * account.scale.opportunity) * habit.heightMul;
  const trunkRadius = (1.7 + 1.2 * account.scale.enterprise) * habit.radiusMul;
  return { height, trunkRadius };
}

interface TreeHabit {
  heightMul: number;
  radiusMul: number;
  spread: number;
  upright: number;
  lean: number;
  flare: number;
}

function habitFor(id: string): TreeHabit {
  const base: TreeHabit = { heightMul: 1, radiusMul: 1, spread: 1, upright: 1, lean: 1, flare: 1 };
  const table: Record<string, Partial<TreeHabit>> = {
    jpmc: { heightMul: 1.06, radiusMul: 1.14, spread: 1.1, lean: 1.4, flare: 1.12 },
    walmart: { spread: 1.18, heightMul: 0.96, radiusMul: 1.1 },
    disney: { spread: 1.22, upright: 0.8, radiusMul: 1.02 },
    amex: { heightMul: 1.02, radiusMul: 0.92, spread: 0.84, upright: 1.24, lean: 0.4 },
    nike: { spread: 0.88, upright: 1.2, lean: 0.32 },
    starbucks: { spread: 1.16, lean: 1.75, upright: 0.86 },
    marriott: { radiusMul: 1.1, spread: 1.08, lean: 1.2 },
    ford: { heightMul: 0.9, radiusMul: 0.84, spread: 0.86, upright: 1.3, lean: 0.55 },
  };
  return { ...base, ...table[id] };
}

function trunkRadiusAt(base: number, t: number): number {
  const flare = 1 + 0.48 * (1 - smoothstep(0, 0.14, t));
  const taper = 1 - 0.52 * t;
  return base * flare * taper;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function horizontal(v: THREE.Vector3): THREE.Vector3 {
  const h = new THREE.Vector3(v.x, 0, v.z);
  return h.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : h.normalize();
}

function makeCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 {
  const c = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
  c.arcLengthDivisions = 64;
  return c;
}

/** Grow a branch as a sequence of segments with upsweep and gentle wobble. */
function growBranch(
  rng: Rng,
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  elevation0: number,
  upsweep: number,
  wobble: number,
): THREE.Vector3[] {
  const pts = [start.clone()];
  const side = new THREE.Vector3().crossVectors(dir, UP).normalize();
  const fractions = [0.2, 0.26, 0.28, 0.26];
  let p = start.clone();
  let elev = elevation0;
  let heading = dir.clone();
  for (let i = 0; i < fractions.length; i++) {
    const step = length * fractions[i];
    heading.applyAxisAngle(UP, rng.gauss() * 0.22).normalize();
    const v = new THREE.Vector3()
      .addScaledVector(heading, Math.cos(elev))
      .addScaledVector(UP, Math.sin(elev))
      .normalize()
      .multiplyScalar(step);
    v.addScaledVector(side, rng.gauss() * wobble * step);
    p = p.clone().add(v);
    pts.push(p);
    elev += upsweep * (i + 1) * 0.42;
  }
  return pts;
}

export function buildTreeSkeleton(input: TreeInput): TreeSkeleton {
  const { account, businessUnits, prospectsById } = input;
  const rng = createRng(account.seed);
  const habit = habitFor(account.id);
  const { height, trunkRadius } = treeDimensions(account);

  // Trunk: a leaning, slightly irregular column with a heavy base.
  const trunkPts: THREE.Vector3[] = [];
  let lx = 0;
  let lz = 0;
  const leanX = rng.gauss() * 0.07 * habit.lean;
  const leanZ = rng.gauss() * 0.07 * habit.lean;
  const levels = 8;
  for (let i = 0; i <= levels; i++) {
    const f = i / levels;
    if (i > 0) {
      lx += (leanX + rng.gauss() * 0.04) * (height / levels);
      lz += (leanZ + rng.gauss() * 0.04) * (height / levels);
    }
    trunkPts.push(new THREE.Vector3(lx, f * height, lz));
  }
  const trunkCurve = makeCurve(trunkPts);
  const trunk: BranchSegment = {
    id: `${account.id}.trunk`,
    kind: "trunk",
    curve: trunkCurve,
    radiusStart: trunkRadius * 1.62 * habit.flare,
    radiusEnd: trunkRadius * 0.16,
    length: height,
  };

  const branches: BranchSegment[] = [];
  const twigs: BranchSegment[] = [];
  const leaves: LeafAnchor[] = [];
  const fruit: FruitAnchor[] = [];
  const buFrames: Record<string, BranchFrame> = {};
  const teamFrames: Record<string, BranchFrame> = {};

  const buCount = (bu: BusinessUnit) =>
    bu.teams.reduce((s, t) => s + t.prospects.length, 0);

  // Larger organizations attach lower (longer, heavier limbs), like real trees.
  const ordered = [...businessUnits].sort((a, b) => buCount(b) - buCount(a));
  const n = ordered.length;
  const angle0 = rng.range(0, Math.PI * 2);

  ordered.forEach((bu, i) => {
    const buRng = seededRng(account.seed, bu.id);
    const f = clamp(0.28 + (0.64 * i) / Math.max(1, n - 1) + buRng.gauss() * 0.035, 0.22, 0.96);
    const angle = angle0 + i * GOLDEN_ANGLE + buRng.gauss() * 0.42;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const dormant = bu.status === "dormant";
    const size = clamp(buCount(bu) / 16, 0.3, 1);
    let length = height * (0.46 + 0.38 * size) * (1.12 - 0.36 * f) * habit.spread;
    if (dormant) length *= 0.74;

    const attach = trunkCurve.getPointAt(f);
    // Lower limbs reach out; upper limbs reach up. Dormant limbs sag.
    const elevation = dormant
      ? buRng.range(0.04, 0.18)
      : (buRng.range(0.22, 0.48) + f * 0.28) * habit.upright;
    const upsweep = dormant ? -0.14 : 0.16;
    const pts = growBranch(buRng, attach, dir, length, elevation, upsweep, dormant ? 0.07 : 0.13);
    const curve = makeCurve(pts);
    // Leonardo's rule, loosely: limbs carry most of the parent's cross-section.
    const radiusStart = clamp(trunkRadiusAt(trunkRadius, f) * 0.82, 0.65, 2.7) * (dormant ? 0.86 : 1);
    const radiusEnd = dormant ? 0.09 : 0.16;
    const seg: BranchSegment = {
      id: `${bu.id}.branch`,
      kind: "bu",
      businessUnitId: bu.id,
      curve,
      radiusStart,
      radiusEnd,
      length,
    };
    branches.push(seg);
    const tip = pts[pts.length - 1];
    buFrames[bu.id] = {
      id: bu.id,
      businessUnitId: bu.id,
      attach,
      tip,
      centroid: curve.getPointAt(0.62),
      outward: horizontal(tip.clone().sub(attach)),
      length,
      radius: radiusStart,
    };

    // Teams: alternate sides along the outer portion of the limb.
    const teams = bu.teams;
    const m = teams.length;
    teams.forEach((team, j) => {
      const tRng = seededRng(account.seed, team.id);
      const t = clamp(0.3 + (0.6 * (j + 0.5)) / m + tRng.gauss() * 0.05, 0.22, 0.92);
      const sideSign = (j % 2 === 0 ? 1 : -1) * (tRng.chance(0.18) ? -1 : 1);
      const tangent = curve.getTangentAt(t).normalize();
      const perp = new THREE.Vector3().crossVectors(tangent, UP).normalize().multiplyScalar(sideSign);
      const teamDir = new THREE.Vector3()
        .addScaledVector(horizontal(tangent), 0.48)
        .addScaledVector(perp, 0.9)
        .normalize();
      const teamSize = clamp(team.prospects.length / 8, 0.3, 1);
      let tLength = length * (0.48 + 0.36 * teamSize) * (1.18 - 0.42 * t);
      if (dormant) tLength *= 0.76;
      const start = curve.getPointAt(t);
      const tElev = dormant ? tRng.range(-0.02, 0.12) : tRng.range(0.16, 0.44);
      const tPts = growBranch(tRng, start, teamDir, tLength, tElev, dormant ? -0.1 : 0.14, 0.12);
      const tCurve = makeCurve(tPts);
      const rStart = clamp(lerp(radiusStart, radiusEnd, t) * 0.82, 0.2, 1.05);
      const teamSeg: BranchSegment = {
        id: `${team.id}.branch`,
        kind: "team",
        businessUnitId: bu.id,
        teamId: team.id,
        curve: tCurve,
        radiusStart: rStart,
        radiusEnd: 0.055,
        length: tLength,
      };
      branches.push(teamSeg);
      const tTip = tPts[tPts.length - 1];
      teamFrames[team.id] = {
        id: team.id,
        businessUnitId: bu.id,
        teamId: team.id,
        attach: start,
        tip: tTip,
        centroid: tCurve.getPointAt(0.6),
        outward: horizontal(tTip.clone().sub(attach)),
        length: tLength,
        radius: rStart,
      };

      placeLeaves(account.seed, team, teamSeg, prospectsById, leaves, twigs);
      addFineTwigs(
        tRng,
        { id: team.id, businessUnitId: bu.id, teamId: team.id },
        teamSeg,
        (dormant ? 6 : 6) + Math.floor(team.prospects.length / 1.6),
        dormant,
        twigs,
      );
    });

    // Fine twigs on the limb itself give the silhouette some density.
    addFineTwigs(buRng, { id: bu.id, businessUnitId: bu.id }, seg, dormant ? 8 : 7 + Math.round(4 * size), dormant, twigs);
    addCharacterShoots(buRng, { id: bu.id, businessUnitId: bu.id }, seg, dormant, twigs);
  });

  addTrunkShoots(rng, account, trunk, height, trunkRadius, twigs);

  // Fruit hangs from the business unit limb.
  const oppsByBu = new Map<string, number>();
  for (const opp of account.opportunities) {
    const seg = branches.find((b) => b.kind === "bu" && b.businessUnitId === opp.businessUnitId);
    if (!seg) continue;
    const k = oppsByBu.get(opp.businessUnitId) ?? 0;
    oppsByBu.set(opp.businessUnitId, k + 1);
    const oRng = seededRng(account.seed, opp.id);
    const t = clamp(0.5 + k * 0.16 + oRng.gauss() * 0.04, 0.35, 0.85);
    const branchPoint = seg.curve.getPointAt(t);
    const tangent = seg.curve.getTangentAt(t);
    const perp = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    const limbRadius = lerp(seg.radiusStart, seg.radiusEnd, t);
    const position = branchPoint
      .clone()
      .add(new THREE.Vector3(0, -(limbRadius + 1.45), 0))
      .addScaledVector(perp, oRng.gauss() * 0.28);
    fruit.push({ opportunityId: opp.id, businessUnitId: opp.businessUnitId, position, branchPoint });
  }

  // Roots: one per intelligence item plus filler, forked so the plate reads as a system.
  const roots: BranchSegment[] = [];
  const rootAnchors: RootAnchor[] = [];
  const items = account.intelligence;
  const rootCount = items.length + 5;
  const rootAngle0 = rng.range(0, Math.PI * 2);
  for (let i = 0; i < rootCount; i++) {
    const rRng = seededRng(account.seed, "root", i);
    const a = rootAngle0 + (i / rootCount) * Math.PI * 2 + rRng.gauss() * 0.2;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const named = i < items.length;
    const reach = height * (named ? rRng.range(0.34, 0.5) : rRng.range(0.16, 0.24));
    const depth = height * (named ? rRng.range(0.18, 0.28) : rRng.range(0.08, 0.14));
    const side = new THREE.Vector3().crossVectors(d, UP);
    const pts = [
      new THREE.Vector3(0, 0.35, 0),
      d.clone().multiplyScalar(trunkRadius * 2.15).setY(-0.55).addScaledVector(side, rRng.gauss() * 0.55),
      d.clone().multiplyScalar(reach * 0.48).setY(-depth * 0.55).addScaledVector(side, rRng.gauss() * 1.5),
      d.clone().multiplyScalar(reach).setY(-depth).addScaledVector(side, rRng.gauss() * 2.1),
    ];
    const curve = makeCurve(pts);
    const rStart = trunkRadius * (named ? 0.58 : 0.32);
    roots.push({
      id: `${account.id}.root.${i}`,
      kind: "root",
      curve,
      radiusStart: rStart,
      radiusEnd: named ? 0.16 : 0.06,
      length: reach,
    });
    if (named) {
      const forks = 1 + (rRng.chance(0.55) ? 1 : 0);
      for (let j = 0; j < forks; j++) {
        const ft = rRng.range(0.4, 0.72);
        const fStart = curve.getPointAt(ft);
        const fDir = d
          .clone()
          .applyAxisAngle(UP, (j === 0 ? 1 : -1) * rRng.range(0.4, 0.9))
          .addScaledVector(UP, -0.25)
          .normalize();
        const fLen = reach * rRng.range(0.28, 0.45);
        const fEnd = fStart.clone().addScaledVector(fDir, fLen).setY(fStart.y - depth * 0.22);
        const fMid = fStart.clone().lerp(fEnd, 0.5).addScaledVector(side, rRng.gauss() * 0.8);
        roots.push({
          id: `${account.id}.root.${i}.f${j}`,
          kind: "root",
          curve: makeCurve([fStart.clone(), fMid, fEnd]),
          radiusStart: rStart * 0.45,
          radiusEnd: 0.05,
          length: fLen,
        });
      }
      rootAnchors.push({
        intelligenceId: items[i].id,
        position: pts[3].clone(),
        outward: d.clone(),
      });
    }
  }

  let canopyRadius = 4;
  let crownTop = height;
  const canopyCenter = new THREE.Vector3();
  for (const leaf of leaves) {
    canopyRadius = Math.max(canopyRadius, Math.hypot(leaf.position.x, leaf.position.z));
    canopyCenter.add(leaf.position);
  }
  for (const seg of [...branches, ...twigs]) {
    for (const p of seg.curve.points) {
      crownTop = Math.max(crownTop, p.y);
      canopyRadius = Math.max(canopyRadius, Math.hypot(p.x, p.z));
    }
  }
  if (leaves.length) canopyCenter.divideScalar(leaves.length);
  else canopyCenter.set(0, height * 0.7, 0);

  return {
    accountId: account.id,
    seed: account.seed,
    height,
    crownTop,
    trunkRadius,
    canopyRadius,
    canopyCenter,
    trunk,
    branches,
    twigs,
    roots,
    leaves,
    fruit,
    buFrames,
    teamFrames,
    rootAnchors,
  };
}

function placeLeaves(
  seed: number,
  team: Team,
  seg: BranchSegment,
  prospectsById: Record<string, Prospect>,
  leaves: LeafAnchor[],
  twigs: BranchSegment[],
) {
  const prospects = team.prospects;
  const k = prospects.length;
  if (k === 0) return;
  const curve = seg.curve;

  prospects.forEach((p, i) => {
    const rng = seededRng(seed, p.id);
    const prospect = prospectsById[p.id] ?? p;
    const t = clamp(0.22 + (0.78 * (i + 0.5)) / k + rng.gauss() * 0.035, 0.15, 0.995);
    const branchPoint = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = (i % 2 === 0 ? 1 : -1) * (rng.chance(0.2) ? -1 : 1);
    const perp = new THREE.Vector3().crossVectors(tangent, UP).normalize().multiplyScalar(side);
    const twigDir = new THREE.Vector3()
      .addScaledVector(perp, 0.85)
      .addScaledVector(UP, rng.range(0.15, 0.6))
      .addScaledVector(tangent, rng.range(0.15, 0.45))
      .normalize();
    const twigLength = rng.range(1.05, 2.15);
    const leafBase = branchPoint.clone().addScaledVector(twigDir, twigLength);

    // Twig: short curve from branch to leaf.
    const mid = branchPoint
      .clone()
      .addScaledVector(twigDir, twigLength * 0.5)
      .addScaledVector(UP, 0.1);
    const twigCurve = makeCurve([branchPoint.clone(), mid, leafBase.clone()]);
    twigs.push({
      id: `${p.id}.twig`,
      kind: "twig",
      businessUnitId: team.businessUnitId,
      teamId: team.id,
      curve: twigCurve,
      radiusStart: Math.min(seg.radiusStart * 0.38, 0.09),
      radiusEnd: 0.028,
      length: twigLength,
    });

    // Leaf basis: blade normal mostly up with outward tilt; stem along the twig.
    const normal = new THREE.Vector3()
      .addScaledVector(UP, 1)
      .addScaledVector(perp, rng.range(0.2, 0.6))
      .addScaledVector(tangent, rng.gauss() * 0.25)
      .normalize();
    const stem = twigDir.clone().addScaledVector(normal, -twigDir.dot(normal)).normalize();
    const hinge = new THREE.Vector3().crossVectors(stem, normal).normalize();
    const basis = new THREE.Matrix4().makeBasis(hinge, stem, normal);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);

    const scale = 0.72 + 0.08 * prospect.influence;
    leaves.push({
      prospectId: p.id,
      businessUnitId: team.businessUnitId,
      teamId: team.id,
      position: leafBase,
      quaternion,
      hinge,
      scale,
      outward: horizontal(leafBase),
      branchPoint,
    });
  });
}

/** Bare fine twigs along the outer half of a branch: silhouette, not data. */
function addFineTwigs(
  rng: Rng,
  owner: { id: string; businessUnitId: string; teamId?: string },
  seg: BranchSegment,
  count: number,
  dormant: boolean,
  twigs: BranchSegment[],
) {
  for (let i = 0; i < count; i++) {
    const t = rng.range(0.4, 0.98);
    const start = seg.curve.getPointAt(t);
    const tangent = seg.curve.getTangentAt(t).normalize();
    const perp = new THREE.Vector3().crossVectors(tangent, UP).normalize().multiplyScalar(rng.chance(0.5) ? 1 : -1);
    const dir = new THREE.Vector3()
      .addScaledVector(tangent, 0.6)
      .addScaledVector(perp, rng.range(0.3, 0.8))
      .addScaledVector(UP, dormant ? rng.range(-0.1, 0.3) : rng.range(0.3, 0.8))
      .normalize();
    const len = seg.length * rng.range(0.18, 0.4);
    const mid = start.clone().addScaledVector(dir, len * 0.5).addScaledVector(UP, len * 0.08);
    const end = start.clone().addScaledVector(dir, len).addScaledVector(UP, len * (dormant ? -0.08 : 0.2));
    const curve = makeCurve([start, mid, end]);
    twigs.push({
      id: `${owner.id}.fine.${i}`,
      kind: "twig",
      businessUnitId: owner.businessUnitId,
      teamId: owner.teamId,
      curve,
      radiusStart: Math.min(seg.radiusStart * 0.32, 0.11),
      radiusEnd: 0.016,
      length: len,
    });

    // Second-order twiglets: the fine, forking ends that give a crown its haze.
    const forks = dormant ? 1 : 1 + (rng.chance(0.7) ? 1 : 0);
    for (let j = 0; j < forks; j++) {
      const ft = rng.range(0.45, 0.9);
      const fStart = curve.getPointAt(ft);
      const fTangent = curve.getTangentAt(ft).normalize();
      const fPerp = new THREE.Vector3().crossVectors(fTangent, UP).normalize().multiplyScalar(rng.chance(0.5) ? 1 : -1);
      const fDir = new THREE.Vector3()
        .addScaledVector(fTangent, 0.5)
        .addScaledVector(fPerp, rng.range(0.4, 0.9))
        .addScaledVector(UP, dormant ? rng.range(-0.15, 0.2) : rng.range(0.2, 0.7))
        .normalize();
      const fLen = len * rng.range(0.35, 0.6);
      const fMid = fStart.clone().addScaledVector(fDir, fLen * 0.5).addScaledVector(UP, fLen * 0.06);
      const fEnd = fStart.clone().addScaledVector(fDir, fLen).addScaledVector(UP, fLen * (dormant ? -0.05 : 0.15));
      twigs.push({
        id: `${owner.id}.fine.${i}.${j}`,
        kind: "twig",
        businessUnitId: owner.businessUnitId,
        teamId: owner.teamId,
        curve: makeCurve([fStart, fMid, fEnd]),
        radiusStart: 0.038,
        radiusEnd: 0.01,
        length: fLen,
      });
    }
  }
}

/** Short visual side-shoots on a major limb — silhouette only, never data. */
function addCharacterShoots(
  rng: Rng,
  owner: { id: string; businessUnitId: string },
  seg: BranchSegment,
  dormant: boolean,
  twigs: BranchSegment[],
) {
  const count = dormant ? 2 : 3 + (rng.chance(0.5) ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const t = rng.range(0.18, 0.7);
    const start = seg.curve.getPointAt(t);
    const tangent = seg.curve.getTangentAt(t).normalize();
    const perp = new THREE.Vector3().crossVectors(tangent, UP).normalize().multiplyScalar(rng.chance(0.5) ? 1 : -1);
    const dir = new THREE.Vector3()
      .addScaledVector(perp, 0.95)
      .addScaledVector(UP, dormant ? rng.range(-0.2, 0.15) : rng.range(0.25, 0.7))
      .addScaledVector(tangent, 0.25)
      .normalize();
    const len = seg.length * rng.range(0.12, 0.22);
    const end = start.clone().addScaledVector(dir, len);
    const mid = start.clone().lerp(end, 0.5).addScaledVector(UP, len * 0.06);
    twigs.push({
      id: `${owner.id}.shoot.${i}`,
      kind: "twig",
      businessUnitId: owner.businessUnitId,
      curve: makeCurve([start, mid, end]),
      radiusStart: Math.min(seg.radiusStart * 0.22, 0.14),
      radiusEnd: 0.03,
      length: len,
    });
  }
}

/** Small inner shoots from the trunk — character, not organizations. */
function addTrunkShoots(
  rng: Rng,
  account: Account,
  trunk: BranchSegment,
  height: number,
  trunkRadius: number,
  twigs: BranchSegment[],
) {
  const count = 5 + Math.round(3 * account.scale.complexity);
  for (let i = 0; i < count; i++) {
    const t = rng.range(0.18, 0.78);
    const start = trunk.curve.getPointAt(t);
    const angle = rng.range(0, Math.PI * 2);
    const dir = new THREE.Vector3(Math.cos(angle), rng.range(0.15, 0.45), Math.sin(angle)).normalize();
    const len = height * rng.range(0.06, 0.13);
    const end = start.clone().addScaledVector(dir, len);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, len * 0.08, 0));
    twigs.push({
      id: `${account.id}.trunk.shoot.${i}`,
      kind: "twig",
      curve: makeCurve([start, mid, end]),
      radiusStart: trunkRadius * 0.08,
      radiusEnd: 0.02,
      length: len,
    });
  }
}

/** Deterministic resting place for a fallen leaf (meeting marker). */
export function meetingSlot(skeleton: TreeSkeleton, prospectId: string) {
  const rng = createRng(hashString(`${skeleton.accountId}|slot|${prospectId}`));
  const angle = rng.range(0, Math.PI * 2);
  const radius = skeleton.trunkRadius * 2.4 + rng.range(0, skeleton.trunkRadius * 2.8);
  return {
    position: new THREE.Vector3(Math.cos(angle) * radius, 0.06, Math.sin(angle) * radius),
    rotationY: rng.range(0, Math.PI * 2),
    tilt: rng.range(-0.12, 0.12),
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
