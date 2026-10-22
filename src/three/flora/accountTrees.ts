import * as THREE from "three";
import type { Account } from "@/domain/types";
import { createRng } from "@/lib/random";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { activeBiome, useBiomeStore } from "@/store/useBiomeStore";
import type { BiomeId } from "../biomes/biomes";
import { generateTree, type TreeShape } from "./generateTree";
import { accountApproachAzimuth } from "../layout";
import { buildTreeGeometries, type TreeGeometries } from "./treeMeshes";

/**
 * Account → tree. Height follows commercial potential, girth follows the
 * size of the enterprise, and each business unit becomes a scaffold limb
 * whose length follows the size of that organisation.
 */

interface Habit {
  spread: number;
  upright: number;
  lean: number;
}

/** Hand-tuned habits for the original territory; every other account derives one from its seed. */
const HABIT: Record<string, Partial<Habit>> = {
  jpmc: { spread: 1.08, upright: 0.95, lean: 1.2 },
  walmart: { spread: 1.15, upright: 0.9 },
  disney: { spread: 1.18, upright: 0.85 },
  amex: { spread: 0.92, upright: 1.15, lean: 0.5 },
  nike: { spread: 0.95, upright: 1.12, lean: 0.4 },
  starbucks: { spread: 1.1, upright: 0.9, lean: 1.5 },
  marriott: { spread: 1.05, lean: 1.1 },
  ford: { spread: 0.95, upright: 1.1, lean: 0.6 },
};

function habitFor(account: Account): Habit {
  const tuned = HABIT[account.id];
  if (tuned) return { spread: 1, upright: 1, lean: 1, ...tuned };
  const rng = createRng(account.seed ^ 0x5bd1e995);
  return {
    spread: 0.92 + rng.next() * 0.26,
    upright: 0.86 + rng.next() * 0.28,
    lean: 0.4 + rng.next() * 1.1,
  };
}

export interface AccountTreeModel {
  accountId: string;
  /** The account this model was grown from; a new territory grows new trees. */
  account: Account;
  /** The biome it was grown in; switching forests regrows it. */
  biome: BiomeId;
  shape: TreeShape;
  geometries: TreeGeometries;
  /** Business-unit id for each scaffold limb index. */
  limbIds: string[];
  /** Opportunity id → where its fruit hangs (tree-local). Stable for every opportunity, visible or not. */
  fruitHang: Record<string, THREE.Vector3>;
}

const cache = new Map<string, AccountTreeModel>();

/**
 * Account trees are emergent giants: roughly two and a half times the height
 * of the surrounding forest, so the book of business stands above the canopy.
 * Leaf clusters stay life-sized, so a giant reads as an old tree with a vast,
 * finely divided crown rather than a scaled-up sapling.
 */
export function accountTreeParams(account: Account) {
  const habit = habitFor(account);
  const height = 104 + 48 * account.scale.opportunity;
  const sizes = account.businessUnits.map((bu) => bu.teams.reduce((s, t) => s + t.prospects.length, 0));
  const max = Math.max(1, ...sizes);
  return {
    seed: account.seed,
    height,
    trunkRadius: 4.2 + 2.8 * account.scale.enterprise,
    limbs: sizes.map((s) => ({ weight: 0.35 + 0.65 * (s / max) })),
    spread: habit.spread * 1.12,
    upright: habit.upright,
    lean: habit.lean,
    depth: 3 as const,
    cardSize: 8,
    leafDensity: 1.7,
    clearBole: 0.3,
    ...activeBiome().accountHabit,
  };
}

function disposeModel(model: AccountTreeModel) {
  model.geometries.bark.dispose();
  model.geometries.foliage.dispose();
}

/** Tree for an account of the active territory. Rebuilt when the territory changes. */
export function getAccountTree(accountId: string): AccountTreeModel | null {
  const account = useTerritoryStore.getState().accountsById[accountId];
  const hit = cache.get(accountId);
  const biome = useBiomeStore.getState().biome;
  if (hit && hit.account === account && hit.biome === biome) return hit;
  if (hit) {
    disposeModel(hit);
    cache.delete(accountId);
  }
  if (!account) return null;
  const shape = generateTree(accountTreeParams(account));
  const limbIds = account.businessUnits.map((bu) => bu.id);
  const model: AccountTreeModel = {
    accountId,
    account,
    biome,
    shape,
    geometries: buildTreeGeometries(shape),
    limbIds,
    fruitHang: placeFruit(shape, account),
  };
  cache.set(accountId, model);
  return model;
}

/**
 * Fruit hangs from real outer branches, on the side of the crown the camera
 * approaches from, spread apart so clusters never overlap.
 */
function placeFruit(shape: TreeShape, account: Account) {
  const out: Record<string, THREE.Vector3> = {};
  const az = accountApproachAzimuth(account.id);
  const toward = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
  const used: THREE.Vector3[] = [];
  const minGap = Math.max(shape.crownRadii.x, shape.crownRadii.z) * 0.35;
  const ranked = shape.fruitSlots
    .map((s) => {
      const o = s.hang.clone().sub(shape.crownCenter);
      const facing = new THREE.Vector3(o.x, 0, o.z).normalize().dot(toward);
      return { s, score: facing * 1.4 - Math.max(0, o.y / shape.crownRadii.y) };
    })
    .sort((a, b) => b.score - a.score);
  for (const opp of account.opportunities) {
    const limb = account.businessUnits.findIndex((bu) => bu.id === opp.businessUnitId);
    const pick =
      ranked.find((r) => r.s.limb === limb && used.every((u) => u.distanceTo(r.s.hang) > minGap)) ??
      ranked.find((r) => used.every((u) => u.distanceTo(r.s.hang) > minGap)) ??
      ranked[0];
    const hang = pick ? pick.s.hang.clone() : shape.crownCenter.clone();
    used.push(hang);
    out[opp.id] = hang;
  }
  return out;
}

/** Free trees that no longer belong to the active territory. */
export function pruneAccountTrees(activeIds: Iterable<string>) {
  const keep = new Set(activeIds);
  for (const [id, model] of cache) {
    if (keep.has(id)) continue;
    disposeModel(model);
    cache.delete(id);
  }
}
