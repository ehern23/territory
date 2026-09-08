"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { Account, BusinessUnit } from "@/domain/types";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { silhouetteSlots, type SilhouetteSlot } from "./layout";
import { buildTreeSkeleton } from "./treeGen";
import { buildTreeGeometry } from "./treeGeometry";
import { BARK_FOREST_FAR } from "./palette";

/** Bare woody form used for distant market silhouettes. */
function silhouetteGeometry(slot: SilhouetteSlot): THREE.BufferGeometry {
  const account: Account = {
    id: slot.id,
    name: slot.id,
    seed: slot.seed,
    sector: "",
    thesis: "",
    season: "summer",
    scale: { opportunity: 0.35, enterprise: 0.45, complexity: 0.4 },
    strategicScore: { components: [] },
    businessUnits: [],
    intelligence: [],
    opportunities: [],
    signals: [],
  };
  const bus: BusinessUnit[] = Array.from({ length: 4 }, (_, i) => ({
    id: `${slot.id}.bu${i}`,
    accountId: slot.id,
    name: "",
    priority: "medium",
    season: "summer",
    status: "active",
    thesis: "",
    teams: Array.from({ length: 2 }, (_, j) => ({
      id: `${slot.id}.bu${i}.t${j}`,
      businessUnitId: `${slot.id}.bu${i}`,
      accountId: slot.id,
      name: "",
      priority: "medium",
      season: "summer",
      prospects: [],
    })),
  }));
  account.businessUnits = bus;
  const skeleton = buildTreeSkeleton({ account, businessUnits: bus, prospectsById: {} });
  return buildTreeGeometry(skeleton, "reduced").merged;
}

const cache = new Map<string, THREE.BufferGeometry>();

export function Silhouettes() {
  const mode = useTerritoryStore((s) => s.mode);
  const selectedMarketId = useTerritoryStore((s) => s.selectedMarketId);
  const selectMarket = useTerritoryStore((s) => s.selectMarket);
  const slots = useMemo(() => silhouetteSlots(MARKET_IDS), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BARK_FOREST_FAR.clone(),
        roughness: 1,
        transparent: true,
        opacity: 0.72,
      }),
    [],
  );
  const selectedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#3a3a3e"),
        roughness: 1,
      }),
    [],
  );
  useEffect(
    () => () => {
      material.dispose();
      selectedMaterial.dispose();
    },
    [material, selectedMaterial],
  );

  return (
    <group>
      {slots.map((slot) => {
        let geo = cache.get(slot.id);
        if (!geo) {
          geo = silhouetteGeometry(slot);
          cache.set(slot.id, geo);
        }
        const selectable = mode === "forest" && !!slot.marketId;
        const selected = selectedMarketId === slot.marketId;
        return (
          <group key={slot.id} position={slot.position} scale={0.82}>
            <mesh
              geometry={geo}
              material={selected ? selectedMaterial : material}
              onClick={
                selectable
                  ? (e) => {
                      e.stopPropagation();
                      selectMarket(slot.marketId!);
                    }
                  : undefined
              }
              onPointerOver={
                selectable
                  ? (e) => {
                      e.stopPropagation();
                      document.body.style.cursor = "pointer";
                    }
                  : undefined
              }
              onPointerOut={selectable ? () => { document.body.style.cursor = ""; } : undefined}
            />
            {selectable && selected && (
              <Html position={[0, slot.height * 0.35, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "auto" }}>
                <button
                  type="button"
                  className="market-label is-selected"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectMarket(slot.marketId!);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {MARKET_NAMES[slot.marketId!] ?? slot.marketId}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

const MARKET_IDS = ["amazon", "microsoft", "google"];
const MARKET_NAMES: Record<string, string> = { amazon: "Amazon", microsoft: "Microsoft", google: "Google" };
