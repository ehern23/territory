import { useMemo } from "react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { buildTreeSkeleton, type TreeSkeleton } from "./treeGen";
import { buildTreeGeometry, type Detail, type TreeGeometry } from "./treeGeometry";

export interface TreeModel {
  skeleton: TreeSkeleton;
  geometry: TreeGeometry;
}

const skeletonCache = new Map<string, TreeSkeleton>();
const geometryCache = new Map<string, TreeGeometry>();
const MODEL_GEN = "old-growth-1";

/**
 * Geometry is built from the account's static organizational data so a tree
 * keeps its recognizable shape while relationship state animates on top.
 */
export function getTreeModel(accountId: string, detail: Detail): TreeModel | null {
  const state = useTerritoryStore.getState();
  const account = state.accountsById[accountId];
  if (!account) return null;

  let skeleton = skeletonCache.get(`${accountId}|${MODEL_GEN}`);
  if (!skeleton) {
    skeleton = buildTreeSkeleton({
      account,
      businessUnits: account.businessUnits,
      prospectsById: state.prospectsById,
    });
    skeletonCache.set(`${accountId}|${MODEL_GEN}`, skeleton);
  }

  const key = `${accountId}|${detail}|${MODEL_GEN}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = buildTreeGeometry(skeleton, detail);
    geometryCache.set(key, geometry);
  }
  return { skeleton, geometry };
}

export function useTreeModel(accountId: string, detail: Detail): TreeModel | null {
  return useMemo(() => getTreeModel(accountId, detail), [accountId, detail]);
}
