"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { accountPosition, terrainHeight } from "./layout";
import { getTreeModel } from "./useTreeModel";
import { canopyClearing } from "./Canopy";
import { meetingSlot } from "./treeGen";

/**
 * Camera state machine.
 *
 * Conceptual states: FOREST → ACCOUNT → BRANCH → PROSPECT, plus ROOTS.
 * Every transition is a smooth setLookAt so the user never teleports and
 * always keeps the current azimuth where it makes sense (spatial coherence).
 */

const FOREST_TARGET = new THREE.Vector3(
  14,
  26 + terrainHeight(14, -80),
  -80,
);

/** Sight-line clearing radius for the inspected subject (0 = whole-crown view). */
function clearingRadius(s: {
  mode: string;
  view: string;
  selectedProspectId: string | null;
  selectedOpportunityId: string | null;
  focusTeamId: string | null;
  focusBusinessUnitId: string | null;
}) {
  if (s.mode !== "account" || s.view !== "tree") return 0;
  if (s.selectedProspectId) return 5.5;
  if (s.selectedOpportunityId) return 5;
  if (s.focusTeamId) return 12;
  if (s.focusBusinessUnitId) return 20;
  return 0;
}

interface Shot {
  target: THREE.Vector3;
  distance: number;
  polar: number;
  /** azimuth in radians; undefined keeps the current azimuth */
  azimuth?: number;
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
  /** Shift target sideways (screen-right) so it is not hidden by a side panel. */
  panelOffset: number;
  /** Compact layouts: a bottom sheet covers the lower half, so the subject moves up. */
  sheetOpen?: boolean;
  /** Extra pull-back applied when the sheet is open (default 1.2). */
  sheetScale?: number;
  /** Keep the eye at least this far (horizontally) from the tree axis, outside the crown. */
  outside?: { centre: THREE.Vector3; radius: number };
}

function aspectFactor(aspect: number, strength = 0.7) {
  return THREE.MathUtils.clamp(Math.pow(1.35 / aspect, strength), 1, 2.1);
}

export function CameraRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const isDesktop = aspect > 1.05;

  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusTeamId = useTerritoryStore((s) => s.focusTeamId);
  const selectedProspectId = useTerritoryStore((s) => s.selectedProspectId);
  const selectedOpportunityId = useTerritoryStore((s) => s.selectedOpportunityId);
  const view = useTerritoryStore((s) => s.view);
  const cameraResetNonce = useTerritoryStore((s) => s.cameraResetNonce);
  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const navigatorOpen = useTerritoryStore((s) => s.navigatorOpen);
  const forestCardOpen = useTerritoryStore((s) => !!s.selectedAccountId || !!s.selectedMarketId);
  const selectedAccountId = useTerritoryStore((s) => (s.mode === "forest" ? s.selectedAccountId : null));
  const selectedIsMeeting = useTerritoryStore(
    (s) => !!s.selectedProspectId && s.prospectsById[s.selectedProspectId]?.relationshipStatus === "meeting",
  );

  const subject = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    canopyClearing.target.value.lerp(subject.current, reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
    const goal = clearingRadius(useTerritoryStore.getState());
    const r = canopyClearing.radius;
    r.value = reducedMotion ? goal : r.value + (goal - r.value) * (1 - Math.exp(-dt * 5));
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    controls.mouseButtons.middle = CameraControlsImpl.ACTION.NONE;
    controls.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY;
    controls.touches.three = CameraControlsImpl.ACTION.NONE;
    controls.smoothTime = 0.55;
    controls.draggingSmoothTime = 0.12;
    controls.dollySpeed = 0.7;
    controls.azimuthRotateSpeed = 0.7;
    controls.polarRotateSpeed = 0.7;
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const shot = computeShot({
      mode,
      activeAccountId,
      selectedAccountId,
      focusBusinessUnitId,
      focusTeamId,
      selectedProspectId,
      selectedOpportunityId,
      view,
      aspect,
      width: size.width,
      isDesktop,
      prospectStatus: selectedIsMeeting ? "meeting" : undefined,
      sheetOpen:
        isCompact &&
        (mode === "forest"
          ? forestCardOpen
          : view !== "tree" || !!selectedProspectId || !!selectedOpportunityId || !!focusBusinessUnitId || navigatorOpen),
    });
    if (!shot) return;

    const azimuth = shot.azimuth ?? controls.azimuthAngle;
    const polar = THREE.MathUtils.clamp(shot.polar, shot.minPolar, shot.maxPolar);
    let distance = shot.sheetOpen ? shot.distance * (shot.sheetScale ?? 1.2) : shot.distance;
    if (shot.outside) {
      // Solve |subject + d·dir − centre|² = r² on the horizontal plane for the
      // smallest d that puts the eye outside the crown.
      const dir = new THREE.Vector3().setFromSphericalCoords(1, polar, azimuth);
      const rel = shot.target.clone().sub(shot.outside.centre);
      const a = dir.x * dir.x + dir.z * dir.z;
      const b = 2 * (rel.x * dir.x + rel.z * dir.z);
      const c = rel.x * rel.x + rel.z * rel.z - shot.outside.radius * shot.outside.radius;
      const disc = b * b - 4 * a * c;
      if (a > 1e-4 && disc > 0) distance = Math.max(distance, (-b + Math.sqrt(disc)) / (2 * a));
    }
    subject.current.copy(shot.target);
    const offset = new THREE.Vector3().setFromSphericalCoords(distance, polar, azimuth);
    const target = shot.target.clone();

    if (shot.sheetOpen) {
      // Bottom sheet covers roughly the lower half: lift the subject into the
      // visible upper region.
      const visibleHalfHeight = Math.tan(THREE.MathUtils.degToRad(44 / 2)) * distance;
      target.y -= visibleHalfHeight * 0.42;
    }

    if (shot.panelOffset !== 0) {
      // Shift the composition so the subject sits left of a right-hand panel.
      const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
      const visibleHalfWidth = Math.tan(THREE.MathUtils.degToRad(44 / 2)) * distance * aspect;
      target.addScaledVector(right, visibleHalfWidth * shot.panelOffset);
    }
    const position = target.clone().add(offset);
    position.y = Math.max(position.y, terrainHeight(position.x, position.z) + 2.5);
    controls.minDistance = shot.minDistance;
    controls.maxDistance = shot.maxDistance;
    controls.minPolarAngle = shot.minPolar;
    controls.maxPolarAngle = shot.maxPolar;
    void controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, !reducedMotion);
  }, [
    mode,
    activeAccountId,
    focusBusinessUnitId,
    focusTeamId,
    selectedProspectId,
    selectedOpportunityId,
    view,
    cameraResetNonce,
    aspect,
    size.width,
    isDesktop,
    reducedMotion,
    selectedIsMeeting,
    isCompact,
    navigatorOpen,
    forestCardOpen,
    selectedAccountId,
  ]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.35}
      draggingSmoothTime={0.18}
      mouseButtons={{
        left: CameraControlsImpl.ACTION.ROTATE,
        middle: CameraControlsImpl.ACTION.DOLLY,
        right: CameraControlsImpl.ACTION.NONE,
        wheel: CameraControlsImpl.ACTION.DOLLY,
      }}
      touches={{
        one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
        two: CameraControlsImpl.ACTION.TOUCH_DOLLY,
        three: CameraControlsImpl.ACTION.NONE,
      }}
    />
  );
}

interface ShotInput {
  mode: "forest" | "account";
  activeAccountId: string | null;
  selectedAccountId: string | null;
  focusBusinessUnitId: string | null;
  focusTeamId: string | null;
  selectedProspectId: string | null;
  selectedOpportunityId: string | null;
  view: string;
  aspect: number;
  width: number;
  isDesktop: boolean;
  prospectStatus?: string;
  sheetOpen?: boolean;
}

function computeShot(input: ShotInput): Shot | null {
  const { aspect, isDesktop } = input;
  const af = aspectFactor(aspect);

  if (input.mode === "forest" || !input.activeAccountId) {
    // Three-quarter aerial: rows of the territory separate vertically, the
    // horizon and sun stay in frame, and the front tree does not hide the rest.
    // On desktop the preview card covers the lower left (460px + 28px margin),
    // so a selected tree is composed in the open frame to its right.
    const preview = isDesktop && input.selectedAccountId ? accountPosition(input.selectedAccountId) : null;
    return {
      target: preview ? new THREE.Vector3(preview.x, FOREST_TARGET.y, preview.z) : FOREST_TARGET,
      distance: 290 * Math.min(af, isDesktop ? 1.16 : 2.05) * (preview ? 0.78 : 1),
      polar: isDesktop ? 1.36 : 1.18,
      azimuth: 0.27,
      minDistance: 48,
      maxDistance: 620,
      minPolar: 0.7,
      maxPolar: 1.5,
      panelOffset: preview ? -Math.min(0.4, 488 / Math.max(input.width, 1)) : 0,
      sheetOpen: input.sheetOpen,
      sheetScale: 1,
    };
  }

  const model = getTreeModel(input.activeAccountId, "full");
  if (!model) return null;
  const base = accountPosition(input.activeAccountId);
  const { skeleton } = model;
  const H = skeleton.height;
  const top = skeleton.crownTop;
  // Side panel (372px + 20px margin): centre the subject in the remaining width.
  const panel = isDesktop ? Math.min(0.34, 392 / Math.max(input.width, 1)) : 0;

  // Frame the whole crown: vertical half-FOV is 21°, so the distance that
  // fits `top` with a little headroom is roughly (top / 2) / tan(21°).
  const fitHeight = (top * 0.62) / Math.tan(THREE.MathUtils.degToRad(22));
  const fitWidth = (skeleton.canopyRadius * 1.15) / Math.tan(THREE.MathUtils.degToRad(22)) / Math.max(aspect * (1 - panel), 0.5);

  const accountShot: Shot = {
    target: base.clone().add(new THREE.Vector3(0, top * 0.47, 0)),
    distance: Math.max(fitHeight * Math.min(af, 1.25), fitWidth) * 1.04,
    sheetOpen: input.sheetOpen,
    polar: 1.43,
    minDistance: 16,
    maxDistance: H * 4.4,
    minPolar: 0.42,
    maxPolar: 1.54,
    panelOffset: panel,
  };

  if (input.view === "roots") {
    return {
      ...accountShot,
      target: base.clone().add(new THREE.Vector3(0, -H * 0.14, 0)),
      distance: H * 1.38 * af,
      polar: 1.28,
      minDistance: 10,
      maxPolar: 1.56,
      panelOffset: panel,
    };
  }

  if (input.view !== "tree") {
    // Analysis surfaces (analyze, penetration, score, activity) read the whole
    // tree, so the camera pulls back slightly from wherever it was.
    return { ...accountShot, distance: accountShot.distance * 1.08 };
  }

  if (input.selectedOpportunityId) {
    const anchor = skeleton.fruit.find((f) => f.opportunityId === input.selectedOpportunityId);
    if (anchor) {
      const outward = new THREE.Vector3(anchor.position.x, 0, anchor.position.z).normalize();
      const fruitCentre = anchor.position.clone().add(new THREE.Vector3(0, -0.9, 0));
      const distance = 11 * Math.min(af, 1.4);
      // From the side and slightly below: the limb spans the frame and the fruit hangs against open sky.
      const floor = Math.acos(THREE.MathUtils.clamp((3 - fruitCentre.y) / distance, -1, 1));
      return {
        ...accountShot,
        target: base.clone().add(fruitCentre),
        distance,
        polar: Math.min(1.66, floor),
        maxPolar: Math.max(accountShot.maxPolar, Math.min(1.75, floor)),
        azimuth: Math.atan2(outward.x, outward.z) + 0.85,
        panelOffset: panel,
      };
    }
  }

  if (input.selectedProspectId) {
    const anchor = skeleton.leaves.find((l) => l.prospectId === input.selectedProspectId);
    if (anchor) {
      if (input.prospectStatus === "meeting") {
        // Pull back so the fall from branch to base stays in frame, then the marker.
        const slot = meetingSlot(skeleton, input.selectedProspectId).position;
        const span = Math.max(anchor.position.y - slot.y, 6);
        return {
          ...accountShot,
          target: base.clone().add(slot.clone().lerp(anchor.position, 0.45)),
          distance: Math.max(span * 1.75, 18) * Math.min(af, 1.5),
          polar: 1.25,
          azimuth: Math.atan2(anchor.outward.x, anchor.outward.z) + 0.35,
          panelOffset: panel,
        };
      }
      // Look at the blade face-on: the leaf is a flat plane facing local +Z,
      // so viewing along its normal keeps it from being seen edge-on or
      // hidden behind a neighbour.
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.quaternion);
      if (normal.dot(anchor.outward) < 0) normal.negate();
      normal.y = THREE.MathUtils.clamp(normal.y, -0.1, 0.4);
      normal.normalize();
      const stem = new THREE.Vector3(0, 1, 0).applyQuaternion(anchor.quaternion);
      const bladeCentre = anchor.position.clone().addScaledVector(stem, 0.45 * anchor.scale);
      const distance = 15 * Math.min(af, 1.4);
      // Tufts sit on their limb, so any level view runs the wood through them.
      // Looking up from beneath sets the tuft against the sky with the limb behind;
      // the floor keeps the eye a few units above the ground.
      const floor = Math.acos(THREE.MathUtils.clamp((3 - bladeCentre.y) / distance, -1, 1));
      const polar = Math.min(1.8, floor);
      return {
        ...accountShot,
        target: base.clone().add(bladeCentre),
        distance,
        polar,
        maxPolar: Math.max(accountShot.maxPolar, Math.min(1.85, floor)),
        azimuth: Math.atan2(normal.x, normal.z),
        panelOffset: panel,
      };
    }
  }

  if (input.focusTeamId) {
    const frame = skeleton.teamFrames[input.focusTeamId];
    if (frame) {
      // View the team limb from the side so it spans the frame rather than
      // pointing at the camera.
      return {
        ...accountShot,
        target: base.clone().add(frame.centroid),
        distance: Math.max(frame.length * 2.6, 16) * Math.min(af, 1.6),
        polar: 1.24,
        azimuth: Math.atan2(frame.outward.x, frame.outward.z) + 0.6,
        panelOffset: panel,
        outside: { centre: base, radius: skeleton.canopyRadius * 1.1 },
      };
    }
  }

  if (input.focusBusinessUnitId) {
    const frame = skeleton.buFrames[input.focusBusinessUnitId];
    if (frame) {
      return {
        ...accountShot,
        target: base.clone().add(frame.centroid),
        distance: Math.max(frame.length * 2.1, 20) * Math.min(af, 1.7),
        polar: 1.32,
        azimuth: Math.atan2(frame.outward.x, frame.outward.z) + 0.75,
        panelOffset: panel,
        outside: { centre: base, radius: skeleton.canopyRadius * 1.1 },
      };
    }
  }

  return accountShot;
}
