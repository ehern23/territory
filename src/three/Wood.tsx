"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { TreeModel } from "./useTreeModel";
import { BARK, BARK_DORMANT, BARK_SPRING } from "./palette";
import { emphasisFor } from "./emphasis";
import { useBarkMaterial } from "./forestKit";

const QUIET = new THREE.Color("#3c4038");
const RECEDE = new THREE.Color("#3a4638");

function barkTint(id: string) {
  const map: Record<string, string> = {
    jpmc: "#4e4034",
    walmart: "#584a3c",
    disney: "#564838",
    amex: "#5a4c3c",
    nike: "#5c4e3c",
    starbucks: "#524636",
    marriott: "#4a4438",
    ford: "#4e4636",
  };
  return new THREE.Color(map[id] ?? "#5a4a3a");
}

/** Smoothly drives a material colour toward a target each frame. */
function useAnimatedColor(material: THREE.MeshStandardMaterial, target: THREE.Color) {
  const targetRef = useRef(target);
  targetRef.current = target;
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    material.color.lerp(targetRef.current, k);
  });
}

interface LimbProps {
  geometry: THREE.BufferGeometry;
  businessUnitId: string;
  teamId?: string;
  onSelect: () => void;
}

function Limb({ geometry, businessUnitId, teamId, onSelect }: LimbProps) {
  const material = useBarkMaterial();
  useEffect(() => () => material.dispose(), [material]);

  const bu = useTerritoryStore((s) => s.businessUnitsById[businessUnitId]);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusTeamId = useTerritoryStore((s) => s.focusTeamId);
  const view = useTerritoryStore((s) => s.view);

  const target = useMemo(() => {
    const base =
      bu?.status === "dormant" ? BARK_DORMANT : bu?.status === "reactivating" ? BARK_SPRING : BARK;
    const c = base.clone();
    let emphasis = emphasisFor({ focusBusinessUnitId, focusTeamId, view }, businessUnitId, teamId);
    if (view === "roots") emphasis = Math.min(emphasis, 0.6);
    c.lerp(QUIET, (1 - emphasis) * 0.7);
    return c;
  }, [bu?.status, focusBusinessUnitId, focusTeamId, view, businessUnitId, teamId]);

  useAnimatedColor(material, target);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <mesh
      geometry={geometry}
      material={material}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    />
  );
}

/** Full-detail woody structure for the active account: trunk + per-BU limbs + per-team branches. */
export function ActiveWood({ model }: { model: TreeModel }) {
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const focusTeam = useTerritoryStore((s) => s.focusTeam);
  const clearSelection = useTerritoryStore((s) => s.clearSelection);
  const view = useTerritoryStore((s) => s.view);
  const trunkMaterial = useBarkMaterial();
  useEffect(() => () => trunkMaterial.dispose(), [trunkMaterial]);
  const trunkTarget = useMemo(() => {
    const c = barkTint(model.skeleton.accountId);
    if (view === "roots") c.lerp(QUIET, 0.25);
    return c;
  }, [view, model.skeleton.accountId]);
  useAnimatedColor(trunkMaterial, trunkTarget);

  return (
    <group>
      <mesh
        geometry={model.geometry.trunk}
        material={trunkMaterial}
        onClick={(e) => {
          e.stopPropagation();
          clearSelection();
        }}
      />
      {model.geometry.businessUnits.map((bu) => (
        <group key={bu.businessUnitId}>
          <Limb
            geometry={bu.limb}
            businessUnitId={bu.businessUnitId}
            onSelect={() => focusBusinessUnit(bu.businessUnitId)}
          />
          {bu.teams.map((team) => (
            <Limb
              key={team.teamId}
              geometry={team.geometry}
              businessUnitId={bu.businessUnitId}
              teamId={team.teamId}
              onSelect={() => focusTeam(team.teamId)}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Reduced-detail woody structure for non-active trees in the forest. */
export function ForestWood({
  model,
  onSelect,
  dim,
}: {
  model: TreeModel;
  onSelect: () => void;
  dim: number;
}) {
  const material = useBarkMaterial();
  useEffect(() => () => material.dispose(), [material]);
  // Past ~0.8 the tree is a neighbour of the active account: push it toward the
  // background so it reads as depth rather than competing with the crown.
  const target = useMemo(
    () => {
      const base = barkTint(model.skeleton.accountId);
      return dim > 0.8 ? base.lerp(RECEDE, 0.45 + (dim - 0.8) * 2) : base.lerp(QUIET, dim * 0.55);
    },
    [dim, model.skeleton.accountId],
  );
  useAnimatedColor(material, target);
  return (
    <mesh
      geometry={model.geometry.merged}
      material={material}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    />
  );
}
