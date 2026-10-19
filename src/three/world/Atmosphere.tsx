"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { floraGlobals, updateSunView } from "../flora/floraMaterials";
import { SUN_DIR, WORLD_CENTER } from "../layout";
import { SkyDome } from "../sky/SkyDome";
import { SkyController } from "../sky/SkyController";
import { sky } from "../sky/skyState";

/**
 * Light and air. The SkyController moves the sun and moon on the seller's
 * clock and blends the weather; everything here follows it: one
 * shadow-casting light (the sun by day, the moon by night), sky fill, haze
 * and the image-based light.
 */

export const FOG_COLOR = new THREE.Color("#c3cdd2");

/** Advances global flora uniforms once per frame. */
function FloraClock() {
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  const base = useMemo(() => floraGlobals.uWind.value.clone(), []);
  useFrame(({ camera }, dt) => {
    floraGlobals.uTime.value += Math.min(dt, 0.1) * (reduced ? 0.2 : 1);
    // Storm wind bends harder, but the sway stays believable.
    const k = Math.min(2.2, sky.wind);
    floraGlobals.uWind.value.copy(base).multiplyScalar(k);
    floraGlobals.uSunColor.value.copy(sky.lightColor).multiplyScalar(Math.min(1, sky.lightIntensity / 3.1) * 0.95 + 0.05);
    updateSunView(sky.lightDir, camera);
  });
  return null;
}

/**
 * The shadow region travels with the view: it is centred on where the camera
 * looks (snapped to a grid so shadows don't shimmer as it moves).
 */
function KeyLight() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene, controls } = useThree();
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const toward = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const l = light.current;
    if (!l) return;
    const c = controls as unknown as { getTarget?: (v: THREE.Vector3) => THREE.Vector3 } | null;
    if (c?.getTarget) c.getTarget(focus);
    else focus.copy(WORLD_CENTER);
    // Keep the shadowed region between the camera and what it looks at.
    focus.lerp(toward.set(camera.position.x, focus.y, camera.position.z), 0.25);
    const snap = 16;
    focus.set(Math.round(focus.x / snap) * snap, Math.round(focus.y / snap) * snap, Math.round(focus.z / snap) * snap);
    l.target.position.copy(focus);
    l.position.copy(focus).addScaledVector(sky.lightDir, 600);
    l.target.updateMatrixWorld();
    l.color.copy(sky.lightColor);
    l.intensity = sky.lightIntensity;
    l.castShadow = sky.lightIntensity > 0.05;
  });
  const size = isTouch ? 2048 : 4096;
  const extent = isTouch ? 160 : 230;
  return (
    <directionalLight
      ref={light}
      intensity={3.0}
      castShadow
      shadow-mapSize-width={size}
      shadow-mapSize-height={size}
      shadow-camera-left={-extent}
      shadow-camera-right={extent}
      shadow-camera-top={extent}
      shadow-camera-bottom={-extent}
      shadow-camera-near={200}
      shadow-camera-far={1100}
      shadow-bias={-0.0004}
      shadow-normalBias={0.4}
    />
  );
}

/** Sky fill, a cool bounce from the open side, haze and the background. */
function Fill() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const bounce = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const h = hemi.current;
    if (h) {
      h.color.copy(sky.hemiSky);
      h.groundColor.copy(sky.hemiGround);
      h.intensity = sky.hemiIntensity;
    }
    const b = bounce.current;
    if (b) {
      b.color.copy(sky.hemiSky);
      b.intensity = 0.26 * sky.hemiIntensity;
    }
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.copy(sky.fog);
      fog.density = sky.fogDensity;
    }
    if (scene.background instanceof THREE.Color) scene.background.copy(sky.fog);
    scene.environmentIntensity = 0.42 * sky.envIntensity;
    SUN_DIR.copy(sky.lightDir);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#c8dcf2", "#857c58", 1.35]} />
      <directionalLight ref={bounce} position={[600, 300, 700]} intensity={0.35} color="#a9c0dc" />
    </>
  );
}

export function Atmosphere() {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.00029]} />
      <SkyController />
      <SkyDome />
      <FloraClock />
      <KeyLight />
      <Fill />
    </>
  );
}

/** HDRI contributes soft image-based fill and specular only; it is never the visible sky. */
export function ImageBasedLight() {
  return (
    <Environment
      files="assets/hdri/noon_grass_1k.hdr"
      background={false}
      environmentIntensity={0.42}
      resolution={256}
    />
  );
}
