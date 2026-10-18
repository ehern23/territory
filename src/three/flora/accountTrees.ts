import * as THREE from "three";
import type { Account } from "@/domain/types";
import { territory } from "@/data";
import { generateTree, type TreeShape } from "./generateTree";
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

export interface AccountTreeModel {
  accountId: string;
  shape: TreeShape;
  geometries: TreeGeometries;
  /** Business-unit id for each scaffold limb index. */
  limbIds: string[];
  /** Opportunity id → where its fruit hangs (tree-local). Stable for every opportunity, visible or not. */
  fruitHang: Record<string, THREE.Vector3>;
}

const cache = new Map<string, AccountTreeModel>();

export function accountTreeParams(account: Account) {
  const habit = { spread: 1, upright: 1, lean: 1, ...HABIT[account.id] };
  const height = 32 + 26 * account.scale.opportunity;
  const sizes = account.businessUnits.map((bu) => bu.teams.reduce((s, t) => s + t.prospects.length, 0));
  const max = Math.max(1, ...sizes);
  return {
    seed: account.seed,
    height,
    trunkRadius: 1.5 + 1.2 * account.scale.enterprise,
    limbs: sizes.map((s) => ({ weight: 0.35 + 0.65 * (s / max) })),
    spread: habit.spread,
    upright: habit.upright,
    lean: habit.lean,
    depth: 2 as const,
    cardSize: height * 0.13,
    leafDensity: 1.5,
    clearBole: 0.34,
  };
}

export function getAccountTree(accountId: string): AccountTreeModel | null {
  const hit = cache.get(accountId);
  if (hit) return hit;
  const account = territory.accounts.find((a) => a.id === accountId);
  if (!account) return null;
  const shape = generateTree(accountTreeParams(account));
  const limbIds = account.businessUnits.map((bu) => bu.id);
  const model: AccountTreeModel = {
    accountId,
    shape,
    geometries: buildTreeGeometries(shape),
    limbIds,
    fruitHang: placeFruit(shape, account),
  };
  cache.set(accountId, model);
  return model;
}

/**
 * Fruit hangs on the camera-facing side of the lower canopy (the territory is
 * viewed from +Z), fanned out so several opportunities never overlap.
 */
function placeFruit(shape: TreeShape, account: Account) {
  const out: Record<string, THREE.Vector3> = {};
  const n = account.opportunities.length;
  const front = Math.atan2(0.3, 1);
  account.opportunities.forEach((opp, k) => {
    const az = front + (k - (n - 1) / 2) * 0.75 + (k % 2 === 0 ? 0.08 : -0.12);
    const dir = new THREE.Vector3(Math.sin(az), -0.32 - (k % 2) * 0.12, Math.cos(az)).normalize();
    out[opp.id] = shape.crownCenter.clone().add(dir.multiply(shape.crownRadii).multiplyScalar(0.9));
  });
  return out;
}
