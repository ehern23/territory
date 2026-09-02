"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  evaluateVisibleOpportunities,
  useTerritoryStore,
} from "@/store/useTerritoryStore";
import type { OpportunityState } from "@/domain/opportunity";
import { statusRank } from "@/domain/relationship";
import { meetingSlot, type TreeSkeleton } from "./treeGen";
import { getFruitGeometry, getLeafGeometry } from "./treeGeometry";
import { BUD_COLOR, FRUIT_COLORS, FRUIT_SCALE, LEAF_COLORS } from "./palette";
import { emphasisFor } from "./emphasis";
import { createLeafMaterial } from "./materials";

const QUIET = new THREE.Color("#2b2c31");

/* ------------------------------------------------------------------ */
/* Fruit — commercial opportunity                                      */
/* ------------------------------------------------------------------ */

function FruitMesh({
  state,
  position,
  active,
  sizeScale,
}: {
  state: OpportunityState;
  position: THREE.Vector3;
  active: boolean;
  sizeScale: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: FRUIT_COLORS.seed.clone(),
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const selectedOpportunityId = useTerritoryStore((s) => (active ? s.selectedOpportunityId : null));
  const focusBusinessUnitId = useTerritoryStore((s) => (active ? s.focusBusinessUnitId : null));
  const focusTeamId = useTerritoryStore((s) => (active ? s.focusTeamId : null));
  const view = useTerritoryStore((s) => (active ? s.view : "tree"));
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);

  const target = useMemo(() => {
    const m = state.maturity;
    const scale = m ? FRUIT_SCALE[m] * (1 + 0.25 * state.strength) : 0;
    const color = m ? FRUIT_COLORS[m].clone() : FRUIT_COLORS.seed.clone();
    const emphasis = emphasisFor({ focusBusinessUnitId, focusTeamId, view }, state.opportunity.businessUnitId);
    color.lerp(QUIET, (1 - emphasis) * 0.6);
    const selected = selectedOpportunityId === state.opportunity.id;
    return { scale: scale * (selected ? 1.18 : 1) * sizeScale, color, emissive: m === "ripe" ? 0.12 : m === "growing" ? 0.06 : 0 };
  }, [state, focusBusinessUnitId, focusTeamId, view, selectedOpportunityId, sizeScale]);

  const current = useRef({ scale: 0 });

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = 1 - Math.exp(-dt * 4);
    current.current.scale += (target.scale - current.current.scale) * k;
    const s = Math.max(0.0001, current.current.scale);
    mesh.scale.set(s, s, s);
    mesh.position.set(position.x, position.y - s * 1.2, position.z);
    material.color.lerp(target.color, k);
    material.emissive.copy(material.color).multiplyScalar(target.emissive);
  });

  if (!state.maturity && current.current.scale < 0.001) return null;

  return (
    <mesh
      ref={ref}
      geometry={getFruitGeometry()}
      material={material}
      onClick={
        active
          ? (e) => {
              e.stopPropagation();
              selectOpportunity(state.opportunity.id);
            }
          : undefined
      }
      onPointerOver={active ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={active ? () => { document.body.style.cursor = ""; } : undefined}
    />
  );
}

export function Fruit({ skeleton, active, sizeScale = 1 }: { skeleton: TreeSkeleton; active: boolean; sizeScale?: number }) {
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const opportunitiesById = useTerritoryStore((s) => s.opportunitiesById);
  const states = useMemo(
    () => evaluateVisibleOpportunities({ accountsById, prospectsById, opportunitiesById }, skeleton.accountId),
    [accountsById, prospectsById, opportunitiesById, skeleton.accountId],
  );
  return (
    <group>
      {states.map((state) => {
        const anchor = skeleton.fruit.find((f) => f.opportunityId === state.opportunity.id);
        if (!anchor) return null;
        return (
          <FruitMesh
            key={state.opportunity.id}
            state={state}
            position={anchor.branchPoint}
            active={active}
            sizeScale={sizeScale}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Falling leaf — signature interaction                                */
/* ------------------------------------------------------------------ */

const FALL_DURATION = 3000;

function FallingLeaf({
  skeleton,
  prospectId,
  startedAt,
}: {
  skeleton: TreeSkeleton;
  prospectId: string;
  startedAt: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const completeFall = useTerritoryStore((s) => s.completeFall);
  const anchor = useMemo(
    () => skeleton.leaves.find((l) => l.prospectId === prospectId),
    [skeleton, prospectId],
  );
  const slot = useMemo(() => meetingSlot(skeleton, prospectId), [skeleton, prospectId]);
  const material = useMemo(
    () => createLeafMaterial({ color: LEAF_COLORS.meeting.clone(), roughness: 0.7 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const done = useRef(false);
  const restQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + slot.tilt, slot.rotationY, 0)),
    [slot],
  );

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || !anchor) return;
    const elapsed = performance.now() - startedAt;
    // Brief hold on the branch (reaction), then release.
    const hold = 350;
    const t = Math.min(1, Math.max(0, (elapsed - hold) / (FALL_DURATION - hold)));

    if (t <= 0) {
      const shake = Math.sin(elapsed * 0.045) * 0.08 * (1 - elapsed / hold);
      const q = new THREE.Quaternion().setFromAxisAngle(anchor.hinge, shake).multiply(anchor.quaternion);
      mesh.position.copy(anchor.position);
      mesh.quaternion.copy(q);
      const s = anchor.scale * 1.35;
      mesh.scale.set(s, s, s);
      return;
    }

    // Vertical: ease-in start, then near-constant descent with a soft landing.
    const ease = t < 0.25 ? 2 * t * t : 0.125 + (t - 0.25) * 1.1667;
    const y = THREE.MathUtils.lerp(anchor.position.y, slot.position.y, Math.min(1, ease));
    // Lateral: drift from anchor toward the slot with a pendulum sway.
    const sway = Math.sin(t * Math.PI * 3.2) * (1 - t) * 1.1;
    const drift = new THREE.Vector3().lerpVectors(anchor.position, slot.position, smooth(t));
    const side = new THREE.Vector3(-anchor.outward.z, 0, anchor.outward.x);
    mesh.position.set(drift.x + side.x * sway, y, drift.z + side.z * sway);

    // Tumble, settling into the resting pose.
    const tumble = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(t * Math.PI * 2.4, t * Math.PI * 1.6, Math.sin(t * 5) * 0.6),
    );
    mesh.quaternion.copy(anchor.quaternion).multiply(tumble);
    if (t > 0.8) mesh.quaternion.slerp(restQuat, (t - 0.8) / 0.2);
    const s = anchor.scale * 1.2;
    mesh.scale.set(s, s, s);

    if (t >= 1 && !done.current) {
      done.current = true;
      completeFall(prospectId);
    }
  });

  if (!anchor) return null;
  return <mesh ref={ref} geometry={getLeafGeometry()} material={material} />;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function FallingLeaves({ skeleton }: { skeleton: TreeSkeleton }) {
  const falling = useTerritoryStore((s) => s.fallingLeaves);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const mine = falling.filter((f) => prospectsById[f.prospectId]?.accountId === skeleton.accountId);
  return (
    <group>
      {mine.map((f) => (
        <FallingLeaf key={f.prospectId} skeleton={skeleton} prospectId={f.prospectId} startedAt={f.startedAt} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Meeting markers — fallen leaves persist at the base                 */
/* ------------------------------------------------------------------ */

function MeetingMarker({
  skeleton,
  prospectId,
  active,
}: {
  skeleton: TreeSkeleton;
  prospectId: string;
  active: boolean;
}) {
  const slot = useMemo(() => meetingSlot(skeleton, prospectId), [skeleton, prospectId]);
  const anchor = useMemo(() => skeleton.leaves.find((l) => l.prospectId === prospectId), [skeleton, prospectId]);
  const selected = useTerritoryStore((s) => active && s.selectedProspectId === prospectId);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const groupRef = useRef<THREE.Group>(null);
  const appear = useRef(0);

  const leafMaterial = useMemo(
    () => createLeafMaterial({ color: LEAF_COLORS.meeting.clone(), roughness: 0.75 }),
    [],
  );
  const ringMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#d7c7b4"), transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
    [],
  );
  useEffect(
    () => () => {
      leafMaterial.dispose();
      ringMaterial.dispose();
    },
    [leafMaterial, ringMaterial],
  );

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    appear.current = Math.min(1, appear.current + dt * 2.5);
    const s = appear.current * (selected ? 1.15 : 1);
    g.scale.set(s, s, s);
    ringMaterial.opacity = selected ? 0.75 : active ? 0.16 : 0.08;
  });

  const scale = (anchor?.scale ?? 1) * 1.2;
  return (
    <group ref={groupRef} position={slot.position}>
      <mesh
        geometry={getLeafGeometry()}
        material={leafMaterial}
        rotation={[-Math.PI / 2 + slot.tilt, slot.rotationY, 0]}
        scale={scale}
        onClick={
          active
            ? (e) => {
                e.stopPropagation();
                selectProspect(prospectId);
              }
            : undefined
        }
        onPointerOver={active ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
        onPointerOut={active ? () => { document.body.style.cursor = ""; } : undefined}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={ringMaterial}>
        <ringGeometry args={[0.72, 0.78, 40]} />
      </mesh>
    </group>
  );
}

export function MeetingMarkers({ skeleton, active }: { skeleton: TreeSkeleton; active: boolean }) {
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const falling = useTerritoryStore((s) => s.fallingLeaves);
  const ids = useMemo(
    () =>
      skeleton.leaves
        .map((l) => l.prospectId)
        .filter((id) => {
          const p = prospectsById[id];
          return p && p.relationshipStatus === "meeting" && !falling.some((f) => f.prospectId === id);
        }),
    [skeleton.leaves, prospectsById, falling],
  );
  return (
    <group>
      {ids.map((id) => (
        <MeetingMarker key={id} skeleton={skeleton} prospectId={id} active={active} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Buds — reactivation                                                 */
/* ------------------------------------------------------------------ */

export function Buds({ skeleton }: { skeleton: TreeSkeleton }) {
  const reactivations = useTerritoryStore((s) => s.reactivations);
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const completeReactivation = useTerritoryStore((s) => s.completeReactivation);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const anchors = useMemo(() => {
    const account = accountsById[skeleton.accountId];
    if (!account) return [];
    const latent = new Set<string>();
    account.businessUnits.forEach((bu) =>
      bu.teams.forEach((t) => t.prospects.forEach((p) => p.latent && latent.add(p.id))),
    );
    return skeleton.leaves.filter(
      (l) => latent.has(l.prospectId) && reactivations.some((r) => r.businessUnitId === l.businessUnitId),
    );
  }, [accountsById, skeleton, reactivations]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: BUD_COLOR, roughness: 0.6 }), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.16, 10, 8), []);
  useEffect(() => () => { material.dispose(); geometry.dispose(); }, [material, geometry]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || anchors.length === 0) return;
    const now = performance.now();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    let allDone = true;
    anchors.forEach((a, i) => {
      const r = reactivations.find((x) => x.businessUnitId === a.businessUnitId);
      const e = r ? (now - r.startedAt) / 1000 : 10;
      // grow 0-0.8s, hold, shrink 1.2-2.6s
      let s = 0;
      if (e < 0.8) s = e / 0.8;
      else if (e < 1.2) s = 1;
      else if (e < 2.6) s = 1 - (e - 1.2) / 1.4;
      if (e < 2.8) allDone = false;
      s = Math.max(0.0001, s);
      sc.set(s, s, s);
      m.compose(a.position, q, sc);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (allDone) {
      const ids = new Set(anchors.map((a) => a.businessUnitId));
      ids.forEach((id) => completeReactivation(id));
    }
  });

  if (anchors.length === 0) return null;
  return <instancedMesh key={anchors.length} ref={meshRef} args={[geometry, material, anchors.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Selection ring — non-colour indicator for the selected leaf         */
/* ------------------------------------------------------------------ */

export function SelectionRing({ skeleton }: { skeleton: TreeSkeleton }) {
  const selectedProspectId = useTerritoryStore((s) => s.selectedProspectId);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const ref = useRef<THREE.Mesh>(null);
  const anchor = selectedProspectId ? skeleton.leaves.find((l) => l.prospectId === selectedProspectId) : null;
  const p = selectedProspectId ? prospectsById[selectedProspectId] : null;
  const onBranch = anchor && p && p.relationshipStatus !== "meeting";

  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh || !anchor) return;
    // Centre the ring on the blade, which extends from the anchor along the
    // leaf's local +Y after the status droop is applied about the hinge.
    const droop = Math.max(0, statusRank(p?.relationshipStatus ?? "unworked")) * 0.13;
    const hinge = new THREE.Quaternion().setFromAxisAngle(anchor.hinge, -droop);
    const stem = new THREE.Vector3(0, 1, 0).applyQuaternion(anchor.quaternion).applyQuaternion(hinge);
    mesh.position.copy(anchor.position).addScaledVector(stem, 0.42 * anchor.scale * 1.45);
    mesh.quaternion.copy(camera.quaternion);
    const pulse = 1 + Math.sin(performance.now() * 0.003) * 0.04;
    mesh.scale.setScalar(anchor.scale * pulse * 1.9);
  });

  if (!onBranch) return null;
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.95, 1.02, 48]} />
      <meshBasicMaterial color="#e8dfd2" transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
  );
}
