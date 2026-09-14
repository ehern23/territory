"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useTreeModel } from "./useTreeModel";
import { accountPosition } from "./layout";
import { ActiveWood, ForestWood } from "./Wood";
import { DecorativeCanopy } from "./Canopy";
import { Leaves } from "./Leaves";
import { Buds, FallingLeaves, Fruit, MeetingMarkers, SelectionRing } from "./Living";
import { Roots } from "./Roots";
import { BranchLabels, ForestMarker } from "./Labels";

/**
 * One strategic account rendered as a tree.
 * Active account: full detail, per-branch interaction, labels, roots.
 * Others: reduced geometry, single mesh, larger leaves for legibility.
 */
export function Tree({ accountId }: { accountId: string }) {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const selectedAccountId = useTerritoryStore((s) => s.selectedAccountId);
  const selectAccount = useTerritoryStore((s) => s.selectAccount);
  const isTouch = useTerritoryStore((s) => s.isTouch);

  const view = useTerritoryStore((s) => s.view);
  const active = mode === "account" && activeAccountId === accountId;
  const detail = active ? "full" : isTouch ? "reduced" : "reduced";
  const showCanopy = view !== "roots";
  const model = useTreeModel(accountId, detail);
  const position = accountPosition(accountId);

  // Leaves grow toward full size as the account becomes active.
  const sizeRef = useRef(1.35);
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const target = active ? 1.04 : 1.38;
    sizeRef.current += (target - sizeRef.current) * (1 - Math.exp(-dt * 4));
  });

  useEffect(() => {
    document.body.style.cursor = "";
  }, [active]);

  if (!model) return null;

  const dim =
    mode === "forest"
      ? selectedAccountId && selectedAccountId !== accountId
        ? 0.42
        : 0
      : active
        ? 0
        : 0.92;

  return (
    <group ref={groupRef} position={position}>
      {active ? (
        <>
          <ActiveWood model={model} />
          {showCanopy && <DecorativeCanopy skeleton={model.skeleton} active />}
          <Leaves skeleton={model.skeleton} active sizeScaleRef={sizeRef} dim={0} />
          <Fruit skeleton={model.skeleton} active />
          <FallingLeaves skeleton={model.skeleton} />
          <MeetingMarkers skeleton={model.skeleton} active />
          <Buds skeleton={model.skeleton} />
          <SelectionRing skeleton={model.skeleton} />
          <Roots model={model} active />
          <BranchLabels skeleton={model.skeleton} />
        </>
      ) : (
        <>
          <ForestWood
            model={model}
            dim={dim}
            onSelect={() => {
              if (mode === "forest") selectAccount(accountId);
            }}
          />
          {true && (
            <>
              {showCanopy && <DecorativeCanopy skeleton={model.skeleton} active={false} />}
              <Leaves skeleton={model.skeleton} active={false} sizeScaleRef={sizeRef} dim={dim} />
              {mode === "forest" && <Fruit skeleton={model.skeleton} active={false} sizeScale={1.15} />}
              {mode === "forest" && <MeetingMarkers skeleton={model.skeleton} active={false} />}
              {mode === "forest" && <ForestMarker accountId={accountId} skeleton={model.skeleton} selected={selectedAccountId === accountId} />}
            </>
          )}
        </>
      )}
    </group>
  );
}
