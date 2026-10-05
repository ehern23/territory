"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { statusRank } from "@/domain/relationship";
import { isWorked } from "@/domain/relationship";
import { seededRng } from "@/lib/random";
import type { TreeSkeleton } from "./treeGen";
import { getLeafGeometry } from "./treeGeometry";
import { DORMANT_LEAF_COLOR, LEAF_COLORS, NEW_LEAF_COLOR } from "./palette";
import { emphasisFor } from "./emphasis";
import { createLeafMaterial } from "./materials";

interface LeavesProps {
  skeleton: TreeSkeleton;
  active: boolean;
  /** Animated global scale multiplier (forest LOD uses larger leaves for legibility). */
  sizeScaleRef: React.RefObject<number>;
  /** 0 = full presence, 1 = fully quieted (used for non-selected forest trees). */
  dim: number;
}

/**
 * Every stakeholder is one leaf tuft: a primary blade plus a loose rosette of
 * smaller blades on the same twig. The tuft shares colour and state, so the
 * metaphor (one leaf = one person) holds while the canopy reads as foliage
 * rather than a handful of specks.
 */
export const CLUSTER = 26;

const QUIET = new THREE.Color("#2b2c31");
const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpQuat2 = new THREE.Quaternion();
const tmpQuat3 = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

interface LeafTarget {
  scale: number;
  droop: number;
  color: THREE.Color;
  /** index into skeleton.leaves whose prospect was latent in the original data */
  originallyLatent: boolean;
}

interface Satellite {
  /** Offset in the leaf's local frame (x = hinge, y = stem, z = normal), in leaf units. */
  offset: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: number;
  shade: number;
}

export function Leaves({ skeleton, active, sizeScaleRef, dim }: LeavesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const leafCount = skeleton.leaves.length;
  const count = leafCount * CLUSTER;
  const geometry = getLeafGeometry();

  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const businessUnitsById = useTerritoryStore((s) => s.businessUnitsById);
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const focusBusinessUnitId = useTerritoryStore((s) => (active ? s.focusBusinessUnitId : null));
  const focusTeamId = useTerritoryStore((s) => (active ? s.focusTeamId : null));
  const selectedProspectId = useTerritoryStore((s) => (active ? s.selectedProspectId : null));
  const view = useTerritoryStore((s) => (active ? s.view : "tree"));
  const fallingLeaves = useTerritoryStore((s) => s.fallingLeaves);
  const reactivations = useTerritoryStore((s) => s.reactivations);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);

  const originallyLatent = useMemo(() => {
    const account = accountsById[skeleton.accountId];
    const set = new Set<string>();
    account?.businessUnits.forEach((bu) =>
      bu.teams.forEach((t) => t.prospects.forEach((p) => p.latent && set.add(p.id))),
    );
    return set;
  }, [accountsById, skeleton.accountId]);

  // Deterministic rosette of leaflets around each primary leaf.
  const satellites = useMemo<Satellite[][]>(
    () =>
      skeleton.leaves.map((leaf) => {
        const rng = seededRng(skeleton.seed, leaf.prospectId, "cluster");
        const list: Satellite[] = [];
        for (let j = 1; j < CLUSTER; j++) {
          // Blades fan out from a point just up the twig, in a flattened
          // ellipsoid; each is rotated toward its own offset so the tuft has
          // volume instead of reading as a stack of parallel planes.
          const u = (j - 1) / (CLUSTER - 2);
          const phi = u * Math.PI * 2 * 1.618 + rng.gauss() * 0.4;
          const ring = Math.sqrt(rng.range(0.15, 1));
          const offset = new THREE.Vector3(
            Math.cos(phi) * ring * 0.82,
            0.2 + Math.sin(phi) * ring * 0.58 + rng.range(-0.12, 0.14),
            rng.range(-0.46, 0.5),
          );
          const yaw = Math.atan2(offset.x, 0.6) + rng.gauss() * 0.35;
          const pitch = -Math.atan2(offset.y - 0.25, 0.6) * 0.8 + rng.gauss() * 0.3;
          const roll = rng.gauss() * 0.45;
          const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
          list.push({
            offset,
            rotation,
            scale: rng.range(0.5, 0.85),
            shade: rng.range(0.74, 0.96),
          });
        }
        return list;
      }),
    [skeleton.leaves, skeleton.seed],
  );

  const targets = useMemo<LeafTarget[]>(() => {
    const focus = { focusBusinessUnitId, focusTeamId, view };
    return skeleton.leaves.map((leaf) => {
      const p = prospectsById[leaf.prospectId];
      const bu = businessUnitsById[leaf.businessUnitId];
      const status = p?.relationshipStatus ?? "unworked";
      const falling = fallingLeaves.some((f) => f.prospectId === leaf.prospectId);
      const gone = !p || p.latent || (status === "meeting" && !falling) || falling;

      const color = new THREE.Color().copy(LEAF_COLORS[status]);
      if (bu?.status === "dormant") {
        color.lerp(DORMANT_LEAF_COLOR, 0.88);
      } else if (bu?.status === "reactivating" && originallyLatent.has(leaf.prospectId) && status === "unworked") {
        color.copy(NEW_LEAF_COLOR);
      }

      let emphasis = emphasisFor(focus, leaf.businessUnitId, leaf.teamId);
      if (view === "penetration") {
        emphasis = isWorked(status) ? 1 : 0.28;
      } else if (view === "roots") {
        emphasis = Math.min(emphasis, 0.55);
      }
      color.lerp(QUIET, Math.max((1 - emphasis) * 0.78, dim * 0.7));

      let scale = leaf.scale * (0.82 + 0.18 * emphasis);
      // Relationships that have been worked grow a little, so progression is
      // findable inside a full crown before any branch is opened.
      if (active && bu?.status !== "dormant") scale *= 1 + Math.max(0, statusRank(status)) * 0.09;
      if (status === "disqualified") scale *= 0.7;
      if (bu?.status === "dormant") scale *= 0.68;
      if (selectedProspectId === leaf.prospectId) scale *= 1.45;
      if (gone) scale = 0;

      const rank = Math.max(0, statusRank(status));
      const droop = status === "disqualified" ? 1.05 : rank * 0.13 + (bu?.status === "dormant" ? 0.72 : 0);

      return { scale, droop, color, originallyLatent: originallyLatent.has(leaf.prospectId) };
    });
  }, [
    skeleton.leaves,
    prospectsById,
    businessUnitsById,
    focusBusinessUnitId,
    focusTeamId,
    view,
    selectedProspectId,
    fallingLeaves,
    originallyLatent,
    dim,
    active,
  ]);

  // Current animated state, per primary leaf.
  const current = useRef<{ scale: Float32Array; droop: Float32Array; color: Float32Array } | null>(null);
  if (!current.current || current.current.scale.length !== leafCount) {
    const scale = new Float32Array(leafCount);
    const droop = new Float32Array(leafCount);
    const color = new Float32Array(leafCount * 3);
    targets.forEach((t, i) => {
      scale[i] = t.scale;
      droop[i] = t.droop;
      color[i * 3] = t.color.r;
      color[i * 3 + 1] = t.color.g;
      color[i * 3 + 2] = t.color.b;
    });
    current.current = { scale, droop, color };
  }

  const material = useMemo(() => createLeafMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  const writeColor = (mesh: THREE.InstancedMesh, i: number, r: number, g: number, b: number) => {
    tmpColor.setRGB(r, g, b);
    mesh.setColorAt(i * CLUSTER, tmpColor);
    const sats = satellites[i];
    for (let j = 1; j < CLUSTER; j++) {
      const shade = sats[j - 1].shade;
      tmpColor.setRGB(r * shade, g * shade, b * shade);
      mesh.setColorAt(i * CLUSTER + j, tmpColor);
    }
  };

  // The instanced mesh is recreated whenever its geometry or count changes, and
  // a fresh instance colour buffer is white. Track the mesh we last painted so
  // every instance is written on its first frame.
  const paintedMesh = useRef<THREE.InstancedMesh | null>(null);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    const cur = current.current;
    if (!mesh || !cur) return;
    const k = 1 - Math.exp(-dt * 5.5);
    const now = performance.now();
    const globalScale = sizeScaleRef.current ?? 1;
    let colorDirty = false;

    if (paintedMesh.current !== mesh) {
      for (let i = 0; i < leafCount; i++) {
        writeColor(mesh, i, cur.color[i * 3], cur.color[i * 3 + 1], cur.color[i * 3 + 2]);
      }
      paintedMesh.current = mesh;
      colorDirty = true;
    }

    for (let i = 0; i < leafCount; i++) {
      const leaf = skeleton.leaves[i];
      const t = targets[i];

      // Spring growth for newly surfaced leaves.
      let growth = 1;
      if (t.originallyLatent) {
        const r = reactivations.find((x) => x.businessUnitId === leaf.businessUnitId);
        if (r) {
          const e = (now - r.startedAt - 900) / 1700;
          growth = e <= 0 ? 0 : e >= 1 ? 1 : 1 - Math.pow(1 - e, 3);
        }
      }
      const targetScale = t.scale * growth;

      cur.scale[i] += (targetScale - cur.scale[i]) * k;
      cur.droop[i] += (t.droop - cur.droop[i]) * k;
      const r0 = cur.color[i * 3];
      const g0 = cur.color[i * 3 + 1];
      const b0 = cur.color[i * 3 + 2];
      const dr = t.color.r - r0;
      const dg = t.color.g - g0;
      const db = t.color.b - b0;
      if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) > 0.0015) {
        cur.color[i * 3] = r0 + dr * k;
        cur.color[i * 3 + 1] = g0 + dg * k;
        cur.color[i * 3 + 2] = b0 + db * k;
        writeColor(mesh, i, cur.color[i * 3], cur.color[i * 3 + 1], cur.color[i * 3 + 2]);
        colorDirty = true;
      }

      // Gentle idle sway, scaled by how "alive" the leaf is.
      const sway = Math.sin(now * 0.0011 + i * 1.7) * 0.035 * (active ? 1 : 0.5);
      tmpQuat.setFromAxisAngle(leaf.hinge, -cur.droop[i] + sway);
      tmpQuat2.copy(tmpQuat).multiply(leaf.quaternion);
      const s = Math.max(0.0001, cur.scale[i] * globalScale);

      tmpScale.set(s, s, s);
      tmpMatrix.compose(leaf.position, tmpQuat2, tmpScale);
      mesh.setMatrixAt(i * CLUSTER, tmpMatrix);

      const sats = satellites[i];
      for (let j = 1; j < CLUSTER; j++) {
        const sat = sats[j - 1];
        tmpPos.copy(sat.offset).multiplyScalar(s).applyQuaternion(tmpQuat2).add(leaf.position);
        tmpQuat3.copy(tmpQuat2).multiply(sat.rotation);
        const ss = s * sat.scale;
        tmpScale.set(ss, ss, ss);
        tmpMatrix.compose(tmpPos, tmpQuat3, tmpScale);
        mesh.setMatrixAt(i * CLUSTER + j, tmpMatrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!active) return;
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const i = Math.floor(e.instanceId / CLUSTER);
    const leaf = skeleton.leaves[i];
    const p = prospectsById[leaf.prospectId];
    if (!p || p.latent || current.current!.scale[i] < 0.05) return;
    selectProspect(leaf.prospectId);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      onClick={active ? handleClick : undefined}
      onPointerOver={active ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={active ? () => { document.body.style.cursor = ""; } : undefined}
    />
  );
}
