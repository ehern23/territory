"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useExploreStore } from "@/store/useExploreStore";
import { WORLD_CENTER, accountApproachAzimuth, accountPosition, terrainHeight } from "./layout";
import { getAccountTree } from "./flora/accountTrees";
import { floraDebug } from "./flora/floraMaterials";
import { cameraPose } from "./cameraPose";

/**
 * Camera direction.
 *
 * Load: one establishing move that starts low over the stream and rises over
 * the canopy until the whole territory and the ranges behind it are in frame.
 * Afterwards every state change (account, business unit, fruit, a minimap
 * jump, back to the territory) is a single glide. The camera never dips below
 * the ground, Q and E turn the view, and when idle in the overview it
 * drifts almost imperceptibly so the forest never looks frozen.
 */

const FOV = 38;
const INTRO_SECONDS = 9;
const BOUNDS = new THREE.Box3(new THREE.Vector3(-1500, -60, -1750), new THREE.Vector3(1500, 1600, 1350));

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
  // On desktop the territory panel sits on the left: push the territory right.
  const shift = portrait ? 0 : -150;
  return {
    target: new THREE.Vector3(WORLD_CENTER.x + shift, 60, WORLD_CENTER.z - 120),
    distance: portrait ? 1500 : aspect < 1.3 ? 1300 : 1150,
    polar: portrait ? 1.12 : 1.26,
    azimuth: 0.06,
    minDistance: 30,
    maxDistance: 2600,
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
  const flyTarget = useTerritoryStore((s) => s.flyTarget);
  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const introDone = useTerritoryStore((s) => s.introDone);
  const setIntroDone = useTerritoryStore((s) => s.setIntroDone);
  const demoActive = useTerritoryStore((s) => s.demo.active);

  const intro = useRef<{ t: number; from: Shot; to: Shot } | null>(null);
  const lastInput = useRef(performance.now());
  const keys = useRef(new Set<string>());

  // Controls configuration.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.smoothTime = 0.9;
    c.draggingSmoothTime = 0.14;
    c.dollySpeed = 0.7;
    c.dollyToCursor = true;
    c.azimuthRotateSpeed = 0.55;
    c.polarRotateSpeed = 0.5;
    c.truckSpeed = 1.6;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = 1.5;
    c.mouseButtons.right = CameraControlsImpl.ACTION.TRUCK;
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK;
    c.setBoundary(BOUNDS);
    c.boundaryEnclosesCamera = false;
    const mark = () => {
      lastInput.current = performance.now();
    };
    c.addEventListener("controlstart", mark);
    return () => c.removeEventListener("controlstart", mark);
  }, []);

  // Keyboard panning: WASD (arrows stay with the guided demo).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      // W A S D step into explore mode (see ExploreController); Q / E turn the overview.
      if (["q", "e"].includes(k)) keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Establishing shot.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const to = overviewShot(aspect);
    if (introDone || reducedMotion) {
      applyShot(c, to, false, true);
      if (!introDone) setIntroDone();
      return;
    }
    // Just over the canopy, looking down the stream toward the first giant and
    // the mountains beyond.
    const from: Shot = {
      target: new THREE.Vector3(20, terrainHeight(20, 200) + 70, 200),
      distance: 300,
      polar: 1.3,
      azimuth: 0.25,
      minDistance: 10,
      maxDistance: 3000,
    };
    applyShot(c, from, false, true);
    intro.current = { t: 0, from, to };
    c.enabled = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tmp = useRef({ target: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3() });

  useFrame(({ camera }, rawDt) => {
    const c = controlsRef.current;
    if (!c) return;
    // In explore mode the explorer drives the camera.
    if (useExploreStore.getState().active) return;
    const dt = Math.min(rawDt, 0.05);
    c.getTarget(tmp.current.target);
    cameraPose.x = camera.position.x;
    cameraPose.z = camera.position.z;
    cameraPose.targetX = tmp.current.target.x;
    cameraPose.targetZ = tmp.current.target.z;
    cameraPose.yaw = Math.atan2(tmp.current.target.x - camera.position.x, tmp.current.target.z - camera.position.z);
    const run = intro.current;
    if (run) {
      run.t += dt / INTRO_SECONDS;
      const k = easeInOut(Math.min(1, run.t));
      // The rise leads the pull-back, so the camera clears the canopy first.
      const lift = easeInOut(Math.min(1, run.t * 1.4));
      const target = run.from.target.clone().lerp(run.to.target, k);
      const distance = THREE.MathUtils.lerp(run.from.distance, run.to.distance, k);
      const polar = THREE.MathUtils.lerp(run.from.polar, run.to.polar, lift);
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

    // Q / E turn the overview.
    if (keys.current.size > 0 && mode === "forest" && !demoActive) {
      const t = tmp.current;
      c.getTarget(t.target);
      camera.getWorldDirection(t.fwd);
      t.fwd.y = 0;
      t.fwd.normalize();
      t.right.set(-t.fwd.z, 0, t.fwd.x);
      const speed = Math.max(60, c.distance * 0.55) * dt;
      const k = keys.current;
      const mx = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
      const mz = (k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0);
      t.target.addScaledVector(t.right, mx * speed).addScaledVector(t.fwd, mz * speed);
      t.target.clamp(BOUNDS.min, BOUNDS.max);
      void c.moveTo(t.target.x, t.target.y, t.target.z, false);
      if (k.has("q")) c.azimuthAngle -= dt * 0.8;
      if (k.has("e")) c.azimuthAngle += dt * 0.8;
      lastInput.current = performance.now();
    }

    // Never below the ground.
    const ground = terrainHeight(camera.position.x, camera.position.z) + 4;
    if (camera.position.y < ground) {
      c.getTarget(tmp.current.target);
      void c.setLookAt(camera.position.x, ground, camera.position.z, tmp.current.target.x, tmp.current.target.y, tmp.current.target.z, false);
    }

    // Idle drift in the overview.
    if (mode === "forest" && !reducedMotion && performance.now() - lastInput.current > 14000) {
      c.azimuthAngle += dt * (demoActive ? 0.02 : 0.008);
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
    const shot = computeShot({ mode, activeAccountId, focusBusinessUnitId, selectedOpportunityId, aspect, isCompact });
    applyShot(c, shot, !reducedMotion && !floraDebug.settle, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeAccountId, focusBusinessUnitId, selectedOpportunityId, cameraNonce, aspect, isCompact, reducedMotion]);

  // Minimap jumps: glide to a point of the map, keeping the current heading.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || !flyTarget || intro.current) return;
    lastInput.current = performance.now();
    const target = new THREE.Vector3(flyTarget.x, terrainHeight(flyTarget.x, flyTarget.z) + 20, flyTarget.z);
    applyShot(
      c,
      { target, distance: 430, polar: 1.15, azimuth: c.azimuthAngle, minDistance: 30, maxDistance: 2600 },
      !reducedMotion && !floraDebug.settle,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget]);

  return <CameraControls ref={controlsRef} makeDefault />;
}

function applyShot(c: CameraControlsImpl, shot: Shot, animate: boolean, setLimits = false) {
  if (setLimits) {
    c.minDistance = shot.minDistance;
    c.maxDistance = shot.maxDistance;
  }
  const azimuth = shot.azimuth ?? c.azimuthAngle;
  const pos = new THREE.Vector3().setFromSphericalCoords(shot.distance, shot.polar, azimuth).add(shot.target);
  const ground = terrainHeight(pos.x, pos.z) + 6;
  if (pos.y < ground) pos.y = ground;
  void c.setLookAt(pos.x, pos.y, pos.z, shot.target.x, shot.target.y, shot.target.z, animate);
}

interface ShotInput {
  mode: "forest" | "account";
  activeAccountId: string | null;
  focusBusinessUnitId: string | null;
  selectedOpportunityId: string | null;
  aspect: number;
  isCompact: boolean;
}

function computeShot(input: ShotInput): Shot {
  const { aspect, isCompact } = input;
  if (input.mode === "forest" || !input.activeAccountId) return overviewShot(aspect);

  const model = getAccountTree(input.activeAccountId);
  const base = accountPosition(input.activeAccountId);
  if (!model) return overviewShot(aspect);
  const { shape } = model;
  const vHalf = THREE.MathUtils.degToRad(FOV / 2);
  const azimuth = accountApproachAzimuth(input.activeAccountId);

  const crownH = shape.crownTop;
  const fitH = (crownH * 0.6) / Math.tan(vHalf);
  const width = Math.max(shape.crownRadii.x, shape.crownRadii.z) * 2.2;
  // Desktop: a side panel takes ~420px on the right; frame into the remaining width.
  const usable = isCompact ? 1 : 0.68;
  const fitW = width / 2 / (Math.tan(vHalf) * aspect * usable);
  let distance = Math.max(fitH, fitW) * 1.04;
  const target = base.clone().add(new THREE.Vector3(0, crownH * 0.45, 0));
  if (isCompact) {
    // Bottom sheet covers the lower ~45%: lift the subject and step back.
    distance *= 1.25;
    target.y -= Math.tan(vHalf) * distance * 0.38;
  } else {
    const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
    target.addScaledVector(right, Math.tan(vHalf) * distance * aspect * 0.3);
  }
  const account: Shot = { target, distance, polar: 1.4, azimuth, minDistance: 14, maxDistance: distance * 2.6 };

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
      const az = THREE.MathUtils.lerp(Math.atan2(outward.x, outward.z), azimuth, 0.35);
      const d = isCompact ? 64 : 52;
      const t = base.clone().add(hang).add(new THREE.Vector3(0, -4, 0));
      offsetForPanel(t, d, az);
      return { ...account, target: t, distance: d, polar: 1.45, azimuth: az };
    }
  }

  if (input.focusBusinessUnitId) {
    const limbIndex = model.limbIds.indexOf(input.focusBusinessUnitId);
    const frame = model.shape.limbs[limbIndex];
    if (frame) {
      const az = Math.atan2(frame.outward.x, frame.outward.z) + 0.75;
      const d = Math.max(frame.length * 2.3, 40) * (isCompact ? 1.25 : 1);
      const t = base.clone().add(frame.centroid);
      offsetForPanel(t, d, az);
      return { ...account, target: t, distance: d, polar: 1.3, azimuth: az };
    }
  }

  return account;
}
