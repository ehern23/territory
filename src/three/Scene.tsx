"use client";

import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Atmosphere, ImageBasedLight } from "./world/Atmosphere";
import { Grass, Terrain, Wildflowers } from "./world/Ground";
import { Horizon } from "./world/Horizon";
import { Backdrop } from "./world/Backdrop";
import { Effects } from "./world/Effects";
import { Forest } from "./Forest";
import { CameraDirector } from "./CameraDirector";

export function Scene() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const setIsTouch = useTerritoryStore((s) => s.setIsTouch);
  const setReducedMotion = useTerritoryStore((s) => s.setReducedMotion);
  const setIsCompact = useTerritoryStore((s) => s.setIsCompact);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setIsTouch(touch.matches);
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
      camera={{ fov: 38, near: 0.5, far: 4000, position: [-300, 260, 420] }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      onCreated={(state) => {
        (window as unknown as { __r3f?: unknown }).__r3f = state.get;
      }}
      style={{ touchAction: "none" }}
    >
      <Atmosphere />
      <Horizon />
      <Suspense fallback={null}>
        <ImageBasedLight />
      </Suspense>
      <Suspense fallback={null}>
        <Terrain />
        <Grass />
        <Wildflowers />
        <Backdrop />
        <Forest />
        <CameraDirector />
      </Suspense>
      <Effects />
    </Canvas>
  );
}
