"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { accountPosition, FOREST_CENTER, terrainHeight } from "./layout";
import { getAccountTree } from "./flora/accountTrees";
import { floraDebug } from "./flora/floraMaterials";

/**
 * Camera direction.
 *
 * Load: a single establishing move — from high above the treeline, down and
 * across the meadow to the overview. Afterwards every state change (account,
 * business unit, fruit, back to forest) is one smooth glide, keeping the
 * current azimuth where that preserves orientation. Idle in the overview, the
 * camera drifts almost imperceptibly so the forest never looks frozen.
 */

const FOV = 38;
const INTRO_SECONDS = 7.5;

interface Shot {
  target: THREE.Vector3;
  distance: number;
  polar: number;
  azimuth?: number;
  minDistance: number;
  maxDistance: number;
}

function overviewShot(aspect: number): Shot {
  const portrait = aspect < 0.9;
  // On desktop the territory panel sits on the left: push the forest right.
  const shift = portrait ? 0 : -78;
  return {
    target: new THREE.Vector3(FOREST_CENTER.x + 6 + shift, 10 + terrainHeight(FOREST_CENTER.x, FOREST_CENTER.z), FOREST_CENTER.z - 18 + shift * 0.3),
    distance: portrait ? 430 : aspect < 1.3 ? 380 : 340,
    polar: portrait ? 1.0 : 1.06,
    azimuth: 0.32,
    minDistance: 60,
    maxDistance: 620,
  };
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraDirector() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const selectedOpportunityId = useTerritoryStore((s) => s.selectedOpportunityId);
  const cameraNonce = useTerritoryStore((s) => s.cameraNonce);
  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const introDone = useTerritoryStore((s) => s.introDone);
  const setIntroDone = useTerritoryStore((s) => s.setIntroDone);
  const demoActive = useTerritoryStore((s) => s.demo.active);

  const intro = useRef<{ t: number; from: Shot; to: Shot } | null>(null);
  const lastInput = useRef(performance.now());

  // Controls configuration.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.smoothTime = 0.85;
    c.draggingSmoothTime = 0.14;
    c.dollySpeed = 0.6;
    c.azimuthRotateSpeed = 0.55;
    c.polarRotateSpeed = 0.5;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.46;
    c.mouseButtons.right = CameraControlsImpl.ACTION.TRUCK;
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-260, -5, -300), new THREE.Vector3(270, 120, 140)));
    c.boundaryEnclosesCamera = false;
    const mark = () => {
      lastInput.current = performance.now();
    };
    c.addEventListener("controlstart", mark);
    return () => c.removeEventListener("controlstart", mark);
  }, []);

  // Establishing shot.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const to = overviewShot(aspect);
    if (introDone || reducedMotion) {
      applyShot(c, to, false);
      if (!introDone) setIntroDone();
      return;
    }
    const from: Shot = {
      target: new THREE.Vector3(FOREST_CENTER.x - 40, 60, FOREST_CENTER.z - 120),
      distance: 640,
      polar: 0.72,
      azimuth: -0.55,
      minDistance: 10,
      maxDistance: 2000,
    };
    applyShot(c, from, false, true);
    intro.current = { t: 0, from, to };
    c.enabled = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    const c = controlsRef.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.05);
    const run = intro.current;
    if (run) {
      run.t += dt / INTRO_SECONDS;
      const k = easeInOut(Math.min(1, run.t));
      const target = run.from.target.clone().lerp(run.to.target, k);
      const distance = THREE.MathUtils.lerp(run.from.distance, run.to.distance, k);
      const polar = THREE.MathUtils.lerp(run.from.polar, run.to.polar, k);
      const azimuth = THREE.MathUtils.lerp(run.from.azimuth ?? 0, run.to.azimuth ?? 0, k);
      const pos = new THREE.Vector3().setFromSphericalCoords(distance, polar, azimuth).add(target);
      void c.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, false);
      if (run.t >= 1) {
        intro.current = null;
        c.enabled = true;
        applyShot(c, run.to, false, true);
        setIntroDone();
      }
      return;
    }
    // Idle drift in the overview.
    if (mode === "forest" && !reducedMotion && performance.now() - lastInput.current > 14000) {
      c.azimuthAngle += dt * (demoActive ? 0.03 : 0.012);
    }
  });

  // Skip the intro on the first interaction.
  useEffect(() => {
    if (introDone && intro.current) {
      const c = controlsRef.current;
      const to = intro.current.to;
      intro.current = null;
      if (c) {
        c.enabled = true;
        applyShot(c, to, true, true);
      }
    }
  }, [introDone]);

  // State-driven shots.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || intro.current) return;
    lastInput.current = performance.now();
    const shot = computeShot({
      mode,
      activeAccountId,
      focusBusinessUnitId,
      selectedOpportunityId,
      aspect,
      isCompact,
      currentAzimuth: c.azimuthAngle,
    });
    applyShot(c, shot, !reducedMotion && !floraDebug.settle, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeAccountId, focusBusinessUnitId, selectedOpportunityId, cameraNonce, aspect, isCompact, reducedMotion]);

  return <CameraControls ref={controlsRef} makeDefault />;
}

function applyShot(c: CameraControlsImpl, shot: Shot, animate: boolean, setLimits = false) {
  if (setLimits) {
    c.minDistance = shot.minDistance;
    c.maxDistance = shot.maxDistance;
  }
  const azimuth = shot.azimuth ?? c.azimuthAngle;
  const pos = new THREE.Vector3().setFromSphericalCoords(shot.distance, shot.polar, azimuth).add(shot.target);
  void c.setLookAt(pos.x, pos.y, pos.z, shot.target.x, shot.target.y, shot.target.z, animate);
}

interface ShotInput {
  mode: "forest" | "account";
  activeAccountId: string | null;
  focusBusinessUnitId: string | null;
  selectedOpportunityId: string | null;
  aspect: number;
  isCompact: boolean;
  currentAzimuth: number;
}

function computeShot(input: ShotInput): Shot {
  const { aspect, isCompact } = input;
  if (input.mode === "forest" || !input.activeAccountId) return overviewShot(aspect);

  const model = getAccountTree(input.activeAccountId);
  const base = accountPosition(input.activeAccountId);
  if (!model) return overviewShot(aspect);
  const { shape } = model;
  const vHalf = THREE.MathUtils.degToRad(FOV / 2);

  // Approach from the overview side, swung slightly toward the sun-lit flank.
  const fromOverview = Math.atan2(base.x - FOREST_CENTER.x, base.z - FOREST_CENTER.z + 260);
  const azimuth = THREE.MathUtils.clamp(fromOverview * 0.6 + 0.25, -0.9, 1.1);

  const crownH = shape.crownTop;
  const fitH = (crownH * 0.62) / Math.tan(vHalf);
  const width = Math.max(shape.crownRadii.x, shape.crownRadii.z) * 2.3;
  // Desktop: a side panel takes ~420px on the right; frame into the remaining width.
  const usable = isCompact ? 1 : 0.68;
  const fitW = width / 2 / (Math.tan(vHalf) * aspect * usable);
  let distance = Math.max(fitH, fitW) * 1.05;
  const target = base.clone().add(new THREE.Vector3(0, crownH * 0.46, 0));
  if (isCompact) {
    // Bottom sheet covers the lower ~45%: lift the subject and step back.
    distance *= 1.25;
    target.y -= Math.tan(vHalf) * distance * 0.38;
  } else {
    // Shift the subject left of the side panel.
    const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
    target.addScaledVector(right, Math.tan(vHalf) * distance * aspect * 0.3);
  }
  const account: Shot = {
    target,
    distance,
    polar: 1.36,
    azimuth,
    minDistance: 14,
    maxDistance: distance * 2.4,
  };

  const offsetForPanel = (t: THREE.Vector3, d: number, az: number) => {
    if (isCompact) {
      t.y -= Math.tan(vHalf) * d * 0.38;
      return;
    }
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    t.addScaledVector(right, Math.tan(vHalf) * d * aspect * 0.3);
  };

  if (input.selectedOpportunityId) {
    const hang = model.fruitHang[input.selectedOpportunityId];
    if (hang) {
      const outward = new THREE.Vector3(hang.x, 0, hang.z).normalize();
      const az = Math.atan2(outward.x, outward.z) + 0.3;
      const d = isCompact ? 52 : 42;
      const t = base.clone().add(hang).add(new THREE.Vector3(0, -3, 0));
      offsetForPanel(t, d, az);
      return { ...account, target: t, distance: d, polar: 1.42, azimuth: az };
    }
  }

  if (input.focusBusinessUnitId) {
    const limbIndex = model.limbIds.indexOf(input.focusBusinessUnitId);
    const frame = model.shape.limbs[limbIndex];
    if (frame) {
      const az = Math.atan2(frame.outward.x, frame.outward.z) + 0.75;
      const d = Math.max(frame.length * 2.3, 30) * (isCompact ? 1.25 : 1);
      const t = base.clone().add(frame.centroid);
      offsetForPanel(t, d, az);
      return { ...account, target: t, distance: d, polar: 1.25, azimuth: az };
    }
  }

  return account;
}
