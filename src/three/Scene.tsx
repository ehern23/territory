"use client";

import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Atmosphere, ImageBasedLight } from "./world/Atmosphere";
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

/** QA aid: `?off=forest,cover,…` disables scene parts to isolate render cost. */
const OFF = new Set(
  typeof window === "undefined" ? [] : (new URLSearchParams(window.location.search).get("off") ?? "").split(","),
);

/**
 * Frame-rate governor: if the device can't hold its frame rate, step the
 * render resolution down, and as a last resort thin the ground cover.
 */
function Governor() {
  const setDpr = useThree((s) => s.setDpr);
  const viewportDpr = useThree((s) => s.viewport.dpr);
  const setLowPower = useTerritoryStore((s) => s.setLowPower);
  return (
    <PerformanceMonitor
      flipflops={4}
      onDecline={() => {
        const next = Math.max(1, Math.round((viewportDpr - 0.25) * 4) / 4);
        if (next < viewportDpr) setDpr(next);
        else setLowPower(true);
      }}
      onIncline={() => setDpr(Math.min(window.devicePixelRatio, viewportDpr + 0.25))}
    />
  );
}

export function Scene() {
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
      <Atmosphere />
      <OptionalScenePart>
        <Suspense fallback={null}>
          <ImageBasedLight />
        </Suspense>
      </OptionalScenePart>
      <Suspense fallback={null}>
        {!OFF.has("terrain") && <Terrain />}
        {!OFF.has("stream") && <Stream />}
        {!OFF.has("cover") && <GroundCover />}
        {!OFF.has("rocks") && <Rocks />}
        {!OFF.has("forest") && <WildForest />}
        {!OFF.has("accounts") && <Forest />}
        {!OFF.has("wildlife") && <Wildlife />}
        <CameraDirector />
      </Suspense>
      {!OFF.has("fx") && <Effects />}
    </Canvas>
  );
}
