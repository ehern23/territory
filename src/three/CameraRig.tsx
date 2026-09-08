"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { accountPosition, terrainHeight } from "./layout";
import { getTreeModel } from "./useTreeModel";

/**
 * Camera state machine.
 *
 * Conceptual states: FOREST → ACCOUNT → BRANCH → PROSPECT, plus ROOTS.
 * Every transition is a smooth setLookAt so the user never teleports and
 * always keeps the current azimuth where it makes sense (spatial coherence).
 */

const FOREST_TARGET = new THREE.Vector3(
  8,
  9 + terrainHeight(8, 14),
  14,
);

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
  const selectedIsMeeting = useTerritoryStore(
    (s) => !!s.selectedProspectId && s.prospectsById[s.selectedProspectId]?.relationshipStatus === "meeting",
  );

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
      focusBusinessUnitId,
      focusTeamId,
      selectedProspectId,
      selectedOpportunityId,
      view,
      aspect,
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
    const distance = shot.sheetOpen ? shot.distance * (shot.sheetScale ?? 1.2) : shot.distance;
    const offset = new THREE.Vector3().setFromSphericalCoords(distance, polar, azimuth);
    const target = shot.target.clone();

    if (shot.sheetOpen) {
      // Bottom sheet covers roughly the lower half: lift the subject into the
      // visible upper region.
      const visibleHalfHeight = Math.tan(THREE.MathUtils.degToRad(42 / 2)) * distance;
      target.y -= visibleHalfHeight * 0.42;
    }

    if (shot.panelOffset !== 0) {
      // Shift the composition so the subject sits left of a right-hand panel.
      const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
      const visibleHalfWidth = Math.tan(THREE.MathUtils.degToRad(42 / 2)) * distance * aspect;
      target.addScaledVector(right, visibleHalfWidth * shot.panelOffset);
    }
    const position = target.clone().add(offset);

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
    isDesktop,
    reducedMotion,
    selectedIsMeeting,
    isCompact,
    navigatorOpen,
    forestCardOpen,
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
  focusBusinessUnitId: string | null;
  focusTeamId: string | null;
  selectedProspectId: string | null;
  selectedOpportunityId: string | null;
  view: string;
  aspect: number;
  isDesktop: boolean;
  prospectStatus?: string;
  sheetOpen?: boolean;
}

function computeShot(input: ShotInput): Shot | null {
  const { aspect, isDesktop } = input;
  const af = aspectFactor(aspect);

  if (input.mode === "forest" || !input.activeAccountId) {
    return {
      target: FOREST_TARGET,
      distance: 92 * Math.min(af, 1.22),
      polar: isDesktop ? 1.44 : 1.28,
      azimuth: 0.22,
      minDistance: 36,
      maxDistance: 420,
      minPolar: 0.85,
      maxPolar: 1.54,
      panelOffset: 0,
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
  const panel = isDesktop ? 0.3 : 0;

  // Frame the whole crown: vertical half-FOV is 21°, so the distance that
  // fits `top` with a little headroom is roughly (top / 2) / tan(21°).
  const fitHeight = (top * 0.84) / Math.tan(THREE.MathUtils.degToRad(21));
  const fitWidth = (skeleton.canopyRadius * 1.15) / Math.tan(THREE.MathUtils.degToRad(21)) / Math.max(aspect * (1 - panel), 0.5);

  const accountShot: Shot = {
    target: base.clone().add(new THREE.Vector3(0, top * 0.42, 0)),
    distance: Math.max(fitHeight * Math.min(af, 1.25), fitWidth) * 1.12,
    sheetOpen: input.sheetOpen,
    polar: 1.4,
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
      return {
        ...accountShot,
        target: base.clone().add(anchor.position),
        distance: 13 * Math.min(af, 1.4),
        polar: 1.35,
        azimuth: Math.atan2(outward.x, outward.z),
        panelOffset: panel,
      };
    }
  }

  if (input.selectedProspectId) {
    const anchor = skeleton.leaves.find((l) => l.prospectId === input.selectedProspectId);
    if (anchor) {
      if (input.prospectStatus === "meeting") {
        // Pull back so the fall from branch to base stays in frame, then the marker.
        return {
          ...accountShot,
          target: base.clone().add(new THREE.Vector3(0, H * 0.3, 0)),
          distance: Math.max(H * 0.95, 18) * Math.min(af, 1.5),
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
      return {
        ...accountShot,
        target: base.clone().add(bladeCentre),
        distance: 15 * Math.min(af, 1.4),
        polar: THREE.MathUtils.clamp(Math.acos(normal.y), 1.15, 1.5),
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
        distance: Math.max(frame.length * 2.6, 14) * Math.min(af, 1.6),
        polar: 1.3,
        azimuth: Math.atan2(frame.outward.x, frame.outward.z) + 0.9,
        panelOffset: panel,
      };
    }
  }

  if (input.focusBusinessUnitId) {
    const frame = skeleton.buFrames[input.focusBusinessUnitId];
    if (frame) {
      return {
        ...accountShot,
        target: base.clone().add(frame.centroid),
        distance: Math.max(frame.length * 2.7, 22) * Math.min(af, 1.7),
        polar: 1.27,
        azimuth: Math.atan2(frame.outward.x, frame.outward.z) + 0.95,
        panelOffset: panel,
      };
    }
  }

  return accountShot;
}
