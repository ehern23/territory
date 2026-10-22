"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type CameraControlsImpl from "camera-controls";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useExploreStore } from "@/store/useExploreStore";
import { accountApproachAzimuth, accountIds, accountPosition, terrainHeight } from "../layout";
import { getAccountTree } from "../flora/accountTrees";
import { trunksNear } from "../world/treeIndex";
import { cameraPose } from "../cameraPose";

/**
 * Explore mode: walk or fly through the territory like a game.
 *
 * W A S D (or the arrows) move, the mouse looks (click the scene to capture
 * the pointer; Esc releases it), Space jumps and jumps again in the air, a
 * quick double tap of Space takes off or lands, Shift sprints, and while
 * flying Space climbs and C descends. The walker follows the ground, goes
 * around trunks, and a soft boundary keeps everyone inside the valley rather
 * than inside the mountains. Aim at an account giant and click to open it.
 */

const EYE = 2.1;
const GRAVITY = 30;
const JUMP = 11;
const WALK = 12;
const RUN = 36;
const FLY = 60;
const FLY_FAST = 190;
const FOV_EXPLORE = 62;
const FOV_OVERVIEW = 38;
const LIMIT_RADIUS = 1550;
const LIMIT_CENTER = new THREE.Vector2(0, -80);
const CEILING = 1250;
const LOOK = 0.0024;

/** Lets UI outside the canvas leave explore mode with the camera in sync. */
export const exploreBridge: { leave: () => void } = { leave: () => useExploreStore.getState().exit() };

export function ExploreController() {
  const active = useExploreStore((s) => s.active);
  const nonce = useExploreStore((s) => s.nonce);
  const { camera, gl, controls } = useThree();
  const keys = useRef(new Set<string>());
  const p = useRef({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    grounded: false,
    jumps: 0,
    lastSpace: 0,
    bob: 0,
  });
  const tmp = useMemo(
    () => ({
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      want: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      ray: new THREE.Ray(),
      trunks: [] as { x: number; z: number; r: number }[],
    }),
    [],
  );

  // Hand the camera back to the orbit controls exactly where it is, so the
  // next glide (an account, the overview) starts from here.
  const syncControls = () => {
    const c = controls as unknown as CameraControlsImpl | null;
    if (!c) return;
    camera.getWorldDirection(tmp.fwd);
    const t = camera.position.clone().addScaledVector(tmp.fwd, 160);
    c.enabled = true;
    void c.setLookAt(camera.position.x, camera.position.y, camera.position.z, t.x, t.y, t.z, false);
  };

  useEffect(() => {
    exploreBridge.leave = () => {
      if (!useExploreStore.getState().active) return;
      syncControls();
      if (document.pointerLockElement) document.exitPointerLock();
      useExploreStore.getState().exit();
    };
  });

  // Leave explore mode the moment the territory moves to an account or a demo,
  // before the camera director plans its next shot.
  useEffect(
    () =>
      useTerritoryStore.subscribe((s, prev) => {
        if (!useExploreStore.getState().active) return;
        if ((s.mode !== prev.mode && s.mode === "account") || (s.demo.active && !prev.demo.active)) exploreBridge.leave();
      }),
    [],
  );

  // Seed the player on entry.
  useEffect(() => {
    if (!active) return;
    const c = controls as unknown as CameraControlsImpl | null;
    if (c) c.enabled = false;
    const st = p.current;
    const { start } = useExploreStore.getState();
    if (start === "ground") {
      // On foot at the edge of the flagship account's glade, facing the giant.
      const id = accountIds()[0];
      const base = id ? accountPosition(id) : new THREE.Vector3();
      const az = id ? accountApproachAzimuth(id) : 0;
      const x = base.x + Math.sin(az) * 92;
      const z = base.z + Math.cos(az) * 92;
      st.pos.set(x, terrainHeight(x, z), z);
      st.yaw = Math.atan2(-(base.x - x), -(base.z - z));
      st.pitch = 0.16;
      st.grounded = true;
      useExploreStore.getState().setFlying(false);
    } else {
      // Float from wherever the camera already is.
      st.pos.copy(camera.position).y -= EYE;
      camera.getWorldDirection(tmp.fwd);
      st.yaw = Math.atan2(-tmp.fwd.x, -tmp.fwd.z);
      st.pitch = Math.asin(THREE.MathUtils.clamp(tmp.fwd.y, -1, 1));
      st.grounded = false;
    }
    st.vel.set(0, 0, 0);
    st.jumps = 0;
  }, [active, nonce, camera, controls, tmp]);

  // Restore the overview lens when leaving.
  useEffect(() => {
    if (active) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== FOV_OVERVIEW) {
      cam.fov = FOV_OVERVIEW;
      cam.updateProjectionMatrix();
    }
  }, [active, camera]);

  // Keyboard: movement, jump / double jump / fly, and W A S D to start exploring.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      const ex = useExploreStore.getState();
      const t = useTerritoryStore.getState();
      if (!ex.active) {
        // Moving keys in the overview step into the world.
        if (["w", "a", "s", "d"].includes(k) && t.mode === "forest" && t.introDone && !t.demo.active && !t.isTouch) {
          ex.enter("here");
          keys.current.add(k);
        }
        return;
      }
      if (k === "escape" && !document.pointerLockElement) {
        exploreBridge.leave();
        return;
      }
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      if (k === " " && !e.repeat) {
        const st = p.current;
        const now = performance.now();
        if (now - st.lastSpace < 280) {
          // Double tap: take off, or land.
          ex.setFlying(!ex.flying);
          if (!ex.flying) st.vel.y = Math.max(st.vel.y, 4);
          st.lastSpace = 0;
        } else {
          st.lastSpace = now;
          if (!ex.flying) {
            if (st.grounded) {
              st.vel.y = JUMP;
              st.grounded = false;
              st.jumps = 1;
            } else if (st.jumps < 2) {
              st.vel.y = JUMP * 0.95;
              st.jumps = 2;
            }
          }
        }
      }
      if (k === "f" && !e.repeat) ex.setFlying(!ex.flying);
      keys.current.add(k);
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

  // Mouse: capture the pointer to look around; click a giant under the crosshair.
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    const onLock = () => useExploreStore.getState().setLocked(document.pointerLockElement === el);
    const onDown = (e: PointerEvent) => {
      const ex = useExploreStore.getState();
      if (!ex.active || e.button !== 0) return;
      if (document.pointerLockElement === el) {
        if (ex.aimAccountId) {
          const id = ex.aimAccountId;
          exploreBridge.leave();
          useTerritoryStore.getState().enterAccount(id);
        }
        return;
      }
      dragging = true;
      el.requestPointerLock?.()?.catch?.(() => undefined);
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!useExploreStore.getState().active) return;
      if (document.pointerLockElement !== el && !dragging) return;
      const st = p.current;
      st.yaw -= e.movementX * LOOK;
      st.pitch = THREE.MathUtils.clamp(st.pitch - e.movementY * LOOK, -1.45, 1.45);
    };
    document.addEventListener("pointerlockchange", onLock);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
    };
  }, [gl]);

  // Minimap jumps while exploring: fly over to the spot.
  useEffect(
    () =>
      useTerritoryStore.subscribe((s, prev) => {
        if (!useExploreStore.getState().active || !s.flyTarget || s.flyTarget === prev.flyTarget) return;
        const st = p.current;
        st.pos.set(s.flyTarget.x, terrainHeight(s.flyTarget.x, s.flyTarget.z) + 70, s.flyTarget.z);
        st.vel.set(0, 0, 0);
        useExploreStore.getState().setFlying(true);
      }),
    [],
  );

  useFrame((_, rawDt) => {
    if (!useExploreStore.getState().active) return;
    const dt = Math.min(rawDt, 0.05);
    const st = p.current;
    const ex = useExploreStore.getState();
    const k = keys.current;
    const flying = ex.flying;
    const sprint = k.has("shift");

    // Heading.
    tmp.euler.set(st.pitch, st.yaw, 0, "YXZ");
    tmp.fwd.set(0, 0, -1).applyEuler(tmp.euler);
    const flatFwd = new THREE.Vector3(tmp.fwd.x, 0, tmp.fwd.z).normalize();
    tmp.right.set(-flatFwd.z, 0, flatFwd.x);
    const f = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const r = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);

    if (flying) {
      const speed = sprint ? FLY_FAST : FLY;
      // In flight, forward follows the gaze: look down and dive.
      tmp.want.copy(tmp.fwd).multiplyScalar(f).addScaledVector(tmp.right, r);
      if (tmp.want.lengthSq() > 1) tmp.want.normalize();
      tmp.want.multiplyScalar(speed);
      tmp.want.y += ((k.has(" ") ? 1 : 0) - (k.has("c") || k.has("control") ? 1 : 0)) * speed * 0.7;
      st.vel.lerp(tmp.want, 1 - Math.exp(-dt * 8));
    } else {
      const speed = sprint ? RUN : WALK;
      tmp.want.copy(flatFwd).multiplyScalar(f).addScaledVector(tmp.right, r);
      if (tmp.want.lengthSq() > 1) tmp.want.normalize();
      tmp.want.multiplyScalar(speed);
      const accel = st.grounded ? 10 : 2.5;
      const blend = 1 - Math.exp(-dt * accel);
      st.vel.x += (tmp.want.x - st.vel.x) * blend;
      st.vel.z += (tmp.want.z - st.vel.z) * blend;
      st.vel.y -= GRAVITY * dt;
    }

    st.pos.addScaledVector(st.vel, dt);

    // Go around trunks (wild forest and account giants).
    if (st.pos.y - terrainHeight(st.pos.x, st.pos.z) < 60) {
      for (const t of trunksNear(st.pos.x, st.pos.z, 1.2, tmp.trunks)) pushOut(st.pos, t.x, t.z, t.r + 0.8);
      for (const id of accountIds()) {
        const tree = getAccountTree(id);
        if (!tree) continue;
        const a = accountPosition(id);
        pushOut(st.pos, a.x, a.z, tree.shape.trunkRadius * 1.35 + 1.2);
      }
    }

    // Stay in the valley: a soft wall before the outer ranges, and a ceiling.
    const dx = st.pos.x - LIMIT_CENTER.x;
    const dz = st.pos.z - LIMIT_CENTER.y;
    const dist = Math.hypot(dx, dz);
    if (dist > LIMIT_RADIUS) {
      st.pos.x = LIMIT_CENTER.x + (dx / dist) * LIMIT_RADIUS;
      st.pos.z = LIMIT_CENTER.y + (dz / dist) * LIMIT_RADIUS;
    }
    if (st.pos.y > CEILING) {
      st.pos.y = CEILING;
      st.vel.y = Math.min(0, st.vel.y);
    }

    // Ground.
    const ground = terrainHeight(st.pos.x, st.pos.z);
    if (st.pos.y <= ground) {
      st.pos.y = ground;
      if (st.vel.y < 0) st.vel.y = 0;
      st.grounded = true;
      st.jumps = 0;
      // Flying into the ground lands.
      if (flying && f === 0 && !k.has(" ")) ex.setFlying(false);
    } else if (!flying) {
      // Walk down slopes instead of skipping off them.
      st.grounded = st.pos.y - ground < 0.35 && st.vel.y <= 0;
      if (st.grounded) st.pos.y = ground;
    } else {
      st.grounded = false;
    }

    // Camera: eyes above the feet, a gentle bob while walking.
    const moving = Math.hypot(st.vel.x, st.vel.z);
    st.bob += dt * moving * 0.9;
    const bob = st.grounded && !flying ? Math.sin(st.bob) * Math.min(0.08, moving * 0.006) : 0;
    camera.position.set(st.pos.x, st.pos.y + EYE + bob, st.pos.z);
    camera.quaternion.setFromEuler(tmp.euler);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = FOV_EXPLORE + (sprint && moving > WALK ? 6 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 6));
      cam.updateProjectionMatrix();
    }

    cameraPose.x = camera.position.x;
    cameraPose.z = camera.position.z;
    cameraPose.yaw = Math.atan2(tmp.fwd.x, tmp.fwd.z);
    cameraPose.targetX = camera.position.x + flatFwd.x * 60;
    cameraPose.targetZ = camera.position.z + flatFwd.z * 60;

    // What the crosshair is on: the nearest account giant along the gaze.
    tmp.ray.set(camera.position, tmp.fwd);
    let best: string | null = null;
    let bestT = Infinity;
    for (const id of accountIds()) {
      const tree = getAccountTree(id);
      if (!tree) continue;
      const a = accountPosition(id);
      const c = tree.shape.crownCenter;
      const centre = new THREE.Vector3(a.x + c.x, a.y + c.y, a.z + c.z);
      const t = tmp.ray.closestPointToPoint(centre, new THREE.Vector3()).distanceTo(camera.position);
      const miss = tmp.ray.distanceToPoint(centre);
      const reach = Math.max(tree.shape.crownRadii.x, tree.shape.crownRadii.z) * 0.9;
      // Also the trunk below the crown.
      const trunkTop = new THREE.Vector3(a.x, a.y + c.y, a.z);
      const trunkMiss = tmp.ray.distanceSqToSegment(new THREE.Vector3(a.x, a.y, a.z), trunkTop);
      const hit = miss < reach || Math.sqrt(trunkMiss) < tree.shape.trunkRadius * 1.6;
      if (hit && t < 1400 && t < bestT) {
        bestT = t;
        best = id;
      }
    }
    ex.setAim(best);
  });

  return null;
}

function pushOut(pos: THREE.Vector3, x: number, z: number, r: number) {
  const dx = pos.x - x;
  const dz = pos.z - z;
  const d = Math.hypot(dx, dz);
  if (d >= r || d < 1e-4) return;
  pos.x = x + (dx / d) * r;
  pos.z = z + (dz / d) * r;
}
