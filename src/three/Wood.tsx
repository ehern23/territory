"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { TreeModel } from "./useTreeModel";
import { BARK, BARK_DORMANT, BARK_SPRING } from "./palette";
import { emphasisFor } from "./emphasis";

const QUIET = new THREE.Color("#25262b");
const RECEDE = new THREE.Color("#1d1e24");

function makeBark(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: BARK.clone(), roughness: 0.92, metalness: 0.02 });
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
  const material = useMemo(makeBark, []);
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
  const trunkMaterial = useMemo(makeBark, []);
  useEffect(() => () => trunkMaterial.dispose(), [trunkMaterial]);
  const trunkTarget = useMemo(() => {
    const c = BARK.clone();
    if (view === "roots") c.lerp(QUIET, 0.25);
    return c;
  }, [view]);
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
  const material = useMemo(makeBark, []);
  useEffect(() => () => material.dispose(), [material]);
  // Past ~0.8 the tree is a neighbour of the active account: push it toward the
  // background so it reads as depth rather than competing with the crown.
  const target = useMemo(
    () => (dim > 0.8 ? BARK.clone().lerp(RECEDE, 0.55 + (dim - 0.8) * 2) : BARK.clone().lerp(QUIET, dim * 0.75)),
    [dim],
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
