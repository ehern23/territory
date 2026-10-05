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

  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const view = useTerritoryStore((s) => s.view);
  const active = mode === "account" && activeAccountId === accountId;
  const detail = active ? "full" : "reduced";
  const showCanopy = view !== "roots";
  const model = useTreeModel(accountId, detail);
  const position = accountPosition(accountId);

  // Leaves grow toward full size as the account becomes active.
  const sizeRef = useRef(1.35);
  const groupRef = useRef<THREE.Group>(null);
  // People must stay legible from the whole-crown shot; close inspection
  // returns them to natural scale so neighbouring tufts do not merge.
  const inspecting = useTerritoryStore((s) => !!(s.focusBusinessUnitId || s.selectedProspectId || s.selectedOpportunityId));
  useFrame((_, dt) => {
    const target = active ? (inspecting ? 1.1 : 1.55) : 1.38;
    sizeRef.current = reducedMotion ? target : sizeRef.current + (target - sizeRef.current) * (1 - Math.exp(-dt * 4));
  });

  useEffect(() => {
    document.body.style.cursor = "";
  }, [active]);

  if (!model) return null;

  // Inside an account, other strategic crowns read as rivals to the subject or
  // as part of it. They step out; the ordinary forest remains as context.
  if (mode === "account" && !active) return null;

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
          <Fruit skeleton={model.skeleton} active sizeScale={1.5} />
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
          <>
              {showCanopy && <DecorativeCanopy skeleton={model.skeleton} active={false} dim={dim} />}
              <Leaves skeleton={model.skeleton} active={false} sizeScaleRef={sizeRef} dim={dim} />
              {mode === "forest" && <Fruit skeleton={model.skeleton} active={false} sizeScale={1.6} />}
              {mode === "forest" && <MeetingMarkers skeleton={model.skeleton} active={false} />}
              {mode === "forest" && <ForestMarker accountId={accountId} skeleton={model.skeleton} selected={selectedAccountId === accountId} quiet={dim > 0} />}
          </>
        </>
      )}
    </group>
  );
}
