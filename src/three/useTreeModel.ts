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

/**
 * Geometry is built from the account's static organizational data so a tree
 * keeps its recognizable shape while relationship state animates on top.
 */
export function getTreeModel(accountId: string, detail: Detail): TreeModel | null {
  const state = useTerritoryStore.getState();
  const account = state.accountsById[accountId];
  if (!account) return null;

  let skeleton = skeletonCache.get(accountId);
  if (!skeleton) {
    skeleton = buildTreeSkeleton({
      account,
      businessUnits: account.businessUnits,
      prospectsById: state.prospectsById,
    });
    skeletonCache.set(accountId, skeleton);
  }

  const key = `${accountId}|${detail}`;
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
