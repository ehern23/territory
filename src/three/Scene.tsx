"use client";

import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Atmosphere, ImageBasedLight } from "./world/Atmosphere";
import { Precipitation } from "./sky/Precipitation";
import { ExploreController } from "./explore/ExploreController";
import { useBiomeStore } from "@/store/useBiomeStore";
import { Waterfall } from "./world/Waterfall";
import { Terrain } from "./world/Terrain";
import { GroundCover } from "./world/GroundCover";
import { Stream } from "./world/Stream";
import { Rocks } from "./world/Rocks";
import { WildForest } from "./world/WildForest";
import { Wildlife } from "./wildlife/Wildlife";
import { Effects } from "./world/Effects";
import { Forest } from "./Forest";
import { CameraDirector } from "./CameraDirector";
import { OptionalScenePart } from "./SceneBoundary";
import { PerfProbe } from "./perf/PerfProbe";
import { useUiStore } from "@/store/useUiStore";

/** QA aid: `?off=forest,cover,…` disables scene parts to isolate render cost. */
const OFF = new Set(
  typeof window === "undefined" ? [] : (new URLSearchParams(window.location.search).get("off") ?? "").split(","),
);

/**
 * Frame-rate governor: if the device can't hold its frame rate, step the
 * render resolution down, and as a last resort thin the ground cover. It only
 * ever steps down: changing resolution reallocates every render target, so
 * hunting up and down would itself cause the hitches it is meant to prevent.
 */
function Governor() {
  const setDpr = useThree((s) => s.setDpr);
  const viewportDpr = useThree((s) => s.viewport.dpr);
  const setLowPower = useTerritoryStore((s) => s.setLowPower);
  // Judge the device only once loading (shader compiles, impostor captures)
  // is over, or a slow first few seconds would cost resolution for good.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return (
    <PerformanceMonitor
      ms={500}
      iterations={6}
      onDecline={() => {
        const next = Math.max(1, Math.round((viewportDpr - 0.25) * 4) / 4);
        if (next < viewportDpr) setDpr(next);
        else setLowPower(true);
      }}
    />
  );
}

/**
 * Compile every shader the scene uses up front (in parallel where the driver
 * allows), so nothing stalls the first time it comes into view.
 */
function Precompile() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const biome = useBiomeStore((s) => s.biome);
  useEffect(() => {
    // Parts of the scene mount over the first second or two; sweep a few times.
    const ids = [400, 1500, 4000].map((ms) =>
      window.setTimeout(() => {
        void gl.compileAsync(scene, camera).catch(() => undefined);
      }, ms),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [gl, scene, camera, biome]);
  return null;
}

export function Scene() {
  const biome = useBiomeStore((s) => s.biome);
  const perf = useUiStore((s) => s.perf);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const setIsTouch = useTerritoryStore((s) => s.setIsTouch);
  const setReducedMotion = useTerritoryStore((s) => s.setReducedMotion);
  const setIsCompact = useTerritoryStore((s) => s.setIsCompact);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    // `?lite` renders with phone-level density (used for software-rendered QA).
    const lite = new URLSearchParams(window.location.search).has("lite");
    const apply = () => {
      setIsTouch(touch.matches || lite);
      setReducedMotion(motion.matches);
      setIsCompact(compact.matches);
    };
    apply();
    for (const m of [touch, motion, compact]) m.addEventListener("change", apply);
    return () => {
      for (const m of [touch, motion, compact]) m.removeEventListener("change", apply);
    };
  }, [setIsTouch, setReducedMotion, setIsCompact]);

  return (
    <Canvas
      className="territory-canvas"
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      camera={{ fov: 38, near: 1, far: 9000, position: [-120, 120, 460] }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, logarithmicDepthBuffer: false }}
      onCreated={(state) => {
        (window as unknown as { __r3f?: unknown }).__r3f = state.get;
      }}
      style={{ touchAction: "none" }}
    >
      <Governor />
      <Precompile />
      {perf && <PerfProbe />}
      <Atmosphere />
      <OptionalScenePart>
        <Suspense fallback={null}>
          <ImageBasedLight />
        </Suspense>
      </OptionalScenePart>
      <Suspense fallback={null}>
        {!OFF.has("terrain") && <Terrain />}
        {!OFF.has("stream") && <Stream />}
        {!OFF.has("stream") && <Waterfall />}
        {!OFF.has("cover") && <GroundCover />}
        {!OFF.has("rocks") && <Rocks />}
        {!OFF.has("forest") && <WildForest key={biome} />}
        {!OFF.has("accounts") && <Forest />}
        {!OFF.has("wildlife") && <Wildlife />}
        {!OFF.has("weather") && <Precipitation />}
        <CameraDirector />
        <ExploreController />
      </Suspense>
      {!OFF.has("fx") && <Effects />}
    </Canvas>
  );
}
